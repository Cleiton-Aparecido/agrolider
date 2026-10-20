import { toast } from "sonner";

export const SESSION_EXPIRED_EVENT = "agrolider:session-expired";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface PageResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        accept: "application/json",
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    if (init.signal?.aborted) throw new DOMException("A solicitação foi cancelada.", "AbortError");
    throw new ApiError("Não foi possível conectar à aplicação.", 0);
  }

  if (!response.ok) {
    if (
      response.status === 401 &&
      typeof window !== "undefined" &&
      path.startsWith("/api/backend/")
    ) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    let message = `A solicitação falhou (${response.status}).`;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "message" in body) {
        const value = body.message;
        if (typeof value === "string") message = value;
        if (Array.isArray(value)) message = value.filter((part) => typeof part === "string").join(" ");
      }
    } catch {
      // The HTTP status remains available when an upstream response has no JSON body.
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function api<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(`/api/backend/${path.replace(/^\/+/, "")}`, init);
}

export function apiMutation<T>(
  path: string,
  method: "POST" | "PATCH" | "PUT" | "DELETE",
  body?: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  return api<T>(
    path,
    {
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...(headers ? { headers } : {}),
    },
  ).then((result) => {
    toast.success("Operação concluída.");
    return result;
  });
}

export function queryString(values: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) query.set(key, value);
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return "Sua sessão expirou. Entre novamente.";
    if (error.status === 403) return "Seu perfil não tem acesso a esta operação.";
    if (error.status === 0 || error.status === 502) {
      return "Não foi possível conectar à API. Verifique se o serviço está disponível.";
    }
    return error.message;
  }
  return "Ocorreu um erro inesperado. Tente novamente.";
}
