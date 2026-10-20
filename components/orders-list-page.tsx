"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { ApiListPage, type TableRow } from "@/components/api-list-page";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormModal, Modal, useModalForm } from "@/components/modal";
import { api, apiMutation, errorMessage, type PageResult } from "@/lib/api/client";
import { useCan } from "@/lib/auth/use-can";
import { formatCurrency, statusLabel, statusTone } from "@/lib/utils/format";

interface Customer extends TableRow {
  name: string;
  documentNumber: string;
}

interface Product extends TableRow {
  name: string;
  sku: string | null;
  unit: string;
  price: string;
  isActive: boolean;
}

interface Order extends TableRow {
  status: string;
  customerNameSnapshot: string;
  customerDocumentSnapshot: string;
  totalAmount: string;
  createdAt: string;
  items?: { productNameSnapshot: string; quantity: string }[];
}

interface CustomerLookup {
  found: boolean;
  customer: Customer | null;
}

interface HistoryEntry {
  id?: string;
  status?: string;
  toStatus?: string;
  notes?: string | null;
  reason?: string | null;
  createdAt?: string;
}

function OrderFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const form = useModalForm();
  const customersQuery = useQuery({
    queryKey: ["order-select", "customers"],
    queryFn: () => api<PageResult<Customer>>("/customers?page=1&limit=100"),
  });
  const productsQuery = useQuery({
    queryKey: ["order-select", "products"],
    queryFn: () => api<PageResult<Product>>("/products?page=1&limit=100"),
  });
  const customers = customersQuery.data?.items ?? [];
  const products = (productsQuery.data?.items ?? []).filter((product) => product.isActive);
  const dataError = customersQuery.error || productsQuery.error ? errorMessage(customersQuery.error ?? productsQuery.error) : "";

  const [documentQuery, setDocumentQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
  const [lookupMessage, setLookupMessage] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [items, setItems] = useState([{ productId: "", quantity: "" }]);

  async function findCustomer() {
    setLookupError("");
    setLookupMessage("");
    if (!documentQuery.trim()) {
      setLookupError("Informe o CPF ou CNPJ para pesquisar.");
      return;
    }
    try {
      const result = await api<CustomerLookup>(`/customers/by-document?document=${encodeURIComponent(documentQuery.trim())}`);
      if (!result.found || !result.customer) {
        setLookupMessage("Não encontramos um cliente com esse documento.");
        return;
      }
      setSelectedCustomer(result.customer.id);
      setMatchedCustomer(result.customer);
      setLookupMessage(`Cliente localizado: ${result.customer.name}`);
      form.markDirty();
    } catch (reason) {
      setLookupError(errorMessage(reason));
    }
  }

  function updateItem(index: number, patch: Partial<{ productId: string; quantity: string }>) {
    form.markDirty();
    setItems((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const ok = await form.run(async () => {
      await apiMutation<Order>(
        "orders",
        "POST",
        {
          customerId: selectedCustomer,
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          customerNotes: String(data.get("customerNotes") ?? "").trim() || undefined,
        },
        { "idempotency-key": crypto.randomUUID() },
      );
    }, errorMessage);
    if (ok) {
      onSaved();
      onClose();
    }
  }

  return (
    <FormModal
      open
      onClose={onClose}
      title="Novo pedido"
      description="O pedido começa em PENDING e reserva o estoque no backend, usando o preço atual do produto."
      size="drawer"
      onSubmit={(event) => void submit(event)}
      submitLabel="Criar pedido"
      submittingLabel="Criando..."
      submitting={form.submitting}
      submitDisabled={Boolean(dataError)}
      error={form.error}
      dirty={form.dirty}
      onDirty={form.markDirty}
    >
      <div className="field-grid">
        {dataError && <div className="notice error-notice field-wide" role="alert">{dataError}</div>}
        <div className="field field-wide">
          Buscar cliente por CPF/CNPJ
          <div className="inline-form">
            <input className="input" value={documentQuery} onChange={(event) => setDocumentQuery(event.target.value)} aria-label="CPF ou CNPJ do cliente" />
            <button className="button button-secondary" type="button" onClick={() => void findCustomer()}>Localizar</button>
          </div>
        </div>
        {lookupMessage && <div className="notice field-wide" role="status">{lookupMessage}</div>}
        {lookupError && <div className="notice error-notice field-wide" role="alert">{lookupError}</div>}
        <label className="field field-wide">Cliente
          <select className="select" required value={selectedCustomer} onChange={(event) => { form.markDirty(); setSelectedCustomer(event.target.value); }}>
            <option value="" disabled>Selecione um cliente existente</option>
            {matchedCustomer && !customers.some((customer) => customer.id === matchedCustomer.id) && (
              <option value={matchedCustomer.id}>{matchedCustomer.name} · {matchedCustomer.documentNumber}</option>
            )}
            {customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name} · {customer.documentNumber}</option>)}
          </select>
        </label>
        {items.map((item, index) => (
          <div className="field-grid field-wide" key={index}>
            <label className="field">Produto
              <select className="select" required value={item.productId} onChange={(event) => updateItem(index, { productId: event.target.value })}>
                <option value="" disabled>Selecione um produto ativo</option>
                {products.map((product) => (
                  <option value={product.id} key={product.id}>{product.name}{product.sku ? ` · ${product.sku}` : ""} · {formatCurrency(product.price)}/{product.unit}</option>
                ))}
              </select>
            </label>
            <label className="field">Quantidade
              <input
                className="input"
                required
                inputMode="decimal"
                pattern="(?:0|[1-9]\d{0,10})(?:\.\d{1,3})?"
                value={item.quantity}
                onChange={(event) => updateItem(index, { quantity: event.target.value })}
              />
            </label>
            {items.length > 1 && (
              <div className="form-actions">
                <button className="button button-secondary button-small" type="button" onClick={() => setItems((current) => current.filter((_, i) => i !== index))}>
                  <Trash2 size={14} aria-hidden="true" /> Remover item
                </button>
              </div>
            )}
          </div>
        ))}
        <div className="form-actions field-wide">
          <button className="button button-secondary" type="button" onClick={() => setItems((current) => [...current, { productId: "", quantity: "" }])}>
            <Plus size={16} aria-hidden="true" /> Adicionar item
          </button>
        </div>
        <label className="field field-wide">Observações (opcional)
          <textarea className="textarea" name="customerNotes" maxLength={2000} />
        </label>
      </div>
    </FormModal>
  );
}

function OrderDetailsModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const detailQuery = useQuery({ queryKey: ["order-detail", order.id], queryFn: () => api<Order>(`/orders/${order.id}`) });
  const historyQuery = useQuery({
    queryKey: ["order-history", order.id],
    queryFn: () => api<HistoryEntry[] | PageResult<HistoryEntry>>(`/orders/${order.id}/history`),
  });
  const detail = detailQuery.data ?? order;
  const history = Array.isArray(historyQuery.data) ? historyQuery.data : (historyQuery.data?.items ?? []);
  const error = detailQuery.error || historyQuery.error ? errorMessage(detailQuery.error ?? historyQuery.error) : "";

  return (
    <Modal
      open
      onClose={onClose}
      title="Detalhes do pedido"
      description={`${detail.customerNameSnapshot} · ${detail.customerDocumentSnapshot}`}
      size="lg"
      footer={(close) => <button className="button button-secondary" type="button" onClick={close}>Fechar</button>}
    >
      {error && <div className="notice error-notice" role="alert">{error}</div>}
      <p>
        <span className={`status-badge ${statusTone(detail.status)}`}>{statusLabel(detail.status)}</span>{" "}
        Total: <strong>{formatCurrency(detail.totalAmount)}</strong>
      </p>
      <h3 className="panel-title">Itens</h3>
      {detailQuery.isLoading ? <p className="panel-subtitle">Carregando...</p> : (
        <ul>
          {(detail.items ?? []).map((item, index) => <li key={index}>{item.productNameSnapshot} — {item.quantity}</li>)}
          {!detail.items?.length && <li>Nenhum item.</li>}
        </ul>
      )}
      <h3 className="panel-title">Histórico</h3>
      {historyQuery.isLoading ? <p className="panel-subtitle">Carregando...</p> : (
        <ul>
          {history.map((entry, index) => (
            <li key={entry.id ?? index}>
              {statusLabel(entry.toStatus ?? entry.status ?? "")} {entry.createdAt ? `· ${entry.createdAt}` : ""} {entry.notes ?? entry.reason ?? ""}
            </li>
          ))}
          {!history.length && <li>Sem registros.</li>}
        </ul>
      )}
    </Modal>
  );
}

type Dialog = { kind: "create" } | { kind: "details"; order: Order } | { kind: "cancel"; order: Order };

export function OrdersListPage() {
  const can = useCan();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);

  return (
    <ApiListPage<Order>
      title="Pedidos"
      description="A API identifica o vendedor pela sessão, calcula os totais e reserva estoque ao criar o pedido."
      endpoint="orders"
      searchable={false}
      columns={[
        { key: "customerNameSnapshot", label: "Cliente", primary: true },
        { key: "customerDocumentSnapshot", label: "CPF/CNPJ" },
        {
          key: "status",
          label: "Status",
          render: (value) => <span className={`status-badge ${statusTone(String(value))}`}>{statusLabel(String(value))}</span>,
        },
        { key: "totalAmount", label: "Total", render: (value) => formatCurrency(String(value)) },
        { key: "createdAt", label: "Criado em" },
      ]}
      actions={() =>
        can("orders.create") && (
          <button className="button" type="button" onClick={() => setDialog({ kind: "create" })}>
            <Plus size={16} aria-hidden="true" /> Novo pedido
          </button>
        )
      }
      toolbar={(reload) => (
        <>
          {dialog?.kind === "create" && <OrderFormModal onClose={close} onSaved={reload} />}
          {dialog?.kind === "details" && <OrderDetailsModal key={dialog.order.id} order={dialog.order} onClose={close} />}
          <ConfirmDialog
            open={dialog?.kind === "cancel"}
            title="Cancelar pedido"
            message={dialog?.kind === "cancel" ? `Deseja cancelar o pedido de ${dialog.order.customerNameSnapshot}? O estoque reservado será liberado.` : ""}
            confirmLabel="Cancelar pedido"
            danger
            onClose={close}
            onConfirm={async () => {
              if (dialog?.kind !== "cancel") return;
              await apiMutation(`orders/${dialog.order.id}/cancel`, "POST", {});
              reload();
            }}
          />
        </>
      )}
      rowActions={(order) => (
        <>
          <button className="button button-secondary button-small" type="button" onClick={() => setDialog({ kind: "details", order })}>
            Detalhes
          </button>
          {can("orders.cancel") && !["CANCELLED", "DELIVERED", "IN_TRANSIT"].includes(order.status) && (
            <button className="button button-secondary button-small" type="button" onClick={() => setDialog({ kind: "cancel", order })}>
              Cancelar
            </button>
          )}
        </>
      )}
    />
  );
}
