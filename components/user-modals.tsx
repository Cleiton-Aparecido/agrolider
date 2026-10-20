"use client";

import { type FormEvent } from "react";
import { FormModal, useModalForm } from "@/components/modal";
import { apiMutation, errorMessage } from "@/lib/api/client";

export interface UserRow extends Record<string, unknown> {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createAt: string;
  roles?: { id: string; name: string; slug: string }[];
}

/** Criação (user nulo) ou edição de nome e e-mail; senhas nunca são lidas. */
export function UserFormModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useModalForm();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const ok = await form.run(
      () =>
        apiMutation(user ? `users/${user.id}` : "users", user ? "PATCH" : "POST", {
          name: String(data.get("name")).trim(),
          email: String(data.get("email")).trim(),
          ...(user ? {} : { password: String(data.get("password")) }),
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
      title={user ? "Editar usuário" : "Novo usuário"}
      description={user ? "Atualize apenas os dados permitidos pela API." : "O usuário deverá trocar a senha provisória no primeiro acesso."}
      onSubmit={(event) => void submit(event)}
      submitLabel={user ? "Salvar alterações" : "Criar usuário"}
      submitting={form.submitting}
      error={form.error}
      dirty={form.dirty}
      onDirty={form.markDirty}
    >
      <label className="field">Nome
        <input className="input" name="name" minLength={2} maxLength={150} required defaultValue={user?.name ?? ""} autoFocus />
      </label>
      <label className="field">E-mail
        <input className="input" name="email" type="email" maxLength={255} required defaultValue={user?.email ?? ""} />
      </label>
      {!user && (
        <label className="field">Senha provisória
          <input className="input" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required />
          <span className="field-hint">Entre 12 e 128 caracteres.</span>
        </label>
      )}
    </FormModal>
  );
}

export function ResetPasswordModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useModalForm();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const ok = await form.run(
      () => apiMutation(`users/${user.id}/password`, "PUT", { newPassword: String(data.get("newPassword")) }),
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
      title="Redefinir senha"
      description={`Defina uma senha provisória para ${user.name}. A troca será exigida no próximo login.`}
      onSubmit={(event) => void submit(event)}
      submitLabel="Redefinir senha"
      submittingLabel="Redefinindo..."
      submitting={form.submitting}
      error={form.error}
      dirty={form.dirty}
      onDirty={form.markDirty}
      size="sm"
    >
      <label className="field">Nova senha provisória
        <input className="input" name="newPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required autoFocus />
        <span className="field-hint">Entre 12 e 128 caracteres.</span>
      </label>
    </FormModal>
  );
}
