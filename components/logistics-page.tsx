"use client";

import { useState } from "react";
import { ApiListPage, type TableRow } from "@/components/api-list-page";
import { apiMutation, errorMessage } from "@/lib/api/client";
import { statusLabel } from "@/lib/utils/format";

interface LogisticOrder extends TableRow {
  status: string;
  customerNameSnapshot: string;
  totalAmount: string;
}

export function LogisticsPage() {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  return (
    <ApiListPage<LogisticOrder>
      title="Painel logístico"
      eyebrow="LOGÍSTICA"
      inlineError={error}
      description="Fila de pedidos com transições controladas pelo backend e permitidas somente aos perfis autorizados."
      endpoint="logistics/orders"
      initialParams={{ status: status || undefined }}
      columns={[
        { key: "customerNameSnapshot", label: "Cliente", primary: true },
        { key: "status", label: "Status" },
        { key: "totalAmount", label: "Total" },
      ]}
      toolbar={() => (
        <>
          <div className="inline-form" style={{ marginBottom: 14 }}>
            <label className="field">Filtrar por status
              <select className="select" value={status} onChange={(event) => { setStatus(event.target.value); }}>
                <option value="">Todos</option>
                <option value="PENDING">Pendente</option>
                <option value="PROCESSING">Em processamento</option>
                <option value="READY_FOR_SHIPMENT">Pronto para expedição</option>
                <option value="IN_TRANSIT">Em trânsito</option>
                <option value="DELIVERED">Entregue</option>
              </select>
            </label>
          </div>
        </>
      )}
      rowActions={(order, reload) => {
        const action =
          order.status === "PENDING" ? "start-processing" :
          order.status === "PROCESSING" ? "ready-for-shipment" :
          order.status === "READY_FOR_SHIPMENT" ? "dispatch" :
          order.status === "IN_TRANSIT" ? "confirm-delivery" : null;
        const labels: Record<string, string> = {
          "start-processing": "Iniciar preparação",
          "ready-for-shipment": "Pronto para expedição",
          dispatch: "Despachar",
          "confirm-delivery": "Confirmar entrega",
        };
        if (!action) return <span className="status-badge">{statusLabel(order.status)}</span>;
        return (
          <button
            type="button"
            className="button button-small"
            onClick={() => {
              void apiMutation(`logistics/orders/${order.id}/${action}`, "POST", {})
                .then(reload)
                .catch((reason: unknown) => setError(errorMessage(reason)));
            }}
          >
            {labels[action]}
          </button>
        );
      }}
    />
  );
}
