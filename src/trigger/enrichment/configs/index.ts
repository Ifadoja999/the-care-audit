import { oklahomaConfig } from "./oklahoma";
import { newMexicoConfig } from "./new-mexico";
import { alabamaConfig } from "./alabama";
import { StateEnrichmentConfig } from "../types";

const configs: Record<string, StateEnrichmentConfig> = {
  OK: oklahomaConfig,
  NM: newMexicoConfig,
  AL: alabamaConfig,
};

export function getConfig(stateCode: string): StateEnrichmentConfig {
  const config = configs[stateCode];
  if (!config) {
    throw new Error(`No enrichment config for state: ${stateCode}`);
  }
  return config;
}
