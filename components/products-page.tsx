"use client";

import { useState, type FormEvent } from "react";
import { ApiListPage, type TableRow } from "@/components/api-list-page";
import { apiMutation, errorMessage } from "@/lib/api/client";
import { ProductGallery, ProductImagePicker, ProductThumbnail } from "@/components/product-images";
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

interface ProductForm {
  name: string;
  description: string;
  sku: string;
  unit: string;
  price: string;
}

const emptyForm: ProductForm = { name: "", description: "", sku: "", unit: "un", price: "" };

export function ProductsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingImages, setPendingImages] = useState<PendingProductImage[]>([]);

  function resetImages() {
    pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setPendingImages([]);
  }

  async function createProduct(event: FormEvent<HTMLFormElement>, reload: () => void) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      const images = !editProduct && pendingImages.length ? await toImagePayloads(pendingImages) : undefined;
      await apiMutation<Product>(
        editProduct ? `products/${editProduct.id}` : "products",
        editProduct ? "PATCH" : "POST",
        {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        sku: form.sku.trim() || undefined,
        unit: form.unit.trim(),
        price: form.price,
        ...(images ? { images } : {}),
        },
      );
      setForm(emptyForm);
      setEditProduct(null);
      resetImages();
      setFormOpen(false);
      reload();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ApiListPage<Product>
      title="Produtos"
      description="Catálogo cadastral de produtos. O saldo de estoque é consultado separadamente."
      endpoint="products"
      searchable
      inlineError={error}
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
      toolbar={(reload) => (
        <>
          <div className="form-actions" style={{ marginBottom: 13 }}>
            <button
              className="button"
              type="button"
              onClick={() => {
                if (formOpen) {
                  setEditProduct(null);
                  setForm(emptyForm);
                  resetImages();
                }
                setFormOpen(!formOpen);
              }}
            >
              {formOpen ? "Fechar formulário" : "Novo produto"}
            </button>
          </div>
          {formOpen && (
            <section className="form-panel">
              <h2 className="panel-title">{editProduct ? "Editar produto" : "Cadastrar produto"}</h2>
              <p className="panel-subtitle">Campos conforme o contrato da API.</p>
              <form onSubmit={(event) => void createProduct(event, reload)} style={{ marginTop: 15 }}>
                <div className="field-grid">
                  <label className="field">Nome
                    <input className="input" required maxLength={180} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                  </label>
                  <label className="field">SKU (opcional)
                    <input className="input" maxLength={80} value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} />
                  </label>
                  <label className="field">Unidade
                    <input className="input" required maxLength={40} value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} />
                  </label>
                  <label className="field">Preço unitário (R$)
                    <input className="input" required inputMode="decimal" pattern="(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?" placeholder="0.00" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
                  </label>
                  <label className="field field-wide">Descrição (opcional)
                    <textarea className="textarea" maxLength={5000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                  </label>
                  {editProduct ? (
                    <div className="field field-wide">
                      <span>Imagens cadastradas</span>
                      <ProductGallery images={editProduct.images} name={editProduct.name} />
                      <p className="panel-subtitle">A API ainda não permite adicionar ou remover imagens de produtos existentes.</p>
                    </div>
                  ) : (
                    <ProductImagePicker value={pendingImages} onChange={setPendingImages} disabled={saving} />
                  )}
                </div>
                {error && <div className="notice error-notice" role="alert">{error}</div>}
                <div className="form-actions">
                  <button className="button button-secondary" type="button" disabled={saving} onClick={() => { setFormOpen(false); setEditProduct(null); setForm(emptyForm); resetImages(); }}>Cancelar</button>
                  <button className="button" type="submit" disabled={saving}>{saving ? "Salvando..." : editProduct ? "Salvar alterações" : "Salvar produto"}</button>
                </div>
              </form>
            </section>
          )}
        </>
      )}
      rowActions={(product, reload) => (
        <>
          <button
            className="button button-secondary button-small"
            type="button"
            onClick={() => {
              setEditProduct(product);
              resetImages();
              setForm({
                name: product.name,
                description: typeof product.description === "string" ? product.description : "",
                sku: product.sku ?? "",
                unit: product.unit,
                price: product.price,
              });
              setFormOpen(true);
            }}
          >
            Editar
          </button>
          <button
            className={`button button-small ${product.isActive ? "button-secondary" : ""}`}
            type="button"
            onClick={() => {
              const action = product.isActive ? "deactivate" : "activate";
              void apiMutation(`products/${product.id}/${action}`, "PATCH")
                .then(reload)
                .catch((reason: unknown) => setError(errorMessage(reason)));
            }}
          >
            {product.isActive ? "Desativar" : "Ativar"}
          </button>
        </>
      )}
    />
  );
}
