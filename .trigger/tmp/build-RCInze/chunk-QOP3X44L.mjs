import {
  extractTextFromSingleImage
} from "./chunk-UTO7WHP6.mjs";
import {
  logger
} from "./chunk-MMQGKQDQ.mjs";
import {
  __name,
  init_esm
} from "./chunk-6ULOIQV4.mjs";

// src/trigger/enrichment/lib/pdf-extractor.ts
init_esm();
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
var TEMP_DIR = "/tmp/tca-enrichment";
function computeTargetPages(totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = /* @__PURE__ */ new Set([1, 2, 3, totalPages - 1, totalPages]);
  return [...pages].sort((a, b) => a - b);
}
__name(computeTargetPages, "computeTargetPages");
function computePageRanges(pages) {
  if (pages.length === 0) return [];
  const ranges = [];
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
__name(computePageRanges, "computePageRanges");
function getPageCount(pdfPath) {
  const output = execSync(`pdfinfo "${pdfPath}"`, { encoding: "utf-8" });
  const match = output.match(/Pages:\s+(\d+)/);
  if (!match) {
    throw new Error(`Could not determine page count from pdfinfo for ${pdfPath}`);
  }
  return parseInt(match[1], 10);
}
__name(getPageCount, "getPageCount");
function isGarbageText(text) {
  const printable = text.replace(/[\x00-\x1f\x7f-\x9f]/g, "");
  if (printable.length === 0) return true;
  const alphanumeric = printable.replace(/[^a-zA-Z0-9\s]/g, "");
  return alphanumeric.length / printable.length < 0.3;
}
__name(isGarbageText, "isGarbageText");
function cleanupTempFiles() {
  try {
    if (fs.existsSync(TEMP_DIR)) {
      const files = fs.readdirSync(TEMP_DIR);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(TEMP_DIR, file));
        } catch {
        }
      }
    }
  } catch {
  }
}
__name(cleanupTempFiles, "cleanupTempFiles");
async function downloadPdf(url, destPath) {
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
  const nodeStream = Readable.fromWeb(response.body);
  const fileStream = fs.createWriteStream(destPath);
  await pipeline(nodeStream, fileStream);
}
__name(downloadPdf, "downloadPdf");
async function extractPdfContent(pdfPath, options = {}) {
  const { pageStrategy = "first3last2" } = options;
  const totalPages = getPageCount(pdfPath);
  let targetPages;
  if (pageStrategy === "custom" && options.customPages) {
    targetPages = options.customPages.filter(
      (p) => p >= 1 && p <= totalPages
    );
  } else {
    targetPages = computeTargetPages(totalPages);
  }
  logger.info(
    `Extracting pages [${targetPages.join(",")}] of ${totalPages} total`
  );
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  try {
    const textParts2 = [];
    const ranges = computePageRanges(targetPages);
    for (const [first, last] of ranges) {
      const output = execSync(
        `pdftotext -f ${first} -l ${last} "${pdfPath}" -`,
        { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
      );
      textParts2.push(output);
    }
    const fullText = textParts2.join("\n\n--- PAGE BREAK ---\n\n").trim();
    if (fullText.length > 100 && !isGarbageText(fullText)) {
      logger.info(
        `Text extraction successful: ${fullText.length} chars from ${targetPages.length} pages`
      );
      return {
        text: fullText,
        method: "text",
        pageCount: totalPages,
        pagesExtracted: targetPages
      };
    }
    logger.info(
      `Text extraction produced insufficient content (${fullText.length} chars) — falling back to Vision OCR`
    );
  } catch (err) {
    logger.info(
      `pdftotext failed (${err.message}) — falling back to Vision OCR`
    );
  }
  logger.info("Running Vision OCR extraction (per-page mode)");
  const textParts = [];
  let pagesExtractedCount = 0;
  try {
    for (const pageNum of targetPages) {
      const pagePrefix = path.join(
        TEMP_DIR,
        `page-${Date.now()}-p${pageNum}`
      );
      execSync(
        `pdftoppm -f ${pageNum} -l ${pageNum} -singlefile -jpeg -r 150 "${pdfPath}" "${pagePrefix}"`,
        { maxBuffer: 1024 * 1024 }
        // 1MB — pdftoppm writes to files, not stdout
      );
      const jpegPath = `${pagePrefix}.jpg`;
      if (!fs.existsSync(jpegPath)) {
        logger.warn(`No image produced for page ${pageNum} — skipping`);
        continue;
      }
      let imgBuffer = fs.readFileSync(jpegPath);
      fs.unlinkSync(jpegPath);
      const imgSizeKB = (imgBuffer.length / 1024).toFixed(0);
      const base64Data = imgBuffer.toString("base64");
      imgBuffer = null;
      const pageText = await extractTextFromSingleImage(base64Data);
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
      pagesExtracted: targetPages
    };
  } finally {
    cleanupTempFiles();
  }
}
__name(extractPdfContent, "extractPdfContent");

export {
  computeTargetPages,
  cleanupTempFiles,
  downloadPdf,
  extractPdfContent
};
//# sourceMappingURL=chunk-QOP3X44L.mjs.map
