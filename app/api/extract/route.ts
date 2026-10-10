import "server-only";

import { ExtractRequestSchema } from "@/lib/server/contracts";
import { extractWithBackboard } from "@/lib/server/backboard";
import { getBackboardConfig } from "@/lib/server/env";


const MAX_BODY_BYTES = 32 * 1024;

function errorResponse(status: number, code: string, message: string, retryable: boolean) {
  return Response.json(
    { schemaVersion: 1, status: "error", error: { code, message, retryable }, diagnosticId: crypto.randomUUID() },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

async function readBody(request: Request): Promise<string> {
  const length = request.headers.get("content-length");
  if (length && Number(length) > MAX_BODY_BYTES) throw new Error("too large");
  if (!request.body) throw new Error("empty");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let value = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > MAX_BODY_BYTES) throw new Error("too large");
    value += decoder.decode(chunk.value, { stream: true });
  }
  return value + decoder.decode();
}

import { originIsAllowed } from "@/lib/server/origin";

export async function POST(request: Request) {
  if (!originIsAllowed(request)) return errorResponse(403, "ORIGIN_REJECTED", "This request origin is not allowed.", false);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return errorResponse(415, "UNSUPPORTED_MEDIA_TYPE", "Send a JSON request.", false);
  }
  let body: string;
  try { body = await readBody(request); } catch (error) {
    return errorResponse(error instanceof Error && error.message === "too large" ? 413 : 400, error instanceof Error && error.message === "too large" ? "INPUT_TOO_LARGE" : "INVALID_INPUT", "The request could not be read.", false);
  }
  let input: unknown;
  try { input = JSON.parse(body); } catch { return errorResponse(400, "INVALID_INPUT", "The request must contain valid JSON.", false); }
  const parsed = ExtractRequestSchema.safeParse(input);
  if (!parsed.success) return errorResponse(400, "INVALID_INPUT", "The extraction request is invalid.", false);
  try { getBackboardConfig(); } catch { return errorResponse(503, "AI_NOT_CONFIGURED", "Text extraction is not configured.", false); }
  const started = Date.now();
  try {
    const draft = await extractWithBackboard(parsed.data.source.text, request.signal);
    return Response.json({
      schemaVersion: 1,
      status: "draft",
      diagnosticId: crypto.randomUUID(),
      requestId: parsed.data.requestId,
      source: parsed.data.source,
      workspaceRevision: parsed.data.workspaceRevision,
      draft,
      generation: { provider: getBackboardConfig().provider, model: getBackboardConfig().model, promptVersion: "extract-v1", durationMs: Date.now() - started },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return errorResponse(timedOut ? 504 : 502, timedOut ? "EXTRACTION_TIMEOUT" : "MODEL_OUTPUT_INVALID", timedOut ? "Extraction timed out. Your original list is unchanged." : "The draft could not be validated. Your original list is unchanged.", true);
  }
}
