/**
 * Origin validation for mutation endpoints (/api/extract, /api/transcribe).
 * Allows same-origin requests while handling reverse proxies, SSL termination (https vs http),
 * LAN/mobile development (e.g. 192.168.x.x:3000), and hosted production platforms.
 */
export function originIsAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);

    // 1. Direct exact origin match
    if (originUrl.origin === requestUrl.origin) {
      return true;
    }

    // 2. Host match via forwarded-host, host header, or request URL host
    // (Resolves protocol mismatch when SSL is terminated at edge/load balancer: https vs http)
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const hostHeader = request.headers.get("host")?.trim();
    const allowedHosts = new Set(
      [forwardedHost, hostHeader, requestUrl.host]
        .filter((h): h is string => Boolean(h))
        .map((h) => h.toLowerCase()),
    );

    if (allowedHosts.has(originUrl.host.toLowerCase())) {
      return true;
    }

    // 3. Explicitly configured origins (environment variables)
    const envOrigins = [
      process.env.ALLOWED_ORIGIN,
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.RENDER_EXTERNAL_URL,
      process.env.RENDER_EXTERNAL_HOSTNAME ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}` : undefined,
      process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined,
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    ];

    for (const envVal of envOrigins) {
      if (!envVal) continue;
      for (const item of envVal.split(",")) {
        const trimmed = item.trim();
        if (!trimmed) continue;
        try {
          const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
          if (parsed.host.toLowerCase() === originUrl.host.toLowerCase()) {
            return true;
          }
        } catch {
          if (trimmed.toLowerCase() === origin.toLowerCase()) return true;
        }
      }
    }

    // 4. Referer header fallback if present and matching allowed host
    const referer = request.headers.get("referer");
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        if (allowedHosts.has(refererUrl.host.toLowerCase()) && refererUrl.host.toLowerCase() === originUrl.host.toLowerCase()) {
          return true;
        }
      } catch {
        // Ignore unparseable referer
      }
    }
  } catch {
    return false;
  }

  return false;
}
