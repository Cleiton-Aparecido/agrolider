"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  PRODUCT_IMAGE_ACCEPT,
  PRODUCT_IMAGE_MAX_COUNT,
  validateProductImage,
  type PendingProductImage,
  type ProductImage,
} from "@/lib/product-images";

const frame = {
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  background: "#F7F9F7",
  border: "1px solid #E2E8F0",
  color: "#64748B",
  fontSize: 11,
} as const;

function ImageOrPlaceholder({ image, size, alt }: { image?: ProductImage; size: number; alt: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const broken = !image?.url || failedUrl === image.url;
  return (
    <span style={{ ...frame, width: size, height: size, borderRadius: 8, flex: "none" }}>
      {broken ? (
        <span aria-label={image ? "Imagem indisponível" : "Sem imagem"}>Sem foto</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.url}
          alt={alt}
          loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          onError={() => setFailedUrl(image.url)}
        />
      )}
    </span>
  );
}

export function ProductThumbnail({ images, name }: { images?: ProductImage[]; name: string }) {
  return <ImageOrPlaceholder image={images?.[0]} size={44} alt={`Imagem de ${name}`} />;
}

export function ProductGallery({ images, name }: { images?: ProductImage[]; name: string }) {
  if (!images?.length) {
    return <p className="panel-subtitle">Este produto ainda não possui imagens.</p>;
  }
  return (
    <ul style={{ display: "flex", flexWrap: "wrap", gap: 10, listStyle: "none", padding: 0, margin: 0 }}>
      {images.map((image, index) => (
        <li key={image.id}>
          <ImageOrPlaceholder image={image} size={96} alt={`${name} — imagem ${index + 1}`} />
        </li>
      ))}
    </ul>
  );
}

export function ProductImagePicker({
  value,
  onChange,
  disabled,
}: {
  value: PendingProductImage[];
  onChange: (images: PendingProductImage[]) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const latest = useRef(value);
  latest.current = value;

  useEffect(
    () => () => latest.current.forEach((image) => URL.revokeObjectURL(image.previewUrl)),
    [],
  );

  function handleSelect(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    const messages: string[] = [];
    const accepted: PendingProductImage[] = [];
    for (const file of files) {
      const problem = validateProductImage(file);
      if (problem) {
        messages.push(problem);
      } else if (value.length + accepted.length >= PRODUCT_IMAGE_MAX_COUNT) {
        messages.push(`O limite é de ${PRODUCT_IMAGE_MAX_COUNT} imagens por produto.`);
        break;
      } else {
        accepted.push({ key: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) });
      }
    }
    setProblems(messages);
    if (accepted.length) onChange([...value, ...accepted]);
  }

  function remove(key: string) {
    const target = value.find((image) => image.key === key);
    if (target) URL.revokeObjectURL(target.previewUrl);
    onChange(value.filter((image) => image.key !== key));
  }

  return (
    <div className="field field-wide">
      <span>Imagens (opcional)</span>
      <input
        ref={inputRef}
        type="file"
        accept={PRODUCT_IMAGE_ACCEPT}
        multiple
        hidden
        disabled={disabled}
        onChange={handleSelect}
      />
      <div>
        <button
          className="button button-secondary button-small"
          type="button"
          disabled={disabled || value.length >= PRODUCT_IMAGE_MAX_COUNT}
          onClick={() => inputRef.current?.click()}
        >
          Selecionar imagens
        </button>
        <span className="panel-subtitle" style={{ marginLeft: 10 }}>
          JPEG, PNG ou WebP · até 5 MB · máximo de {PRODUCT_IMAGE_MAX_COUNT} imagens
        </span>
      </div>
      {problems.length > 0 && (
        <div className="notice error-notice" role="alert">
          {problems.map((problem) => <div key={problem}>{problem}</div>)}
        </div>
      )}
      {value.length > 0 && (
        <ul style={{ display: "flex", flexWrap: "wrap", gap: 12, listStyle: "none", padding: 0, margin: "8px 0 0" }}>
          {value.map((image) => (
            <li key={image.key} style={{ width: 110 }}>
              <span style={{ ...frame, width: 110, height: 110, borderRadius: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.previewUrl} alt={`Prévia de ${image.file.name}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </span>
              <span style={{ display: "block", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={image.file.name}>
                {image.file.name}
              </span>
              <button
                className="button button-secondary button-small"
                type="button"
                disabled={disabled}
                onClick={() => remove(image.key)}
                aria-label={`Remover ${image.file.name}`}
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
