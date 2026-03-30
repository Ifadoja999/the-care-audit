import {
  defineConfig
} from "../../../chunk-QXSSDGE5.mjs";
import "../../../chunk-HPZM6FUT.mjs";
import {
  init_esm
} from "../../../chunk-23OQHB7B.mjs";

// trigger.config.ts
init_esm();
var trigger_config_default = defineConfig({
  project: "proj_xoqvbnyzjssttovvnypn",
  dirs: ["./src/trigger"],
  runtime: "node",
  maxDuration: 21600,
  // 6 hours max (Florida pipeline can take 4-5 hours)
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
