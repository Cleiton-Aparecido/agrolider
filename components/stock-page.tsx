"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiListPage, type TableRow } from "@/components/api-list-page";
import { api, apiMutation, errorMessage, type PageResult } from "@/lib/api/client";

interface Product extends TableRow {
  name: string;
  sku: string | null;
  unit: string;
}

interface StockBalance extends TableRow {
  productId: string;
  quantityOnHand: string;
  quantityReserved: string;
  quantityAvailable?: string;
}

export function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsError, setProductsError] = useState("");
  const [mode, setMode] = useState<"entries" | "exits" | "adjustments">("entries");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<PageResult<Product>>("/products?page=1&limit=100")
      .then((response) => setProducts(response.items))
      .catch((reason: unknown) => setProductsError(errorMessage(reason)));
  }, []);

  async function register(event: FormEvent<HTMLFormElement>, reload: () => void) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      productId: String(form.get("productId")),
      quantity: String(form.get("quantity")),
      reason: String(form.get("reason")).trim(),
      idempotencyKey: crypto.randomUUID(),
      ...(mode === "adjustments"
        ? { movementType: String(form.get("movementType")) }
        : {}),
    };
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await apiMutation(`stock/${mode}`, "POST", payload);
      setNotice("Movimentação registrada pela API.");
      formElement.reset();
      reload();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
      <ApiListPage<StockBalance>
        title="Saldos por produto"
        description="Quantidade disponível = quantidade física menos quantidade reservada."
        endpoint="stock/balances"
        inlineError={error}
        toolbar={(reload) => (
          <>
            <section className="form-panel">
              <h2 className="panel-title">Registrar movimentação</h2>
              <p className="panel-subtitle">O backend valida o saldo disponível e registra o usuário responsável.</p>
              <div className="inline-form" style={{ marginTop: 15, marginBottom: 15 }}>
                {(["entries", "exits", "adjustments"] as const).map((item) => (
                  <button
                    className={`button button-small ${mode === item ? "" : "button-secondary"}`}
                    type="button"
                    key={item}
                    onClick={() => setMode(item)}
                  >
                    {item === "entries" ? "Entrada" : item === "exits" ? "Saída" : "Ajuste"}
                  </button>
                ))}
              </div>
              <form onSubmit={(event) => void register(event, reload)}>
                <div className="field-grid">
                  <label className="field">Produto
                    <select className="select" name="productId" required defaultValue="">
                      <option value="" disabled>Selecione um produto</option>
                      {products.map((product) => <option value={product.id} key={product.id}>{product.name}{product.sku ? ` · ${product.sku}` : ""}</option>)}
                    </select>
                  </label>
                  <label className="field">Quantidade
                    <input className="input" name="quantity" inputMode="decimal" pattern="(?:0|[1-9]\d{0,10})(?:\.\d{1,3})?" placeholder="0.000" required />
                  </label>
                  {mode === "adjustments" && (
                    <label className="field">Direção do ajuste
                      <select className="select" name="movementType" required>
                        <option value="ADJUSTMENT_IN">Ajuste de entrada</option>
                        <option value="ADJUSTMENT_OUT">Ajuste de saída</option>
                      </select>
                    </label>
                  )}
                  <label className="field field-wide">Motivo
                    <textarea className="textarea" name="reason" minLength={2} maxLength={1000} required />
                  </label>
                </div>
                {productsError && <div className="notice error-notice" role="alert">{productsError} Não foi possível carregar produtos para selecionar.</div>}
                {notice && <div className="notice" role="status">{notice}</div>}
                <div className="form-actions">
                  <button className="button" type="submit" disabled={saving || !products.length}>{saving ? "Registrando..." : "Confirmar movimentação"}</button>
                </div>
              </form>
            </section>
          </>
        )}
        columns={[
          { key: "productId", label: "Produto (ID)" },
          { key: "quantityOnHand", label: "Físico" },
          { key: "quantityReserved", label: "Reservado" },
          { key: "quantityAvailable", label: "Disponível", primary: true },
        ]}
      />
  );
}

interface StockMovement extends TableRow {
  productId: string;
  movementType: string;
  quantity: string;
  quantityBefore: string;
  quantityAfter: string;
  reason: string;
  createdAt: string;
}

export function MovementsPage() {
  const [draftFilters, setDraftFilters] = useState({ type: "", productId: "", from: "", to: "" });
  const [filters, setFilters] = useState(draftFilters);
  const [error, setError] = useState("");
  return (
    <ApiListPage<StockMovement>
      title="Movimentações de estoque"
      description="Histórico imutável de entradas, saídas, ajustes, reservas e liberações."
      endpoint="stock/movements"
      inlineError={error}
      initialParams={{
        type: filters.type || undefined,
        productId: filters.productId || undefined,
        from: filters.from ? `${filters.from}T00:00:00.000Z` : undefined,
        to: filters.to ? `${filters.to}T23:59:59.999Z` : undefined,
      }}
      toolbar={() => (
        <div className="form-panel">
          <div className="field-grid">
            <label className="field">Tipo
              <select className="select" value={draftFilters.type} onChange={(event) => setDraftFilters({ ...draftFilters, type: event.target.value })}>
                <option value="">Todos</option>
                <option value="ENTRY">Entrada</option>
                <option value="EXIT">Saída</option>
                <option value="ADJUSTMENT_IN">Ajuste de entrada</option>
                <option value="ADJUSTMENT_OUT">Ajuste de saída</option>
                <option value="RESERVATION">Reserva</option>
                <option value="RELEASE">Liberação</option>
              </select>
            </label>
            <label className="field">ID do produto
              <input className="input" value={draftFilters.productId} onChange={(event) => setDraftFilters({ ...draftFilters, productId: event.target.value })} placeholder="UUID" />
            </label>
            <label className="field">De
              <input className="input" type="date" value={draftFilters.from} onChange={(event) => setDraftFilters({ ...draftFilters, from: event.target.value })} />
            </label>
            <label className="field">Até
              <input className="input" type="date" value={draftFilters.to} onChange={(event) => setDraftFilters({ ...draftFilters, to: event.target.value })} />
            </label>
          </div>
          <div className="form-actions" style={{ marginTop: 12 }}>
            <button className="button button-secondary" type="button" onClick={() => { const empty = { type: "", productId: "", from: "", to: "" }; setDraftFilters(empty); setFilters(empty); }}>
              Limpar
            </button>
            <button className="button" type="button" onClick={() => setFilters(draftFilters)}>Aplicar filtros</button>
          </div>
        </div>
      )}
      columns={[
        { key: "createdAt", label: "Data" },
        { key: "productId", label: "Produto" },
        { key: "movementType", label: "Tipo", primary: true },
        { key: "quantity", label: "Quantidade" },
        { key: "quantityBefore", label: "Saldo anterior" },
        { key: "quantityAfter", label: "Saldo posterior" },
        { key: "reason", label: "Motivo" },
      ]}
      rowActions={(movement, reload) => (
        <button
          className="button button-small button-secondary"
          type="button"
          onClick={() => {
            const reason = window.prompt("Justificativa para criar a movimentação compensatória:");
            if (!reason?.trim()) return;
            void apiMutation(`stock/movements/${movement.id}/corrections`, "POST", { reason: reason.trim() })
              .then(reload)
              .catch((failure: unknown) => setError(errorMessage(failure)));
          }}
        >
          Corrigir
        </button>
      )}
    />
  );
}
