import { NextRequest, NextResponse } from "next/server";
import {
  backendUrl,
  isSameOriginMutation,
  jsonError,
  setSessionCookie,
} from "@/lib/server/api";

interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  [key: string]: unknown;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return jsonError(403, "Origem da solicitação não permitida.");
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "Informe e-mail e senha válidos.");
  }

  try {
    const upstream = await fetch(backendUrl("/auth/login"), {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const result: unknown = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json(result, {
        status: upstream.status,
        headers: { "cache-control": "no-store" },
      });
    }
    if (
      !result ||
      typeof result !== "object" ||
      !("accessToken" in result) ||
      typeof result.accessToken !== "string" ||
      !("expiresIn" in result)
    ) {
      return jsonError(502, "A resposta de autenticação da API é inválida.");
    }

    const login = result as LoginResponse;
    const { accessToken, ...safeResult } = login;
    const response = NextResponse.json(safeResult, {
      headers: { "cache-control": "no-store" },
    });
    setSessionCookie(response, accessToken, login.expiresIn);
    return response;
  } catch {
    return jsonError(502, "Não foi possível conectar ao serviço AgroLider.");
  }
}
