import { NextRequest, NextResponse } from "next/server";
import {
  backendUrl,
  jsonError,
  SESSION_COOKIE,
} from "@/lib/server/api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return jsonError(401, "Sessão não encontrada.");

  try {
    const upstream = await fetch(backendUrl("/auth/me"), {
      headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      cache: "no-store",
    });
    const body = await upstream.text();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return jsonError(502, "Não foi possível consultar a sessão.");
  }
}
