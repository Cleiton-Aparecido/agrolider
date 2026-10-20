"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ApiListPage } from "@/components/api-list-page";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RowActionsMenu } from "@/components/row-actions-menu";
import { ResetPasswordModal, UserFormModal, type UserRow } from "@/components/user-modals";
import { apiMutation } from "@/lib/api/client";
import { useCan } from "@/lib/auth/use-can";

type Dialog =
  | { kind: "form"; user: UserRow | null }
  | { kind: "password"; user: UserRow }
  | { kind: "status"; user: UserRow }
  | { kind: "delete"; user: UserRow };

export function UsersListPage() {
  const can = useCan();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);

  return (
    <ApiListPage<UserRow>
      title="Usuários"
      description="Administre as contas de acesso. O backend exige troca de senha no primeiro login e nunca retorna senhas."
      endpoint="users"
      searchable
      searchPlaceholder="Nome ou e-mail"
      columns={[
        { key: "name", label: "Nome", primary: true },
        { key: "email", label: "E-mail" },
        { key: "isActive", label: "Situação" },
        {
          key: "mustChangePassword",
          label: "Primeiro acesso",
          render: (value) => (
            <span className={`status-badge ${value ? "status-warning" : "status-success"}`}>
              {value ? "Troca pendente" : "Concluído"}
            </span>
          ),
        },
        { key: "createAt", label: "Criado em" },
      ]}
      actions={() =>
        can("users.create") && (
          <button className="button" type="button" onClick={() => setDialog({ kind: "form", user: null })}>
            <Plus size={16} aria-hidden="true" /> Novo usuário
          </button>
        )
      }
      toolbar={(reload) => (
        <>
          {dialog?.kind === "form" && (
            <UserFormModal key={dialog.user?.id ?? "new"} user={dialog.user} onClose={close} onSaved={reload} />
          )}
          {dialog?.kind === "password" && <ResetPasswordModal user={dialog.user} onClose={close} onSaved={reload} />}
          <ConfirmDialog
            open={dialog?.kind === "status"}
            title={dialog?.kind === "status" && dialog.user.isActive ? "Desativar usuário" : "Ativar usuário"}
            message={dialog?.kind === "status" ? `Deseja ${dialog.user.isActive ? "desativar" : "ativar"} o usuário ${dialog.user.name}?` : ""}
            confirmLabel={dialog?.kind === "status" && dialog.user.isActive ? "Desativar" : "Ativar"}
            danger={dialog?.kind === "status" && dialog.user.isActive}
            onClose={close}
            onConfirm={async () => {
              if (dialog?.kind !== "status") return;
              await apiMutation(`users/${dialog.user.id}/status`, "PATCH", { isActive: !dialog.user.isActive });
              reload();
            }}
          />
          <ConfirmDialog
            open={dialog?.kind === "delete"}
            title="Excluir usuário"
            message={dialog?.kind === "delete" ? `Excluir o usuário ${dialog.user.name}? Esta ação não pode ser desfeita.` : ""}
            confirmLabel="Excluir"
            danger
            onClose={close}
            onConfirm={async () => {
              if (dialog?.kind !== "delete") return;
              await apiMutation(`users/${dialog.user.id}`, "DELETE");
              reload();
            }}
          />
        </>
      )}
      rowActions={(user) => (
        <RowActionsMenu
          label={`Ações para ${user.name}`}
          actions={[
            { label: "Editar", hidden: !can("users.update"), onSelect: () => setDialog({ kind: "form", user }) },
            { label: "Redefinir senha", hidden: !can("users.password.reset"), onSelect: () => setDialog({ kind: "password", user }) },
            { label: user.isActive ? "Desativar" : "Ativar", hidden: !can("users.status"), onSelect: () => setDialog({ kind: "status", user }) },
            { label: "Excluir", danger: true, hidden: !can("users.delete"), onSelect: () => setDialog({ kind: "delete", user }) },
          ]}
        />
      )}
    />
  );
}
