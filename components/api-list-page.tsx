"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage, queryString, type PageResult } from "@/lib/api/client";
import { PageHeading } from "@/components/page-heading";

export type TableRow = { id: string } & Record<string, unknown>;

export function ApiListPage<T extends TableRow>({
  title,
  eyebrow,
  description,
  endpoint,
  columns,
  toolbar,
  actions,
  rowActions,
  emptyMessage = "Ainda não há registros para exibir.",
  initialParams = {},
  searchable = false,
  searchPlaceholder = "Nome, identificador...",
  inlineError,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  endpoint: string;
  columns: {
    key: string;
    label: string;
    primary?: boolean;
    render?: (value: unknown, row: T) => React.ReactNode;
  }[];
  toolbar?: (reload: () => void) => React.ReactNode;
  /** Botões principais no canto superior direito do cabeçalho. */
  actions?: (reload: () => void) => React.ReactNode;
  rowActions?: (row: T, reload: () => void) => React.ReactNode;
  emptyMessage?: string;
  initialParams?: Record<string, string | undefined>;
  searchable?: boolean;
  searchPlaceholder?: string;
  inlineError?: string;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const [settledSearch, setSettledSearch] = useState(search);
  const parameterString = queryString({ ...initialParams, ...(searchable ? { search: settledSearch || undefined } : {}) });
  const reload = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["api-list", endpoint] });
  }, [endpoint, queryClient]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSettledSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const resultQuery = useQuery({
    queryKey: ["api-list", endpoint, page, parameterString],
    queryFn: ({ signal }) => {
    const params = new URLSearchParams(parameterString.slice(1));
    params.set("page", String(page));
    params.set("limit", "10");
      return api<PageResult<T>>(`${endpoint}?${params.toString()}`, { signal });
    },
  });
  const result = resultQuery.data ?? null;
  const loading = resultQuery.isPending;
  const error = resultQuery.error ? errorMessage(resultQuery.error) : "";

  return (
    <>
      <PageHeading title={title} eyebrow={eyebrow} description={description} action={actions ? <div className="page-actions">{actions(reload)}</div> : undefined} />
      {toolbar?.(reload)}
      {inlineError && <div className="notice error-notice" role="alert" style={{ marginBottom: 14 }}>{inlineError}</div>}
      <section className="table-panel" aria-label={`${title}: registros`}>
        {searchable && (
          <div className="table-toolbar">
            <label className="field" style={{ minWidth: 230 }}>
              Pesquisar
              <input
                className="input"
                type="search"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </label>
          </div>
        )}
        {error ? (
          <div className="empty-state" role="alert">
            <strong>Não foi possível carregar os dados</strong>
            {error}
          </div>
        ) : loading ? (
          <div className="loading-state" role="status">
            <span className="spinner" aria-hidden="true" /> Carregando dados...
          </div>
        ) : !result?.items.length ? (
          <div className="empty-state">
            <strong>Nenhum registro encontrado</strong>
            {emptyMessage}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} scope="col">{column.label}</th>
                  ))}
                  {rowActions && <th scope="col">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {result.items.map((row) => (
                  <tr key={row.id}>
                    {columns.map((column) => (
                      <td key={column.key}>
                        {column.render
                          ? column.render(row[column.key], row)
                          : formatCell(row[column.key], column.primary ?? false)}
                      </td>
                    ))}
                    {rowActions && (
                      <td>
                        <div className="table-actions">{rowActions(row, reload)}</div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {result && (
          <div className="table-footer">
            <span>
              Página {result.page} · {result.total} registro(s)
            </span>
            <div className="pagination-actions">
              <button
                className="button button-secondary button-small"
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Anterior
              </button>
              <button
                className="button button-secondary button-small"
                type="button"
                disabled={page * result.limit >= result.total || loading}
                onClick={() => setPage((current) => current + 1)}
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function formatCell(value: unknown, primary: boolean): React.ReactNode {
  let text: string;
  if (value === null || value === undefined || value === "") {
    text = "—";
  } else if (typeof value === "boolean") {
    text = value ? "Ativo" : "Inativo";
  } else if (typeof value === "string" && /^\d{4}-\d\d-\d\dT/.test(value)) {
    text = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } else if (typeof value === "string" || typeof value === "number") {
    text = String(value);
  } else if (Array.isArray(value)) {
    text = value
      .map((item) => {
        if (item && typeof item === "object" && "slug" in item && typeof item.slug === "string") {
          return item.slug;
        }
        return "";
      })
      .filter(Boolean)
      .join(", ") || "—";
  } else {
    text = "—";
  }
  if (primary) return <span className="cell-primary">{text}</span>;
  if (typeof value === "boolean") {
    return (
      <span className={`status-badge ${value ? "status-success" : "status-danger"}`}>
        {text}
      </span>
    );
  }
  return text;
}
