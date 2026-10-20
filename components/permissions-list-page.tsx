"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { ApiListPage } from "@/components/api-list-page";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FormModal, useModalForm } from "@/components/modal";
import { RowActionsMenu } from "@/components/row-actions-menu";
import { apiMutation, errorMessage } from "@/lib/api/client";
import { useCan } from "@/lib/auth/use-can";

interface PermissionRow extends Record<string, unknown> {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
}

type Dialog = { kind: "form"; permission: PermissionRow | null } | { kind: "delete"; permission: PermissionRow };

function PermissionFormModal({
  permission,
  onClose,
  onSaved,
}: {
  permission: PermissionRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useModalForm();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name")).trim();
    const description = String(data.get("description")).trim();
    const ok = await form.run(
      () =>
        permission
          ? apiMutation(`permissions/${permission.id}`, "PATCH", { name, description })
          : apiMutation("permissions", "POST", {
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
      title={permission ? "Editar permissão" : "Nova permissão"}
      description={permission ? "O identificador (slug) não pode ser alterado." : "Ex.: orders.read — módulo e ação separados por ponto."}
      onSubmit={(event) => void submit(event)}
      submitLabel={permission ? "Salvar alterações" : "Criar permissão"}
      submitting={form.submitting}
      error={form.error}
      dirty={form.dirty}
      onDirty={form.markDirty}
    >
      <label className="field">Nome
        <input className="input" name="name" required maxLength={100} defaultValue={permission?.name ?? ""} autoFocus />
      </label>
      <label className="field">Slug
        <input className="input" name="slug" required pattern="^[a-z][a-z0-9]*(?:[.\-][a-z0-9]+)*$" maxLength={100} defaultValue={permission?.slug ?? ""} readOnly={!!permission} />
      </label>
      <label className="field">Descrição
        <textarea className="input" name="description" rows={3} maxLength={255} defaultValue={permission?.description ?? ""} />
      </label>
    </FormModal>
  );
}

export function PermissionsListPage() {
  const can = useCan();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);

  return (
    <ApiListPage<PermissionRow>
      title="Permissões"
      description="Catálogo de permissões que definem as operações autorizadas no sistema."
      endpoint="permissions"
      searchable
      searchPlaceholder="Nome ou identificador"
      columns={[
        { key: "name", label: "Nome", primary: true },
        { key: "slug", label: "Identificador" },
        { key: "description", label: "Descrição" },
        {
          key: "isSystem",
          label: "Tipo",
          render: (value) => <span className={`status-badge ${value ? "status-warning" : "status-success"}`}>{value ? "Sistema" : "Personalizada"}</span>,
        },
      ]}
      actions={() =>
        can("permissions.create") && (
          <button className="button" type="button" onClick={() => setDialog({ kind: "form", permission: null })}>
            <Plus size={16} aria-hidden="true" /> Nova permissão
          </button>
        )
      }
      toolbar={(reload) => (
        <>
          {dialog?.kind === "form" && (
            <PermissionFormModal key={dialog.permission?.id ?? "new"} permission={dialog.permission} onClose={close} onSaved={reload} />
          )}
          <ConfirmDialog
            open={dialog?.kind === "delete"}
            title="Excluir permissão"
            message={dialog?.kind === "delete" ? `Excluir a permissão ${dialog.permission.slug}? Permissões associadas a roles não podem ser excluídas.` : ""}
            confirmLabel="Excluir"
            danger
            onClose={close}
            onConfirm={async () => {
              if (dialog?.kind !== "delete") return;
              await apiMutation(`permissions/${dialog.permission.id}`, "DELETE");
              reload();
            }}
          />
        </>
      )}
      rowActions={(permission) => (
        <RowActionsMenu
          label={`Ações para ${permission.name}`}
          actions={[
            { label: "Editar", hidden: !can("permissions.update") || permission.isSystem, onSelect: () => setDialog({ kind: "form", permission }) },
            { label: "Excluir", danger: true, hidden: !can("permissions.delete") || permission.isSystem, onSelect: () => setDialog({ kind: "delete", permission }) },
          ]}
        />
      )}
    />
  );
}
