/**
 * Quick script to trigger the enrich-state task for testing.
 * Usage: TRIGGER_SECRET_KEY=tr_prod_xxx npx tsx scripts/test-enrichment.ts
 *
 * Get your secret key from: https://cloud.trigger.dev/projects/v3/proj_xoqvbnyzjssttovvnypn/apikeys
 */
import { configure, tasks } from "@trigger.dev/sdk";

const secretKey = process.env.TRIGGER_SECRET_KEY;
if (!secretKey) {
  console.error("❌ TRIGGER_SECRET_KEY is required.");
  console.error("   Get it from: https://cloud.trigger.dev/projects/v3/proj_xoqvbnyzjssttovvnypn/apikeys");
  console.error("   Usage: TRIGGER_SECRET_KEY=tr_prod_xxx npx tsx scripts/test-enrichment.ts");
  process.exit(1);
}

configure({
  secretKey,
});

async function main() {
  const handle = await tasks.trigger("enrich-state", {
    stateCode: "OK",
    testMode: true,
    testLimit: 5,
  });

  console.log(`\n✅ Task triggered successfully!`);
  console.log(`   Run ID: ${handle.id}`);
  console.log(`\n   Monitor at: https://cloud.trigger.dev/projects/v3/proj_xoqvbnyzjssttovvnypn/runs/${handle.id}`);
  console.log(`\n   The task will process 5 Oklahoma facilities through the full enrichment pipeline.`);
  console.log(`   Expected duration: ~25-30 minutes (5 facilities × ~5 min each)`);
}

main().catch((err) => {
  console.error("Failed to trigger task:", err.message);
  process.exit(1);
});
