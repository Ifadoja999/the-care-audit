import {
  logger,
  retry
} from "./chunk-QXSSDGE5.mjs";
import {
  __name,
  init_esm
} from "./chunk-23OQHB7B.mjs";

// src/trigger/enrichment/lib/vision-extractor.ts
init_esm();
var MAX_IMAGES_PER_REQUEST = 10;
async function extractTextFromImages(imageBuffers) {
  if (imageBuffers.length === 0) {
    throw new Error("No images provided for text extraction");
  }
  const batches = [];
  for (let i = 0; i < imageBuffers.length; i += MAX_IMAGES_PER_REQUEST) {
    batches.push(imageBuffers.slice(i, i + MAX_IMAGES_PER_REQUEST));
  }
  logger.info(
    `Extracting text from ${imageBuffers.length} pages in ${batches.length} batch(es)`
  );
  const extractedParts = [];
  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    const text = await retry.onThrow(
      async () => {
        const imageContent = batch.map((buffer) => ({
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: buffer.toString("base64")
          }
        }));
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": process.env.CLAUDE_API_KEY,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 8e3,
            messages: [
              {
                role: "user",
                content: [
                  ...imageContent,
                  {
                    type: "text",
                    text: `Extract ALL text from these scanned inspection report pages. Preserve the structure and formatting as much as possible. Include all deficiency descriptions, dates, facility information, allegations, investigation findings, plans of correction, and any Statement of Deficiencies content. Return the extracted text only, no commentary.`
                  }
                ]
              }
            ]
          })
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Claude Vision API error: ${response.status} — ${errorText}`
          );
        }
        const data = await response.json();
        return data.content.filter((block) => block.type === "text").map((block) => block.text).join("\n");
      },
      { maxAttempts: 3 }
    );
    extractedParts.push(text);
    if (batchIdx < batches.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1e3));
    }
  }
  const fullText = extractedParts.join("\n\n--- PAGE BREAK ---\n\n");
  logger.info(
    `Extracted ${fullText.length} characters from ${imageBuffers.length} pages`
  );
  return fullText;
}
__name(extractTextFromImages, "extractTextFromImages");

export {
  extractTextFromImages
};
//# sourceMappingURL=chunk-HIBSMY6H.mjs.map
