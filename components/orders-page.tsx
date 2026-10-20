"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiListPage, type TableRow } from "@/components/api-list-page";
import { api, apiMutation, errorMessage, type PageResult } from "@/lib/api/client";
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
  items: { productNameSnapshot: string; quantity: string }[];
}

interface CustomerLookup {
  found: boolean;
  customer: Customer | null;
}

export function OrdersPage() {
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
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
  const lookupDataError = customersQuery.error || productsQuery.error
    ? errorMessage(customersQuery.error ?? productsQuery.error)
    : "";
  const [lookupError, setLookupError] = useState("");
  const [documentQuery, setDocumentQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [lookupMessage, setLookupMessage] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([{ productId: "", quantity: "" }]);

  async function createOrder(event: FormEvent<HTMLFormElement>, reload: () => void) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setError("");
    try {
      await apiMutation<Order>(
        "orders",
        "POST",
        {
          customerId: selectedCustomer,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          customerNotes: String(form.get("customerNotes") ?? "").trim() || undefined,
        },
        { "idempotency-key": crypto.randomUUID() },
      );
      setFormOpen(false);
      formElement.reset();
      setSelectedCustomer("");
      setMatchedCustomer(null);
      setDocumentQuery("");
      setLookupMessage("");
      setItems([{ productId: "", quantity: "" }]);
      reload();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }

  }

  async function findCustomerByDocument() {
    setLookupError("");
    setLookupMessage("");
    if (!documentQuery.trim()) {
      setLookupError("Informe o CPF ou CNPJ para pesquisar.");
      return;
    }
    try {
      const result = await api<CustomerLookup>(
        `/customers/by-document?document=${encodeURIComponent(documentQuery.trim())}`,
      );
      if (!result.found || !result.customer) {
        setLookupMessage("Não encontramos um cliente com esse documento.");
        return;
      }
      setSelectedCustomer(result.customer.id);
      setMatchedCustomer(result.customer);
      setLookupMessage(`Cliente localizado: ${result.customer.name}`);
    } catch (reason) {
      setLookupError(errorMessage(reason));
    }
  }

  return (
    <ApiListPage<Order>
      title="Pedidos"
      description="A API identifica o vendedor pela sessão, calcula os totais e reserva estoque ao criar o pedido."
      endpoint="orders"
      searchable={false}
      inlineError={error}
      columns={[
        { key: "customerNameSnapshot", label: "Cliente", primary: true },
        { key: "customerDocumentSnapshot", label: "CPF/CNPJ" },
        {
          key: "status",
          label: "Status",
          render: (value) => (
            <span className={`status-badge ${statusTone(String(value))}`}>
              {statusLabel(String(value))}
            </span>
          ),
        },
        {
          key: "totalAmount",
          label: "Total",
          render: (value) => formatCurrency(String(value)),
        },
        { key: "createdAt", label: "Criado em" },
      ]}
      toolbar={(reload) => (
        <>
          <div className="form-actions" style={{ marginBottom: 13 }}>
            <button className="button" type="button" onClick={() => setFormOpen(!formOpen)}>
              {formOpen ? "Fechar formulário" : "Novo pedido"}
            </button>
          </div>
          {formOpen && (
            <section className="form-panel">
              <h2 className="panel-title">Criar pedido</h2>
              <p className="panel-subtitle">O pedido começa em PENDING e reserva o estoque de forma atômica no backend. O preço atual do produto será usado.</p>
              <form onSubmit={(event) => void createOrder(event, reload)} style={{ marginTop: 15 }}>
                <div className="field-grid">
                  <div className="field">
                    Buscar cliente por CPF/CNPJ
                    <div className="inline-form">
                      <input className="input" value={documentQuery} onChange={(event) => setDocumentQuery(event.target.value)} aria-label="CPF ou CNPJ do cliente" />
                      <button className="button button-secondary" type="button" onClick={() => void findCustomerByDocument()}>Localizar</button>
                    </div>
                  </div>
                  <label className="field">Cliente
                    <select className="select" required value={selectedCustomer} onChange={(event) => setSelectedCustomer(event.target.value)}>
                      <option value="" disabled>Selecione um cliente existente</option>
                      {matchedCustomer && !customers.some((customer) => customer.id === matchedCustomer.id) && (
                        <option value={matchedCustomer.id} key={matchedCustomer.id}>{matchedCustomer.name} · {matchedCustomer.documentNumber}</option>
                      )}
                      {customers.map((customer) => <option value={customer.id} key={customer.id}>{customer.name} · {customer.documentNumber}</option>)}
                    </select>
                  </label>
                  {lookupMessage && <div className="notice field-wide" role="status">{lookupMessage}</div>}
                  {(lookupError || lookupDataError) && <div className="notice error-notice field-wide" role="alert">{lookupError || lookupDataError}</div>}
                  {items.map((item, index) => (
                    <div className="field-grid field-wide" key={index}>
                      <label className="field">Produto
                        <select
                          className="select"
                          required
                          value={item.productId}
                          onChange={(event) => setItems((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, productId: event.target.value } : line))}
                        >
                          <option value="" disabled>Selecione um produto ativo</option>
                          {products.map((product) => <option value={product.id} key={product.id}>{product.name}{product.sku ? ` · ${product.sku}` : ""} · {formatCurrency(product.price)}/{product.unit}</option>)}
                        </select>
                      </label>
                      <label className="field">Quantidade
                        <input
                          className="input"
                          inputMode="decimal"
                          pattern="(?:0|[1-9]\d{0,10})(?:\.\d{1,3})?"
                          placeholder="0.000"
                          required
                          value={item.quantity}
                          onChange={(event) => setItems((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, quantity: event.target.value } : line))}
                        />
                      </label>
                      {items.length > 1 && (
                        <button className="button button-secondary button-small" type="button" onClick={() => setItems((current) => current.filter((_, lineIndex) => lineIndex !== index))}>
                          Remover item
                        </button>
                      )}
                    </div>
                  ))}
                  <button className="button button-secondary button-small" type="button" onClick={() => setItems((current) => [...current, { productId: "", quantity: "" }])}>
                    Adicionar produto
                  </button>
                  <label className="field field-wide">Observações do cliente
                    <textarea className="textarea" name="customerNotes" maxLength={5000} />
                  </label>
                </div>
                {error && <div className="notice error-notice" role="alert">{error}</div>}
                <div className="form-actions">
                  <button className="button button-secondary" type="button" onClick={() => setFormOpen(false)}>Cancelar</button>
                  <button className="button" type="submit" disabled={saving || !selectedCustomer || !products.length}>{saving ? "Enviando..." : "Criar pedido"}</button>
                </div>
              </form>
            </section>
          )}
        </>
      )}
      rowActions={(order, reload) => (
        <>
          <button
            type="button"
            className="button button-small button-secondary"
            onClick={() => {
              void Promise.all([
                api<{ status: string; totalAmount: string; items: Order["items"] }>(`orders/${order.id}`),
                api<{ newStatus: string; createdAt: string; notes: string | null }[]>(`orders/${order.id}/history`),
              ])
                .then(([detail, history]) => window.alert(
                  `${statusLabel(detail.status)} · ${formatCurrency(detail.totalAmount)}\n${detail.items.map((item) => `${item.productNameSnapshot}: ${item.quantity}`).join("\n")}\n\nHistórico:\n${history.map((event) => `${statusLabel(event.newStatus)} · ${new Date(event.createdAt).toLocaleString("pt-BR")}${event.notes ? ` · ${event.notes}` : ""}`).join("\n")}`,
                ))
                .catch((reason: unknown) => setError(errorMessage(reason)));
            }}
          >
            Detalhes
          </button>
          {order.status !== "CANCELLED" && order.status !== "DELIVERED" && order.status !== "IN_TRANSIT" && (
            <button
              type="button"
              className="button button-small button-danger"
              onClick={() => {
                if (!window.confirm("Deseja cancelar este pedido? A API liberará a reserva de estoque.")) return;
                void apiMutation(`orders/${order.id}/cancel`, "POST", {})
                  .then(reload)
                  .catch((reason: unknown) => setError(errorMessage(reason)));
              }}
            >
              Cancelar
            </button>
          )}
        </>
      )}
    />
  );
}
