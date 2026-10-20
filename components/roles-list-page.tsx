"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { ApiListPage } from "@/components/api-list-page";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormModal, useModalForm } from "@/components/modal";
import { RowActionsMenu } from "@/components/row-actions-menu";
import { api, apiMutation, errorMessage, type PageResult } from "@/lib/api/client";
import { useCan } from "@/lib/auth/use-can";

interface PermissionRef {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
}

interface RoleRow extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  permissions: PermissionRef[];
}

type Dialog =
  | { kind: "form"; role: RoleRow | null }
  | { kind: "permissions"; role: RoleRow }
  | { kind: "delete"; role: RoleRow };

function RoleFormModal({ role, onClose, onSaved }: { role: RoleRow | null; onClose: () => void; onSaved: () => void }) {
  const form = useModalForm();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name")).trim();
    const description = String(data.get("description")).trim();
    const ok = await form.run(
      () =>
        role
          ? apiMutation(`roles/${role.id}`, "PATCH", { name, description })
          : apiMutation("roles", "POST", {
              name,
              slug: String(data.get("slug")).trim(),
              description: description || undefined,
            }),
      errorMessage,
    );
    if (ok) {
      onSaved();
      onClose();
    }
  }

  return (
    <FormModal
      open
      onClose={onClose}
      title={role ? "Editar role" : "Nova role"}
      description={role ? "O identificador (slug) não pode ser alterado." : "Defina o nome, o identificador e a descrição do papel."}
      onSubmit={(event) => void submit(event)}
      submitLabel={role ? "Salvar alterações" : "Criar role"}
      submitting={form.submitting}
      error={form.error}
      dirty={form.dirty}
      onDirty={form.markDirty}
    >
      <label className="field">Nome
        <input className="input" name="name" required maxLength={100} defaultValue={role?.name ?? ""} autoFocus />
      </label>
      <label className="field">Slug
        <input className="input" name="slug" required pattern="^[a-z][a-z0-9\-]*$" maxLength={100} defaultValue={role?.slug ?? ""} readOnly={!!role} />
        <span className="field-hint">Minúsculas, números e hífen; começa com letra.</span>
      </label>
      <label className="field">Descrição
        <textarea className="input" name="description" rows={3} maxLength={255} defaultValue={role?.description ?? ""} />
      </label>
    </FormModal>
  );
}

/** O backend vincula permissões uma a uma; aplicamos apenas o diferencial. */
function RolePermissionsModal({
  role,
  permissions,
  onClose,
  onSaved,
}: {
  role: RoleRow;
  permissions: PermissionRef[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useModalForm();
  const initial = useMemo(() => role.permissions.map((permission) => permission.id), [role]);
  const [selected, setSelected] = useState<string[]>(initial);
  const [filter, setFilter] = useState("");

  const term = filter.trim().toLowerCase();
  const groups = useMemo(() => {
    const map = new Map<string, PermissionRef[]>();
    for (const permission of permissions) {
      if (term && !`${permission.name} ${permission.slug}`.toLowerCase().includes(term)) continue;
      const module = permission.slug.split(".")[0];
      map.set(module, [...(map.get(module) ?? []), permission]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [permissions, term]);

  const toAdd = selected.filter((id) => !initial.includes(id));
  const toRemove = initial.filter((id) => !selected.includes(id));
  const changed = toAdd.length + toRemove.length > 0;

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await form.run(async () => {
      for (const permissionId of toRemove) await apiMutation(`roles/${role.id}/permissions/${permissionId}`, "DELETE");
      for (const permissionId of toAdd) await apiMutation(`roles/${role.id}/permissions`, "POST", { permissionId });
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
      title="Gerenciar permissões"
      description={`Permissões da role ${role.name}, organizadas por módulo.`}
      size="lg"
      onSubmit={(event) => void submit(event)}
      submitLabel="Salvar alterações"
      submitting={form.submitting}
      submitDisabled={!changed}
      error={form.error}
      dirty={changed}
      onDirty={() => undefined}
    >
      <input className="input" type="search" placeholder="Buscar permissão" aria-label="Buscar permissão" value={filter} onChange={(event) => setFilter(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} />
      {groups.map(([module, items]) => (
        <div key={module} className="check-list" role="group" aria-label={module}>
          <p className="check-group-title">{module}</p>
          {items.map((permission) => {
            const checked = selected.includes(permission.id);
            return (
              <label key={permission.id} className={`check-item ${checked ? "check-item-selected" : ""}`}>
                <input type="checkbox" checked={checked} onChange={() => toggle(permission.id)} />
                <span>
                  <strong>{permission.name}</strong>
                  <small>{permission.slug}{permission.description ? ` · ${permission.description}` : ""}</small>
                </span>
              </label>
            );
          })}
        </div>
      ))}
      {!groups.length && <p className="selection-summary">Nenhuma permissão encontrada.</p>}
      <p className="selection-summary">{selected.length} permissão(ões) após salvar.</p>
    </FormModal>
  );
}

export function RolesListPage() {
  const can = useCan();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);
  const permissionsQuery = useQuery({
    queryKey: ["permission-options"],
    queryFn: ({ signal }) => api<PageResult<PermissionRef>>("permissions?page=1&limit=100", { signal }),
    staleTime: 60_000,
    enabled: dialog?.kind === "permissions",
  });

  return (
    <ApiListPage<RoleRow>
      title="Roles"
      description="Gerencie os papéis e as permissões associadas a cada um."
      endpoint="roles"
      columns={[
        { key: "name", label: "Nome", primary: true },
        { key: "slug", label: "Slug" },
        { key: "description", label: "Descrição" },
        {
          key: "isSystem",
          label: "Tipo",
          render: (value) => <span className={`status-badge ${value ? "status-warning" : "status-success"}`}>{value ? "Sistema" : "Personalizada"}</span>,
        },
      ]}
      actions={() =>
        can("roles.create") && (
          <button className="button" type="button" onClick={() => setDialog({ kind: "form", role: null })}>
            <Plus size={16} aria-hidden="true" /> Nova role
          </button>
        )
      }
      toolbar={(reload) => (
        <>
          {dialog?.kind === "form" && <RoleFormModal key={dialog.role?.id ?? "new"} role={dialog.role} onClose={close} onSaved={reload} />}
          {dialog?.kind === "permissions" && permissionsQuery.data && (
            <RolePermissionsModal key={dialog.role.id} role={dialog.role} permissions={permissionsQuery.data.items} onClose={close} onSaved={reload} />
          )}
          <ConfirmDialog
            open={dialog?.kind === "delete"}
            title="Excluir role"
            message={dialog?.kind === "delete" ? `Excluir a role ${dialog.role.name}? Roles com usuários associados não podem ser excluídas.` : ""}
            confirmLabel="Excluir"
            danger
            onClose={close}
            onConfirm={async () => {
              if (dialog?.kind !== "delete") return;
              await apiMutation(`roles/${dialog.role.id}`, "DELETE");
              reload();
            }}
          />
        </>
      )}
      rowActions={(role) => (
        <RowActionsMenu
          label={`Ações para ${role.name}`}
          actions={[
            { label: "Gerenciar permissões", hidden: !can("roles.assign") || role.isSystem, onSelect: () => setDialog({ kind: "permissions", role }) },
            { label: "Editar", hidden: !can("roles.update") || role.isSystem, onSelect: () => setDialog({ kind: "form", role }) },
            { label: "Excluir", danger: true, hidden: !can("roles.delete") || role.isSystem, onSelect: () => setDialog({ kind: "delete", role }) },
          ]}
        />
      )}
    />
  );
}
