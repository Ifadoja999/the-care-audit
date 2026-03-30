import { logger } from "@trigger.dev/sdk";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { extractTextFromSingleImage } from "./vision-extractor";

const TEMP_DIR = "/tmp/tca-enrichment";

export interface PdfExtractionResult {
  text: string;
  method: "text" | "vision";
  pageCount: number;
  pagesExtracted: number[];
}

/**
 * Compute "first 3 + last 2" target pages from a total page count.
 * - Documents ≤5 pages: all pages
 * - Documents >5 pages: [1, 2, 3, N-1, N]
 * Returns a sorted, deduplicated array of 1-indexed page numbers.
 */
export function computeTargetPages(totalPages: number): number[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set([1, 2, 3, totalPages - 1, totalPages]);
  return [...pages].sort((a, b) => a - b);
}

/**
 * Group consecutive page numbers into ranges for efficient pdftotext/pdftoppm calls.
 * e.g., [1,2,3,19,20] → [[1,3], [19,20]]
 */
function computePageRanges(pages: number[]): [number, number][] {
  if (pages.length === 0) return [];

  const ranges: [number, number][] = [];
  let start = pages[0];
  let end = pages[0];

  for (let i = 1; i < pages.length; i++) {
    if (pages[i] === end + 1) {
      end = pages[i];
    } else {
      ranges.push([start, end]);
      start = pages[i];
      end = pages[i];
    }
  }
  ranges.push([start, end]);

  return ranges;
}

/**
 * Get the total page count from a PDF on disk using pdfinfo.
 * Only reads file metadata — does NOT load page content.
 */
function getPageCount(pdfPath: string): number {
  const output = execSync(`pdfinfo "${pdfPath}"`, { encoding: "utf-8" });
  const match = output.match(/Pages:\s+(\d+)/);
  if (!match) {
    throw new Error(`Could not determine page count from pdfinfo for ${pdfPath}`);
  }
  return parseInt(match[1], 10);
}

/**
 * Check if extracted text is garbage (mostly non-alphanumeric characters).
 * Returns true if the text is likely from a scanned/image PDF where
 * pdftotext extracted random characters instead of real content.
 */
function isGarbageText(text: string): boolean {
  const printable = text.replace(/[\x00-\x1f\x7f-\x9f]/g, "");
  if (printable.length === 0) return true;
  const alphanumeric = printable.replace(/[^a-zA-Z0-9\s]/g, "");
  return alphanumeric.length / printable.length < 0.3;
}

/**
 * Clean up all temporary files in the enrichment temp directory.
 * Called after each facility to prevent accumulation.
 */
export function cleanupTempFiles(): void {
  try {
    if (fs.existsSync(TEMP_DIR)) {
      const files = fs.readdirSync(TEMP_DIR);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(TEMP_DIR, file));
        } catch {
          /* ignore individual file cleanup errors */
        }
      }
    }
  } catch {
    /* ignore directory-level errors */
  }
}

/**
 * Download a PDF to disk via streaming. NEVER loads the full PDF into a
 * Node.js Buffer — the response body is piped directly to a file on disk.
 * This is critical for large scanned PDFs (166MB+).
 */
export async function downloadPdf(
  url: string,
  destPath: string
): Promise<void> {
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `PDF download failed: ${response.status} ${response.statusText} for ${url}`
    );
  }
  if (!response.body) {
    throw new Error(`No response body for PDF download: ${url}`);
  }

  const nodeStream = Readable.fromWeb(response.body as any);
  const fileStream = fs.createWriteStream(destPath);
  await pipeline(nodeStream, fileStream);
}

/**
 * Hybrid PDF content extraction: tries text extraction first (pdftotext),
 * falls back to Vision OCR (pdftoppm → Claude Vision) for scanned PDFs.
 *
 * CRITICAL: Enforces "first 3 + last 2" page strategy. Maximum 5 pages
 * per document. Every pdftotext and pdftoppm call uses -f and -l flags.
 * The PDF file stays on disk — it is NEVER loaded into a Node.js Buffer.
 *
 * @param pdfPath - Absolute path to PDF file on disk (NOT a Buffer)
 * @param options - Extraction options (pageStrategy defaults to 'first3last2')
 */
export async function extractPdfContent(
  pdfPath: string,
  options: {
    pageStrategy?: "first3last2" | "custom";
    customPages?: number[];
  } = {}
): Promise<PdfExtractionResult> {
  const { pageStrategy = "first3last2" } = options;

  // Step 1: Get total page count from metadata (does NOT read page content)
  const totalPages = getPageCount(pdfPath);

  // Step 2: Calculate target pages based on strategy
  let targetPages: number[];
  if (pageStrategy === "custom" && options.customPages) {
    targetPages = options.customPages.filter(
      (p) => p >= 1 && p <= totalPages
    );
  } else {
    // Default: "first 3 + last 2" — maximum 5 pages
    targetPages = computeTargetPages(totalPages);
  }

  logger.info(
    `Extracting pages [${targetPages.join(",")}] of ${totalPages} total`
  );

  // Step 3: Ensure temp directory exists
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  // Step 4: Try text extraction first (fast path for text-extractable PDFs)
  try {
    const textParts: string[] = [];
    const ranges = computePageRanges(targetPages);

    for (const [first, last] of ranges) {
      // CRITICAL: Always include -f and -l page range flags
      const output = execSync(
        `pdftotext -f ${first} -l ${last} "${pdfPath}" -`,
        { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
      );
      textParts.push(output);
    }

    const fullText = textParts.join("\n\n--- PAGE BREAK ---\n\n").trim();

    // Check if text extraction produced meaningful content
    if (fullText.length > 100 && !isGarbageText(fullText)) {
      logger.info(
        `Text extraction successful: ${fullText.length} chars from ${targetPages.length} pages`
      );
      return {
        text: fullText,
        method: "text",
        pageCount: totalPages,
        pagesExtracted: targetPages,
      };
    }

    logger.info(
      `Text extraction produced insufficient content (${fullText.length} chars) — falling back to Vision OCR`
    );
  } catch (err: any) {
    logger.info(
      `pdftotext failed (${err.message}) — falling back to Vision OCR`
    );
  }

  // Step 5: Vision OCR fallback — process ONE PAGE AT A TIME to minimize peak memory.
  //
  // OOM root cause (NM enrichment, March 2026): The old code rendered all pages
  // at once, read all JPEGs into a Buffer[], converted all to base64, and sent
  // them in a single Vision API call. For scanned PDFs, pdftoppm must decode
  // embedded images at full source resolution (often 300-600 DPI = 5100×6600 px
  // = 135MB uncompressed per page) before downscaling. Combined with Node.js
  // holding multiple image Buffers + base64 strings + JSON payload simultaneously,
  // the total memory exceeded the container limit.
  //
  // Fix: render, read, OCR, and clean up ONE page before touching the next.
  // Peak memory is now capped at one page's worth of data regardless of PDF size.
  logger.info("Running Vision OCR extraction (per-page mode)");

  const textParts: string[] = [];
  let pagesExtractedCount = 0;

  try {
    for (const pageNum of targetPages) {
      const pagePrefix = path.join(
        TEMP_DIR,
        `page-${Date.now()}-p${pageNum}`
      );

      // Render SINGLE page to JPEG at 150 DPI (sufficient for OCR, lower memory
      // than 200 DPI). The -singlefile flag outputs prefix.jpg without page suffix.
      execSync(
        `pdftoppm -f ${pageNum} -l ${pageNum} -singlefile -jpeg -r 150 "${pdfPath}" "${pagePrefix}"`,
        { maxBuffer: 1024 * 1024 } // 1MB — pdftoppm writes to files, not stdout
      );

      const jpegPath = `${pagePrefix}.jpg`;

      if (!fs.existsSync(jpegPath)) {
        logger.warn(`No image produced for page ${pageNum} — skipping`);
        continue;
      }

      // Read JPEG into buffer, delete file immediately
      let imgBuffer: Buffer | null = fs.readFileSync(jpegPath);
      fs.unlinkSync(jpegPath);

      const imgSizeKB = (imgBuffer.length / 1024).toFixed(0);

      // Convert to base64, then release original buffer
      const base64Data = imgBuffer.toString("base64");
      imgBuffer = null; // Allow GC to reclaim the Buffer

      // Send SINGLE image to Claude Vision OCR
      const pageText = await extractTextFromSingleImage(base64Data);
      // base64Data goes out of scope on next iteration, eligible for GC

      if (pageText && pageText.length > 0) {
        textParts.push(pageText);
        pagesExtractedCount++;
      }

      logger.info(
        `Page ${pageNum}: ${pageText.length} chars extracted (${imgSizeKB}KB JPEG)`
      );
    }

    if (textParts.length === 0) {
      throw new Error(
        "Vision OCR produced no text from any page — PDF may be corrupt or password-protected"
      );
    }

    logger.info(
      `Vision OCR complete: ${pagesExtractedCount} pages, ${textParts.reduce((a, b) => a + b.length, 0)} total chars`
    );

    return {
      text: textParts.join("\n\n--- PAGE BREAK ---\n\n"),
      method: "vision",
      pageCount: totalPages,
      pagesExtracted: targetPages,
    };
  } finally {
    // Clean up any remaining temp files from this extraction
    cleanupTempFiles();
  }
}
