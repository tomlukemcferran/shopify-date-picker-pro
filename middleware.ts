import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Remove X-Frame-Options so the app can be embedded in Shopify admin iframe.
 * Vercel or the runtime may add X-Frame-Options: deny; we strip it so CSP frame-ancestors (set by the app) controls framing.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.delete("X-Frame-Options");
  return response;
}

export const config = {
  matcher: ["/(.*)"],
};
