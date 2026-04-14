import {
  defineConfig
} from "../../../../chunk-MMQGKQDQ.mjs";
import "../../../../chunk-U3REXNIV.mjs";
import {
  init_esm
} from "../../../../chunk-6ULOIQV4.mjs";

// trigger.config.ts
init_esm();
var trigger_config_default = defineConfig({
  project: "proj_xoqvbnyzjssttovvnypn",
  dirs: ["./src/trigger"],
  runtime: "node",
  maxDuration: 28800,
  // 8 hours max (enrichment tasks can take 6-7 hours)
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1e3,
      maxTimeoutInMs: 3e4,
      factor: 2,
      randomize: true
    }
  },
  build: {}
});
var resolveEnvVars = void 0;
export {
  trigger_config_default as default,
  resolveEnvVars
};
//# sourceMappingURL=trigger.config.mjs.map
