import "server-only";

import { getElevenLabsConfig } from "@/lib/server/env";
import { transcribeAudio } from "@/lib/server/elevenlabs";


const ALLOWED_TYPES = new Set(["audio/webm", "audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp4", "audio/ogg"]);

function errorResponse(status: number, code: string, message: string, retryable: boolean) {
  return Response.json(
    { schemaVersion: 1, status: "error", error: { code, message, retryable }, diagnosticId: crypto.randomUUID() },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function originIsAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

async function readBoundedBody(request: Request, maxBytes: number): Promise<Uint8Array> {
  if (!request.body) throw new Error("empty");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    total += chunk.value.byteLength;
    if (total > maxBytes) throw new Error("too large");
    chunks.push(chunk.value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function POST(request: Request) {
  if (!originIsAllowed(request)) return errorResponse(403, "ORIGIN_REJECTED", "This request origin is not allowed.", false);
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("multipart/form-data;")) return errorResponse(415, "UNSUPPORTED_MEDIA_TYPE", "Upload one audio file as multipart form data.", false);
  let maxBytes: number;
  try { maxBytes = getElevenLabsConfig().maxAudioBytes; } catch { return errorResponse(503, "AI_NOT_CONFIGURED", "Audio transcription is not configured.", false); }
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes + 128 * 1024) return errorResponse(413, "INPUT_TOO_LARGE", "The audio file is too large.", false);
  let form: FormData;
  try {
    const body = await readBoundedBody(request, maxBytes + 128 * 1024);
    form = await new Request(request.url, { method: "POST", headers: { "content-type": contentType }, body: Buffer.from(body) }).formData();
  } catch (error) {
    return errorResponse(error instanceof Error && error.message === "too large" ? 413 : 400, error instanceof Error && error.message === "too large" ? "INPUT_TOO_LARGE" : "INVALID_INPUT", error instanceof Error && error.message === "too large" ? "The audio file is too large." : "The audio upload could not be read.", false);
  }
  const files = [...form.entries()].filter(([, value]) => typeof value !== "string");
  if (files.length !== 1) return errorResponse(400, "INVALID_INPUT", "Provide exactly one audio file.", false);
  const file = files[0][1] as File;
  if (!ALLOWED_TYPES.has(file.type.toLowerCase())) return errorResponse(415, "UNSUPPORTED_MEDIA_TYPE", "This audio format is not supported.", false);
  if (file.size === 0 || file.size > maxBytes) return errorResponse(413, "INPUT_TOO_LARGE", "The audio file is too large.", false);
  try {
    const result = await transcribeAudio({ data: new Uint8Array(await file.arrayBuffer()), filename: file.name, contentType: file.type, signal: request.signal });
    return Response.json({ schemaVersion: 1, status: "transcript", transcript: result.text, language: result.language, diagnosticId: crypto.randomUUID() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return errorResponse(502, "PROVIDER_FAILURE", "Audio transcription failed. Try again or use text input.", true);
  }
}
