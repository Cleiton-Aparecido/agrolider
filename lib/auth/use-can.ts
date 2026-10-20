"use client";

import { useQuery } from "@tanstack/react-query";
import { request } from "@/lib/api/client";
import type { CurrentUser } from "@/lib/auth/types";

/** Reutiliza a query de sessão do shell; o backend continua sendo a autoridade final. */
export function useCan(): (permission: string) => boolean {
  const { data } = useQuery({
    queryKey: ["session"],
    queryFn: () => request<CurrentUser>("/api/auth/me"),
    retry: false,
    staleTime: 30_000,
  });
  const granted = Array.isArray(data?.permissions) ? data.permissions : [];
  return (permission) => granted.includes(permission);
}
