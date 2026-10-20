"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, errorMessage, type PageResult } from "@/lib/api/client";
import { PageHeading } from "@/components/page-heading";
import { formatCurrency, formatDate, statusLabel, statusTone } from "@/lib/utils/format";

interface Product {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
}

interface Order {
  id: string;
  status: string;
  customerNameSnapshot: string;
  totalAmount: string;
  createdAt: string;
}

interface SummaryValue {
  total: number | null;
  error: string;
}

export default function DashboardPage() {
  const productsQuery = useQuery({
    queryKey: ["dashboard", "products"],
    queryFn: () => api<PageResult<Product>>("/products?page=1&limit=1"),
    staleTime: 0,
  });
  const customersQuery = useQuery({
    queryKey: ["dashboard", "customers"],
    queryFn: () => api<PageResult<Customer>>("/customers?page=1&limit=1"),
    staleTime: 0,
  });
  const ordersQuery = useQuery({
    queryKey: ["dashboard", "orders"],
    queryFn: () => api<PageResult<Order>>("/orders?page=1&limit=5"),
    staleTime: 0,
  });
  const products = summary(productsQuery.data?.total ?? null, productsQuery.error);
  const customers = summary(customersQuery.data?.total ?? null, customersQuery.error);
  const orders = summary(ordersQuery.data?.total ?? null, ordersQuery.error);
  const recentOrders = ordersQuery.data?.items ?? [];

  return (
    <>
      <PageHeading
        eyebrow="VISÃO GERAL"
        title="Painel de operação"
        description="Acompanhe os cadastros e pedidos disponíveis para o seu perfil."
      />
      <div className="metric-grid">
        <Metric label="Produtos cadastrados" value={products.total} error={products.error} />
        <Metric label="Clientes cadastrados" value={customers.total} error={customers.error} />
        <Metric label="Pedidos disponíveis" value={orders.total} error={orders.error} />
        <div className="metric-card">
          <span className="metric-label">Sessão</span>
          <span className="metric-value" style={{ fontSize: 18 }}>Autenticada</span>
        </div>
      </div>
      <div className="dashboard-grid">
        <section className="table-panel">
          <div className="table-toolbar">
            <div>
              <h2>Pedidos recentes</h2>
              <p className="panel-subtitle">Registros retornados pela API.</p>
            </div>
            <Link className="button button-secondary button-small" href="/pedidos">Ver pedidos</Link>
          </div>
          {orders.error ? (
            <div className="empty-state" role="status">
              <strong>Pedidos indisponíveis</strong>{orders.error}
            </div>
          ) : recentOrders.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Cliente</th><th>Status</th><th>Total</th><th>Data</th></tr></thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td><span className="cell-primary">{order.customerNameSnapshot}</span></td>
                      <td><span className={`status-badge ${statusTone(order.status)}`}>{statusLabel(order.status)}</span></td>
                      <td>{formatCurrency(order.totalAmount)}</td>
                      <td>{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <strong>Nenhum pedido recente</strong>
              {orders.total === null ? "Aguardando a consulta da API." : "Os pedidos aparecerão aqui quando forem criados."}
            </div>
          )}
        </section>
        <section className="panel">
          <h2 className="panel-title">Acesso rápido</h2>
          <p className="panel-subtitle">Abra uma área para consultar ou registrar informações.</p>
          <div className="shortcut-list">
            <Shortcut href="/pedidos" label="Criar ou acompanhar pedido" />
            <Shortcut href="/produtos" label="Consultar produtos" />
            <Shortcut href="/estoque" label="Ver posição de estoque" />
            <Shortcut href="/logistica" label="Abrir fila logística" />
          </div>
        </section>
      </div>
    </>
  );
}

function summary(total: number | null, error: unknown): SummaryValue {
  return {
    total,
    error: error ? errorMessage(error) : "",
  };
}

function Metric({ label, value, error }: { label: string; value: number | null; error: string }) {
  return (
    <div className="metric-card">
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{error ? "—" : value ?? "…"}</strong>
      {error && <span className="cell-secondary" title={error}>Sem acesso aos dados</span>}
    </div>
  );
}

function Shortcut({ href, label }: { href: string; label: string }) {
  return <Link className="shortcut-link" href={href}>{label}<span aria-hidden="true">→</span></Link>;
}
