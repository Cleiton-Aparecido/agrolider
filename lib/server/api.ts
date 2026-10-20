import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE = "agrolider_session";

export function backendUrl(path: string, search = ""): URL {
  const configuredUrl = process.env.API_URL ?? "http://localhost:3000";
  const baseUrl = new URL(configuredUrl);
  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    throw new Error("API_URL deve utilizar HTTP ou HTTPS.");
  }
  baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, "")}/${path.replace(/^\/+/, "")}`;
  baseUrl.search = search;
  return baseUrl;
}

export function isSameOriginMutation(request: NextRequest): boolean {
  return request.headers.get("origin") === request.nextUrl.origin;
}

export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ statusCode: status, message }, { status });
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresIn: unknown,
): void {
  const maxAge =
    typeof expiresIn === "number" && Number.isFinite(expiresIn)
      ? Math.max(0, Math.floor(expiresIn))
      : undefined;

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    ...(maxAge === undefined ? {} : { maxAge }),
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export async function proxyApiRequest(
  request: NextRequest,
  path: string,
  token: string,
): Promise<NextResponse> {
  const headers = new Headers({
    authorization: `Bearer ${token}`,
    accept: "application/json",
  });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) headers.set("idempotency-key", idempotencyKey);

  const hasBody = !["GET", "HEAD"].includes(request.method);

  try {
    const upstream = await fetch(backendUrl(path, request.nextUrl.search), {
      method: request.method,
      headers,
      ...(hasBody ? { body: await request.arrayBuffer() } : {}),
      cache: "no-store",
      redirect: "manual",
    });
    const responseHeaders = new Headers();
    const upstreamContentType = upstream.headers.get("content-type");
    if (upstreamContentType) {
      responseHeaders.set("content-type", upstreamContentType);
    }
    responseHeaders.set("cache-control", "no-store");
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return jsonError(502, "Não foi possível conectar ao serviço AgroLider.");
  }
}
