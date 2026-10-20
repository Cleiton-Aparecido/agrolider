"use client";

import { useState } from "react";
import { formatPrice, type PublicProduct } from "@/lib/public-products";

interface ProductDetailProps {
  /** Produto já carregado pela listagem; undefined quando não está em memória. */
  product: PublicProduct | undefined;
  onBack: () => void;
}

function Gallery({ product }: { product: PublicProduct }) {
  const images = product.images ?? [];
  const [selected, setSelected] = useState(0);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const current = images[selected] ?? images[0];
  const broken = !current?.url || failed.has(current.url);
  const markFailed = (url: string) => setFailed((prev) => new Set(prev).add(url));

  return (
    <div className="detail-gallery">
      <div className="detail-main-image">
        {broken ? (
          <span className="store-card-placeholder">Sem foto</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={current.url}
            alt={`Imagem de ${product.name}`}
            onError={() => markFailed(current.url)}
          />
        )}
      </div>
      {images.length > 1 && (
        <ul className="detail-thumbs" aria-label="Imagens do produto">
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                type="button"
                className="detail-thumb"
                aria-label={`Ver imagem ${index + 1}`}
                aria-current={index === selected}
                onClick={() => setSelected(index)}
              >
                {failed.has(image.url) ? (
                  <span aria-hidden="true">–</span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image.url} alt="" loading="lazy" onError={() => markFailed(image.url)} />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ProductDetail({ product, onBack }: ProductDetailProps) {
  if (!product) {
    return (
      <div className="empty-state" role="alert">
        <strong>Produto indisponível no momento</strong>
        Acesse o produto pela vitrine para visualizar seus detalhes.
        <div style={{ marginTop: 12 }}>
          <button className="button" type="button" onClick={onBack}>Voltar à vitrine</button>
        </div>
      </div>
    );
  }

  return (
    <article className="detail-page" aria-label={`Detalhes de ${product.name}`}>
      <button className="button button-secondary" type="button" onClick={onBack}>
        ← Voltar à vitrine
      </button>
      <div className="detail-layout">
        <Gallery key={product.id} product={product} />
        <div className="detail-info">
          <h1>{product.name}</h1>
          {product.sku && <span className="store-card-sku">SKU {product.sku}</span>}
          <div className="store-card-price">
            <strong>{formatPrice(product.price)}</strong>
            <span>por {product.unit}</span>
          </div>
          {product.description && (
            <section>
              <h2>Descrição</h2>
              <p>{product.description}</p>
            </section>
          )}
          <dl className="detail-specs">
            <div><dt>Unidade</dt><dd>{product.unit}</dd></div>
            {product.sku && <div><dt>Código (SKU)</dt><dd>{product.sku}</dd></div>}
          </dl>
        </div>
      </div>
    </article>
  );
}
