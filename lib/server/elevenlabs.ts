import "server-only";

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { getElevenLabsConfig } from "./env";
import { normalizeTranscriptionResponse } from "./provider-normalization";

export async function transcribeAudio(input: {
  data: Uint8Array;
  filename: string;
  contentType: string;
  signal?: AbortSignal;
}) {
  const config = getElevenLabsConfig();
  if (input.data.byteLength === 0 || input.data.byteLength > config.maxAudioBytes) {
    throw new Error("Audio file is outside the allowed size");
  }
  const client = new ElevenLabsClient({ apiKey: config.apiKey, maxRetries: 0, timeoutInSeconds: 30 });
  const response = await client.speechToText.convert({
    file: {
      data: Buffer.from(input.data),
      filename: input.filename || "recording",
      contentType: input.contentType,
      contentLength: input.data.byteLength,
    },
    modelId: config.modelId,
    tagAudioEvents: false,
    diarize: false,
  }, { maxRetries: 0, timeoutInSeconds: 30, abortSignal: input.signal });
  return normalizeTranscriptionResponse(response);
}
