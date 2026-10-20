import { NextRequest, NextResponse } from "next/server";
import {
  backendUrl,
  isSameOriginMutation,
  jsonError,
  proxyApiRequest,
  SESSION_COOKIE,
} from "@/lib/server/api";

const allowedResources = new Set([
  "products",
  "stock",
  "customers",
  "orders",
  "logistics",
  "users",
  "roles",
  "permissions",
]);

type RouteContext = {
  params: Promise<{ segments: string[] }>;
};

const PUBLIC_PRODUCTS_PATH = "products/public";

// Única rota liberada sem sessão: a vitrine pública. Nenhuma credencial é enviada ao backend.
async function forwardPublicProducts(searchParams: URLSearchParams) {
  const query = new URLSearchParams();
  for (const key of ["page", "limit"]) {
    const value = searchParams.get(key);
    if (value && /^\d{1,4}$/.test(value)) query.set(key, value);
  }
  const suffix = query.size ? `?${query.toString()}` : "";
  try {
    const upstream = await fetch(backendUrl(`/${PUBLIC_PRODUCTS_PATH}`, suffix), {
      headers: { accept: "application/json" },
      cache: "no-store",
      redirect: "manual",
    });
    if (!upstream.ok) {
      const detail = (await upstream.text().catch(() => "")).slice(0, 300);
      console.warn(`[public-products] backend respondeu ${upstream.status}: ${detail}`);
      return jsonError(502, "Não foi possível carregar os produtos no momento.");
    }
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.warn("[public-products] falha ao conectar ao backend:", error);
    return jsonError(502, "Não foi possível conectar ao serviço AgroLider.");
  }
}

async function forward(request: NextRequest, context: RouteContext) {
  if (!["GET", "POST", "PATCH", "PUT", "DELETE"].includes(request.method)) {
    return jsonError(405, "Método não permitido.");
  }
  if (request.method !== "GET" && !isSameOriginMutation(request)) {
    return jsonError(403, "Origem da solicitação não permitida.");
  }

  const { segments } = await context.params;
  if (request.method === "GET" && segments.join("/") === PUBLIC_PRODUCTS_PATH) {
    return forwardPublicProducts(request.nextUrl.searchParams);
  }
  const resource = segments[0];
  if (
    !resource ||
    !allowedResources.has(resource) ||
    !segments.every((segment) => /^[a-zA-Z0-9_-]+$/.test(segment))
  ) {
    return jsonError(404, "Recurso não disponível.");
  }
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return jsonError(401, "Sessão não encontrada.");

  return proxyApiRequest(request, `/${segments.join("/")}`, token);
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const PUT = forward;
export const DELETE = forward;
