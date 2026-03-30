import {
  oklahomaConfig
} from "./chunk-O5WRJBH5.mjs";
import {
  __name,
  init_esm
} from "./chunk-23OQHB7B.mjs";

// src/trigger/enrichment/configs/index.ts
init_esm();
var configs = {
  OK: oklahomaConfig
};
function getConfig(stateCode) {
  const config = configs[stateCode];
  if (!config) {
    throw new Error(`No enrichment config for state: ${stateCode}`);
  }
  return config;
}
__name(getConfig, "getConfig");

export {
  getConfig
};
//# sourceMappingURL=chunk-QUUWQKZD.mjs.map
