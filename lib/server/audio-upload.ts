const AUDIO_TYPES = new Set(["audio/webm", "audio/wav", "audio/x-wav", "audio/mpeg", "audio/mp4", "audio/ogg"]);

/** Keep the multipart boundary's original case. Lowercasing the header makes FormData reject the body. */
export function multipartContentType(header: string | null): string | null {
  if (!header || !header.toLowerCase().startsWith("multipart/form-data;")) return null;
  return header;
}

/** `audio/webm;codecs=opus` is what browsers record. The codec parameter is not a different format. */
export function audioBaseType(type: string): string | null {
  const base = type.toLowerCase().split(";")[0]?.trim() ?? "";
  return AUDIO_TYPES.has(base) ? base : null;
}
