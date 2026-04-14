import {
  newMexicoConfig
} from "./chunk-H2RPEXXM.mjs";
import {
  oklahomaConfig
} from "./chunk-HWSW4H4Y.mjs";
import {
  alabamaConfig
} from "./chunk-BKZWUYMV.mjs";
import {
  __name,
  init_esm
} from "./chunk-6ULOIQV4.mjs";

// src/trigger/enrichment/configs/index.ts
init_esm();
var configs = {
  OK: oklahomaConfig,
  NM: newMexicoConfig,
  AL: alabamaConfig
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
//# sourceMappingURL=chunk-4Z5OKQ4Q.mjs.map
