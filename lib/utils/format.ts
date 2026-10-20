export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "Pendente",
    PROCESSING: "Em processamento",
    READY_FOR_SHIPMENT: "Pronto para expedição",
    IN_TRANSIT: "Em trânsito",
    DELIVERED: "Entregue",
    CANCELLED: "Cancelado",
  };
  return labels[status] ?? status;
}

export function statusTone(status: string): string {
  if (status === "DELIVERED") return "status-success";
  if (status === "CANCELLED") return "status-danger";
  if (status === "PENDING" || status === "READY_FOR_SHIPMENT") return "status-warning";
  return "";
}

export function formatCurrency(value: string): string {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount)
    : value;
}

export function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}
