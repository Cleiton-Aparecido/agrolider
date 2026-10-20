export const PRODUCT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PRODUCT_IMAGE_ACCEPT = PRODUCT_IMAGE_TYPES.join(",");
// Valores padrão do backend (PRODUCT_IMAGE_MAX_SIZE_BYTES e PRODUCT_IMAGE_MAX_COUNT).
// O backend continua sendo a autoridade e seus erros são exibidos ao usuário.
export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_MAX_COUNT = 5;

/** Imagem persistida, conforme ProductImageResponseDto. */
export interface ProductImage {
  id: string;
  url: string;
  contentType: string;
}

/** Item de CreateProductDto.images. */
export interface CreateProductImagePayload {
  base64: string;
  fileName?: string;
}

/** Arquivo escolhido localmente, ainda não enviado. */
export interface PendingProductImage {
  key: string;
  file: File;
  previewUrl: string;
}

export function validateProductImage(file: File): string | null {
  if (!(PRODUCT_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return `"${file.name}" não é permitido. Use JPEG, PNG ou WebP.`;
  }
  if (file.size === 0) return `"${file.name}" está vazio.`;
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    return `"${file.name}" excede ${PRODUCT_IMAGE_MAX_BYTES / 1024 / 1024} MB.`;
  }
  return null;
}

/** Converte para Data URL (data:image/...;base64,...), formato aceito pelo backend. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Não foi possível ler a imagem."));
    };
    reader.onerror = () => reject(new Error(`Não foi possível ler "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

export async function toImagePayloads(
  images: PendingProductImage[],
): Promise<CreateProductImagePayload[]> {
  return Promise.all(
    images.map(async ({ file }) => ({
      base64: await fileToDataUrl(file),
      fileName: file.name.slice(0, 255),
    })),
  );
}
