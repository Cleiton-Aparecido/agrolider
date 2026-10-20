"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { FormModal, useModalForm } from "@/components/modal";
import { ApiListPage } from "@/components/api-list-page";
import { api, apiMutation, errorMessage, type PageResult } from "@/lib/api/client";
import { useCan } from "@/lib/auth/use-can";
import type { UserRow } from "@/components/user-modals";

interface RoleOption {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

/** PUT /users/:id/roles substitui todas as roles; sempre enviamos a lista final de IDs. */
function saveUserRoles(userId: string, roleIds: string[]) {
  return apiMutation<void>(`users/${userId}/roles`, "PUT", { roleIds });
}

function UserRolesModal({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user: UserRow;
  roles: RoleOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useModalForm();
  const initial = useMemo(() => (user.roles ?? []).map((role) => role.id), [user]);
  const [selected, setSelected] = useState<string[]>(initial);
  const [filter, setFilter] = useState("");

  const term = filter.trim().toLowerCase();
  const visible = roles.filter((role) => !term || `${role.name} ${role.slug}`.toLowerCase().includes(term));
  const changed = selected.length !== initial.length || selected.some((id) => !initial.includes(id));

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
    form.markDirty();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await form.run(() => saveUserRoles(user.id, selected), errorMessage);
    if (ok) {
      onSaved();
      onClose();
    }
  }

  return (
    <FormModal
      open
      onClose={onClose}
      title="Gerenciar roles do usuário"
      description="Marque as roles que o usuário deve possuir. Roles desmarcadas serão removidas ao salvar."
      size="lg"
      onSubmit={(event) => void submit(event)}
      submitLabel="Salvar alterações"
      submitting={form.submitting}
      submitDisabled={!changed}
      error={form.error}
      dirty={form.dirty && changed}
      onDirty={() => undefined}
    >
      <div className="user-summary">
        <strong>{user.name}</strong>
        <span>{user.email}</span>
      </div>
      {roles.length > 6 && (
        <input className="input" type="search" placeholder="Buscar role" aria-label="Buscar role" value={filter} onChange={(event) => setFilter(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} />
      )}
      <div className="check-list" role="group" aria-label="Roles disponíveis">
        {visible.map((role) => {
          const checked = selected.includes(role.id);
          return (
            <label key={role.id} className={`check-item ${checked ? "check-item-selected" : ""}`}>
              <input type="checkbox" checked={checked} onChange={() => toggle(role.id)} />
              <span>
                <strong>{role.name}</strong>
                <small>{role.slug}{role.description ? ` · ${role.description}` : ""}</small>
              </span>
            </label>
          );
        })}
        {!visible.length && <p className="selection-summary">Nenhuma role encontrada.</p>}
      </div>
      <p className="selection-summary">{selected.length} role(s) selecionada(s) após salvar.</p>
    </FormModal>
  );
}

export function UserRolesPage() {
  const can = useCan();
  const [managing, setManaging] = useState<UserRow | null>(null);
  const rolesQuery = useQuery({
    queryKey: ["role-options"],
    queryFn: ({ signal }) => api<PageResult<RoleOption>>("roles?page=1&limit=100", { signal }),
    staleTime: 60_000,
  });

  return (
    <ApiListPage<UserRow>
      title="Usuários e Roles"
      description="Gerencie os papéis e níveis de acesso atribuídos a cada usuário."
      endpoint="users"
      searchable
      searchPlaceholder="Nome ou e-mail"
      columns={[
        { key: "name", label: "Usuário", primary: true },
        { key: "email", label: "E-mail" },
        {
          key: "roles",
          label: "Roles associadas",
          render: (_value, row) =>
            row.roles?.length ? (
              <div className="badge-list">
                {row.roles.map((role) => <span key={role.id} className="role-badge">{role.name}</span>)}
              </div>
            ) : (
              <span className="role-badge role-badge-muted">Sem roles</span>
            ),
        },
      ]}
      toolbar={(reload) => (
        <>
          {rolesQuery.isError && (
            <p className="notice error-notice" role="alert">
              Não foi possível carregar as roles: {errorMessage(rolesQuery.error)}{" "}
              <button type="button" className="button button-secondary button-small" onClick={() => void rolesQuery.refetch()}>
                Tentar novamente
              </button>
            </p>
          )}
          {managing && rolesQuery.data && (
            <UserRolesModal key={managing.id} user={managing} roles={rolesQuery.data.items} onClose={() => setManaging(null)} onSaved={reload} />
          )}
        </>
      )}
      rowActions={(user) =>
        can("roles.assign") && (
          <button type="button" className="button button-secondary button-small" disabled={!rolesQuery.data} onClick={() => setManaging(user)}>
            Gerenciar roles
          </button>
        )
      }
    />
  );
}
