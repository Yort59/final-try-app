import { BotConfig, BotRuntimeState, DEFAULT_CONFIG, makeInitialRuntime, PersistedState } from "./types";

const STORAGE_KEY = "ALPHABOT_STATE_V1";

export function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        config: DEFAULT_CONFIG,
        runtime: makeInitialRuntime(DEFAULT_CONFIG.startingBalance),
      };
    }
    const parsed = JSON.parse(raw);
    return {
      config: { ...DEFAULT_CONFIG, ...(parsed.config || {}) },
      runtime: { ...makeInitialRuntime(parsed.config?.startingBalance || 10.00), ...(parsed.runtime || {}) },
    };
  } catch (e) {
    console.error("Failed to load persisted state:", e);
    return {
      config: DEFAULT_CONFIG,
      runtime: makeInitialRuntime(DEFAULT_CONFIG.startingBalance),
    };
  }
}

export function saveState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save persisted state:", e);
  }
}

export function resetRuntime(config: BotConfig = DEFAULT_CONFIG): BotRuntimeState {
  return makeInitialRuntime(config.startingBalance);
}

// Keep aliases just in case other files import these names
export const loadPersistedState = loadState;
export const savePersistedState = saveState;