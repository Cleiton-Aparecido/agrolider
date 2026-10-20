import { NextRequest, NextResponse } from "next/server";
import {
  backendUrl,
  isSameOriginMutation,
  jsonError,
  SESSION_COOKIE,
  setSessionCookie,
} from "@/lib/server/api";

interface PasswordChangeResponse {
  accessToken: string;
  expiresIn: number;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginMutation(request)) {
    return jsonError(403, "Origem da solicitação não permitida.");
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return jsonError(401, "Sessão não encontrada.");

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "Informe os dados de senha corretamente.");
  }

  try {
    const upstream = await fetch(backendUrl("/auth/password/change"), {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        accept: "application/json",
      },
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
      return jsonError(502, "A resposta da API ao alterar a senha é inválida.");
    }

    const change = result as PasswordChangeResponse;
    const { accessToken, ...safeResult } = change;
    const response = NextResponse.json(safeResult, {
      headers: { "cache-control": "no-store" },
    });
    setSessionCookie(response, accessToken, change.expiresIn);
    return response;
  } catch {
    return jsonError(502, "Não foi possível conectar ao serviço AgroLider.");
  }
}
