import "server-only";

const DEFAULT_GEMMA_MODEL = "google/gemma-3-27b-it";
const DEFAULT_STT_MODEL = "scribe_v2";

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) throw new Error(`${name} is not configured`);
  return value;
}

function boundedInteger(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} is invalid`);
  return parsed;
}

export function getBackboardConfig() {
  return {
    apiKey: required("BACKBOARD_API_KEY"),
    provider: process.env.BACKBOARD_LLM_PROVIDER?.trim() || process.env.GEMMA_PROVIDER?.trim() || "openrouter",
    model: process.env.BACKBOARD_MODEL_NAME?.trim() || process.env.GEMMA_MODEL?.trim() || DEFAULT_GEMMA_MODEL,
  };
}

export function getElevenLabsConfig() {
  return {
    apiKey: required("ELEVENLABS_API_KEY"),
    modelId: process.env.ELEVENLABS_STT_MODEL_ID?.trim() || DEFAULT_STT_MODEL,
    maxAudioBytes: boundedInteger("NIKAL_MAX_AUDIO_BYTES", 8 * 1024 * 1024),
  };
}
