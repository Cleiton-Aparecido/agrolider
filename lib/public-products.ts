import { request, type PageResult } from "@/lib/api/client";
import type { ProductImage } from "@/lib/product-images";

/** Item de GET /products/public (ProductResponseDto). */
export interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  unit: string;
  price: string;
  isActive: boolean;
  images: ProductImage[];
}

export const PUBLIC_PRODUCTS_LIMIT = 20;

export function fetchPublicProducts(
  page: number,
  limit: number = PUBLIC_PRODUCTS_LIMIT,
  signal?: AbortSignal,
  search?: string,
): Promise<PageResult<PublicProduct>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search?.trim()) params.set("search", search.trim());
  return request<PageResult<PublicProduct>>(
    `/api/backend/products/public?${params.toString()}`,
    { signal },
  );
}

export function formatPrice(value: string): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
}
