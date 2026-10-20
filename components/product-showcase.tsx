"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { errorMessage } from "@/lib/api/client";
import { ProductDetail } from "@/components/product-detail";
import {
  fetchPublicProducts,
  formatPrice,
  PUBLIC_PRODUCTS_LIMIT,
  type PublicProduct,
} from "@/lib/public-products";

function StoreImage({ product }: { product: PublicProduct }) {
  const image = product.images?.[0];
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const broken = !image?.url || failedUrl === image.url;
  return (
    <div className="store-card-media">
      {broken ? (
        <span className="store-card-placeholder">Sem foto</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.url}
          alt={`Imagem de ${product.name}`}
          loading="lazy"
          onError={() => setFailedUrl(image.url)}
        />
      )}
    </div>
  );
}

function StoreCard({ product, page, onOpen }: { product: PublicProduct; page: number; onOpen: (id: string) => void }) {
  return (
    <li className="store-card">
      <a
        className="store-card-link"
        href={listUrl(page, product.id)}
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
          event.preventDefault();
          onOpen(product.id);
        }}
      >
        <StoreImage product={product} />
        <div className="store-card-body">
          <h3>{product.name}</h3>
          {product.sku && <span className="store-card-sku">SKU {product.sku}</span>}
          {product.description && <p>{product.description}</p>}
          <div className="store-card-price">
            <strong>{formatPrice(product.price)}</strong>
            <span>por {product.unit}</span>
          </div>
        </div>
      </a>
    </li>
  );
}

function listUrl(page: number, productId?: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set("pagina", String(page));
  if (productId) params.set("produto", productId);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export function ProductShowcase() {
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("produto");
  const parsedPage = Number(searchParams.get("pagina"));
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const scrollY = useRef(0);
  const query = useQuery({
    queryKey: ["public-products", page, PUBLIC_PRODUCTS_LIMIT],
    queryFn: ({ signal }) => fetchPublicProducts(page, PUBLIC_PRODUCTS_LIMIT, signal),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const wasSelected = useRef(false);
  useEffect(() => {
    if (selectedId) {
      window.scrollTo({ top: 0 });
    } else if (wasSelected.current) {
      window.scrollTo({ top: scrollY.current });
    }
    wasSelected.current = Boolean(selectedId);
  }, [selectedId]);

  function openProduct(id: string) {
    scrollY.current = window.scrollY;
    window.history.pushState({ showcase: true }, "", listUrl(page, id));
  }

  function backToList() {
    if (window.history.state?.showcase) window.history.back();
    else window.history.pushState(null, "", listUrl(page));
  }

  function goToPage(next: number) {
    window.history.pushState(null, "", listUrl(next));
    window.scrollTo({ top: 0 });
  }

  const products = query.data?.items ?? [];
  const totalPages = query.data
    ? Math.max(1, Math.ceil(query.data.total / query.data.limit))
    : 1;
  const selected = selectedId ? products.find((product) => product.id === selectedId) : undefined;

  return (
    <section aria-label="Catálogo de produtos">
      {selectedId && (
        query.isPending ? (
          <div className="loading-state" role="status">
            <span className="spinner" aria-hidden="true" /> Carregando produto...
          </div>
        ) : (
          <ProductDetail product={selected} onBack={backToList} />
        )
      )}
      <div hidden={Boolean(selectedId)}>
      {query.data && (
        <div className="store-toolbar">
          <span className="store-count" role="status">{query.data.total} produto(s)</span>
        </div>
      )}

      {query.isPending ? (
        <div className="loading-state" role="status">
          <span className="spinner" aria-hidden="true" /> Carregando produtos...
        </div>
      ) : query.isError ? (
        <div className="empty-state" role="alert">
          <strong>Não foi possível carregar os produtos</strong>
          {errorMessage(query.error)}
          <div style={{ marginTop: 12 }}>
            <button className="button" type="button" onClick={() => void query.refetch()} disabled={query.isFetching}>
              {query.isFetching ? "Tentando..." : "Tentar novamente"}
            </button>
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <strong>Nenhum produto disponível</strong>
          Volte em breve para conferir novidades.
        </div>
      ) : (
        <>
          <ul className="store-grid">
            {products.map((product) => (
              <StoreCard key={product.id} product={product} page={page} onOpen={openProduct} />
            ))}
          </ul>
          {totalPages > 1 && (
            <nav className="store-pagination" aria-label="Paginação">
              <button
                className="button button-secondary"
                type="button"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                Anterior
              </button>
              <span>Página {page} de {totalPages}</span>
              <button
                className="button button-secondary"
                type="button"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Próxima
              </button>
            </nav>
          )}
        </>
      )}
      </div>
    </section>
  );
}
