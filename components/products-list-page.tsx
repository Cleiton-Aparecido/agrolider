"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { ApiListPage, type TableRow } from "@/components/api-list-page";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormModal, useModalForm } from "@/components/modal";
import { ProductGallery, ProductImagePicker, ProductThumbnail } from "@/components/product-images";
import { apiMutation, errorMessage } from "@/lib/api/client";
import { useCan } from "@/lib/auth/use-can";
import { toImagePayloads, type PendingProductImage, type ProductImage } from "@/lib/product-images";

interface Product extends TableRow {
  name: string;
  description: string | null;
  sku: string | null;
  unit: string;
  price: string;
  isActive: boolean;
  images?: ProductImage[];
}

function ProductFormModal({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const form = useModalForm();
  const [pendingImages, setPendingImages] = useState<PendingProductImage[]>([]);

  function close() {
    pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    onClose();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const ok = await form.run(async () => {
      const images = !product && pendingImages.length ? await toImagePayloads(pendingImages) : undefined;
      await apiMutation(product ? `products/${product.id}` : "products", product ? "PATCH" : "POST", {
        name: String(data.get("name")).trim(),
        description: String(data.get("description")).trim() || undefined,
        sku: String(data.get("sku")).trim() || undefined,
        unit: String(data.get("unit")).trim(),
        price: String(data.get("price")).trim(),
        ...(images ? { images } : {}),
      });
    }, errorMessage);
    if (ok) {
      onSaved();
      close();
    }
  }

  return (
    <FormModal
      open
      onClose={close}
      title={product ? "Editar produto" : "Novo produto"}
      description="Campos conforme o contrato da API."
      size="drawer"
      onSubmit={(event) => void submit(event)}
      submitLabel={product ? "Salvar alterações" : "Salvar produto"}
      submitting={form.submitting}
      error={form.error}
      dirty={form.dirty || pendingImages.length > 0}
      onDirty={form.markDirty}
    >
      <div className="field-grid">
        <label className="field">Nome
          <input className="input" name="name" required maxLength={180} defaultValue={product?.name ?? ""} autoFocus />
        </label>
        <label className="field">SKU (opcional)
          <input className="input" name="sku" maxLength={80} defaultValue={product?.sku ?? ""} />
        </label>
        <label className="field">Unidade
          <input className="input" name="unit" required maxLength={40} defaultValue={product?.unit ?? "un"} />
        </label>
        <label className="field">Preço unitário (R$)
          <input className="input" name="price" required inputMode="decimal" pattern="(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?" placeholder="0.00" defaultValue={product?.price ?? ""} />
        </label>
        <label className="field field-wide">Descrição (opcional)
          <textarea className="textarea" name="description" maxLength={5000} defaultValue={product?.description ?? ""} />
        </label>
        {product ? (
          <div className="field field-wide">
            <span>Imagens cadastradas</span>
            <ProductGallery images={product.images} name={product.name} />
            <p className="panel-subtitle">A API ainda não permite adicionar ou remover imagens de produtos existentes.</p>
          </div>
        ) : (
          <ProductImagePicker value={pendingImages} onChange={setPendingImages} disabled={form.submitting} />
        )}
      </div>
    </FormModal>
  );
}

type Dialog = { kind: "form"; product: Product | null } | { kind: "status"; product: Product };

export function ProductsListPage() {
  const can = useCan();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);

  return (
    <ApiListPage<Product>
      title="Produtos"
      description="Catálogo cadastral de produtos. O saldo de estoque é consultado separadamente."
      endpoint="products"
      searchable
      columns={[
        {
          key: "images",
          label: "Imagem",
          render: (_value, product) => <ProductThumbnail images={product.images} name={product.name} />,
        },
        { key: "name", label: "Produto", primary: true },
        { key: "sku", label: "SKU" },
        { key: "unit", label: "Unidade" },
        { key: "price", label: "Preço unitário" },
        { key: "isActive", label: "Situação" },
      ]}
      actions={() =>
        can("products.create") && (
          <button className="button" type="button" onClick={() => setDialog({ kind: "form", product: null })}>
            <Plus size={16} aria-hidden="true" /> Novo produto
          </button>
        )
      }
      toolbar={(reload) => (
        <>
          {dialog?.kind === "form" && <ProductFormModal key={dialog.product?.id ?? "new"} product={dialog.product} onClose={close} onSaved={reload} />}
          <ConfirmDialog
            open={dialog?.kind === "status"}
            title={dialog?.kind === "status" && dialog.product.isActive ? "Desativar produto" : "Ativar produto"}
            message={dialog?.kind === "status" ? `Deseja ${dialog.product.isActive ? "desativar" : "ativar"} o produto ${dialog.product.name}?` : ""}
            confirmLabel={dialog?.kind === "status" && dialog.product.isActive ? "Desativar" : "Ativar"}
            danger={dialog?.kind === "status" && dialog.product.isActive}
            onClose={close}
            onConfirm={async () => {
              if (dialog?.kind !== "status") return;
              await apiMutation(`products/${dialog.product.id}/${dialog.product.isActive ? "deactivate" : "activate"}`, "PATCH");
              reload();
            }}
          />
        </>
      )}
      rowActions={(product) => (
        <>
          {can("products.update") && (
            <button className="button button-secondary button-small" type="button" onClick={() => setDialog({ kind: "form", product })}>
              Editar
            </button>
          )}
          {can("products.deactivate") && (
            <button className={`button button-small ${product.isActive ? "button-secondary" : ""}`} type="button" onClick={() => setDialog({ kind: "status", product })}>
              {product.isActive ? "Desativar" : "Ativar"}
            </button>
          )}
        </>
      )}
    />
  );
}
