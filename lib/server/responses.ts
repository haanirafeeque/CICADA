import "server-only";
import { NextResponse, type NextRequest } from "next/server";

export function redirectTo(request: NextRequest, pathname: string, status = 303): NextResponse {
  return NextResponse.redirect(new URL(pathname, request.url), status);
}

export function unavailableRedirect(request: NextRequest, pathname: string): NextResponse {
  return redirectTo(request, `${pathname}?status=unavailable`);
}

export function jsonNoStore(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
