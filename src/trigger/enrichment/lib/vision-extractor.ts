import { logger, retry } from "@trigger.dev/sdk";

const OCR_PROMPT =
  "Extract ALL text from this scanned inspection report page. Preserve the structure and formatting as much as possible. Include all deficiency descriptions, dates, facility information, allegations, investigation findings, plans of correction, and any Statement of Deficiencies content. Return the extracted text only, no commentary.";

const BATCH_OCR_PROMPT =
  "Extract ALL text from these scanned inspection report pages. Preserve the structure and formatting as much as possible. Include all deficiency descriptions, dates, facility information, allegations, investigation findings, plans of correction, and any Statement of Deficiencies content. Return the extracted text only, no commentary.";

const MAX_IMAGES_PER_REQUEST = 10;

/**
 * Extract text from a SINGLE scanned page image using Claude Vision.
 * Accepts a base64-encoded JPEG string. Sends ONE image per API call
 * to minimize peak memory — only one page's base64 data is in memory at a time.
 *
 * Used by the PDF extraction path (NM and future states) where pages are
 * processed one at a time to prevent OOM on large scanned PDFs.
 */
export async function extractTextFromSingleImage(
  base64Data: string
): Promise<string> {
  const text = await retry.onThrow(
    async () => {
      // 2-minute timeout per single page
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2 * 60 * 1000);

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.CLAUDE_API_KEY!,
          "anthropic-version": "2023-06-01",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: base64Data,
                  },
                },
                {
                  type: "text",
                  text: OCR_PROMPT,
                },
              ],
            },
          ],
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Claude Vision API error: ${response.status} — ${errorText}`
        );
      }

      const data = await response.json();
      return data.content
        .filter((block: any) => block.type === "text")
        .map((block: any) => block.text)
        .join("\n");
    },
    { maxAttempts: 3 }
  );

  return text;
}

/**
 * Extract text from multiple scanned page images using Claude Vision.
 * Sends images in batches of MAX_IMAGES_PER_REQUEST.
 *
 * Used by the Playwright/AppXtender path (Oklahoma) where page images are
 * already in memory as Buffers from network interception.
 *
 * For the PDF path, prefer extractTextFromSingleImage() called per-page
 * to avoid holding all image buffers simultaneously.
 */
export async function extractTextFromImages(
  imageBuffers: Buffer[]
): Promise<string> {
  if (imageBuffers.length === 0) {
    throw new Error("No images provided for text extraction");
  }

  // Split into batches of MAX_IMAGES_PER_REQUEST
  const batches: Buffer[][] = [];
  for (let i = 0; i < imageBuffers.length; i += MAX_IMAGES_PER_REQUEST) {
    batches.push(imageBuffers.slice(i, i + MAX_IMAGES_PER_REQUEST));
  }

  logger.info(
    `Extracting text from ${imageBuffers.length} pages in ${batches.length} batch(es)`
  );

  const extractedParts: string[] = [];

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];

    const text = await retry.onThrow(
      async () => {
        const imageContent = batch.map((buffer) => ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: "image/jpeg" as const,
            data: buffer.toString("base64"),
          },
        }));

        // 5-minute timeout per batch — large batches (10 images) need time for Vision processing
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.CLAUDE_API_KEY!,
            "anthropic-version": "2023-06-01",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 8000,
            messages: [
              {
                role: "user",
                content: [
                  ...imageContent,
                  {
                    type: "text",
                    text: BATCH_OCR_PROMPT,
                  },
                ],
              },
            ],
          }),
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Claude Vision API error: ${response.status} — ${errorText}`
          );
        }

        const data = await response.json();
        return data.content
          .filter((block: any) => block.type === "text")
          .map((block: any) => block.text)
          .join("\n");
      },
      { maxAttempts: 3 }
    );

    extractedParts.push(text);

    // Small delay between batches to respect rate limits
    if (batchIdx < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  const fullText = extractedParts.join("\n\n--- PAGE BREAK ---\n\n");

  logger.info(
    `Extracted ${fullText.length} characters from ${imageBuffers.length} pages`
  );

  return fullText;
}
