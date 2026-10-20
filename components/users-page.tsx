"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiListPage, type TableRow } from "@/components/api-list-page";
import { api, apiMutation, errorMessage, type PageResult } from "@/lib/api/client";

interface User extends TableRow {
  name: string;
  email: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createAt: string;
}

interface RoleOption extends TableRow {
  name: string;
  slug: string;
}

export function UsersPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [resetUser, setResetUser] = useState<User | null>(null);

  useEffect(() => {
    void Promise.all([
      api<PageResult<User>>("/users?page=1&limit=100").then((result) => setUsers(result.items)),
      api<PageResult<RoleOption>>("/roles?page=1&limit=100").then((result) => setRoles(result.items)),
    ]).catch((reason: unknown) => setError(errorMessage(reason)));
  }, []);

  async function createUser(event: FormEvent<HTMLFormElement>, reload: () => void) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setError("");
    try {
      await apiMutation<User>(
        editUser ? `users/${editUser.id}` : "users",
        editUser ? "PATCH" : "POST",
        {
          name: String(form.get("name")).trim(),
          email: String(form.get("email")).trim(),
          ...(!editUser ? { password: String(form.get("password")) } : {}),
        },
      );
      formElement.reset();
      setFormOpen(false);
      setEditUser(null);
      reload();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function assignRoles(event: FormEvent<HTMLFormElement>, reload: () => void) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiMutation(`users/${selectedUser}/roles`, "PUT", { roleIds: selectedRoles });
      setNotice("Roles atualizadas para o usuário.");
      reload();
      const refreshed = await api<PageResult<User>>("/users?page=1&limit=100");
      setUsers(refreshed.items);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>, reload: () => void) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      await apiMutation(`users/${resetUser?.id}/password`, "PUT", {
        newPassword: String(form.get("newPassword")),
      });
      setNotice("Senha redefinida; a API exigirá troca no próximo login.");
      setResetUser(null);
      reload();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  const [notice, setNotice] = useState("");

  return (
    <ApiListPage<User>
      title="Usuários"
      description="Administre contas de acesso. O backend exige troca de senha no primeiro login e nunca retorna senhas."
      endpoint="users"
      inlineError={error}
      columns={[
        { key: "name", label: "Nome", primary: true },
        { key: "email", label: "E-mail" },
        { key: "isActive", label: "Situação" },
        { key: "mustChangePassword", label: "Primeiro acesso" },
        { key: "createAt", label: "Criado em" },
      ]}
      toolbar={(reload) => (
        <>
          <div className="form-actions" style={{ marginBottom: 13 }}>
            <button className="button button-secondary" type="button" onClick={() => setAssignmentOpen(!assignmentOpen)}>
              {assignmentOpen ? "Fechar atribuição" : "Atribuir roles"}
            </button>
            <button className="button" type="button" onClick={() => { setFormOpen(!formOpen); if (formOpen) setEditUser(null); }}>
              {formOpen ? "Fechar cadastro" : "Novo usuário"}
            </button>
          </div>
          {assignmentOpen && (
            <section className="form-panel">
              <h2 className="panel-title">Atribuir roles ao usuário</h2>
              <p className="panel-subtitle">A seleção substitui todas as roles atuais, conforme o contrato do backend.</p>
              <form onSubmit={(event) => void assignRoles(event, reload)} style={{ marginTop: 14 }}>
                <div className="field-grid">
                  <label className="field">Usuário
                    <select className="select" required value={selectedUser} onChange={(event) => setSelectedUser(event.target.value)}>
                      <option value="">Selecione um usuário</option>
                      {users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}
                    </select>
                  </label>
                  <label className="field">Roles (Ctrl/Cmd para múltiplas)
                    <select className="select" multiple size={Math.min(roles.length || 2, 5)} value={selectedRoles} onChange={(event) => setSelectedRoles(Array.from(event.currentTarget.selectedOptions, (option) => option.value))}>
                      {roles.map((role) => <option key={role.id} value={role.id}>{role.name} · {role.slug}</option>)}
                    </select>
                  </label>
                </div>
                <div className="form-actions" style={{ marginTop: 12 }}>
                  <button className="button" type="submit" disabled={saving || !users.length || !roles.length}>{saving ? "Atualizando..." : "Salvar atribuições"}</button>
                </div>
              </form>
            </section>
          )}
          {resetUser && (
            <section className="form-panel">
              <h2 className="panel-title">Redefinir senha de {resetUser.name}</h2>
              <form onSubmit={(event) => void resetPassword(event, reload)} style={{ marginTop: 14 }}>
                <label className="field">Nova senha provisória
                  <input className="input" name="newPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required />
                </label>
                <div className="form-actions">
                  <button className="button button-secondary" type="button" onClick={() => setResetUser(null)}>Cancelar</button>
                  <button className="button" type="submit" disabled={saving}>{saving ? "Redefinindo..." : "Redefinir senha"}</button>
                </div>
              </form>
            </section>
          )}
          {notice && <div className="notice" role="status" style={{ marginBottom: 12 }}>{notice}</div>}
          {formOpen && (
            <section className="form-panel" key={editUser?.id ?? "new-user"}>
              <h2 className="panel-title">{editUser ? "Editar usuário" : "Criar usuário"}</h2>
              <p className="panel-subtitle">{editUser ? "Atualize somente os dados permitidos pela API." : "A senha inicial deve ter entre 12 e 128 caracteres."}</p>
              <form onSubmit={(event) => void createUser(event, reload)} style={{ marginTop: 15 }}>
                <div className="field-grid">
                  <label className="field">Nome
                    <input className="input" name="name" minLength={2} maxLength={150} required defaultValue={editUser?.name ?? ""} />
                  </label>
                  <label className="field">E-mail
                    <input className="input" name="email" type="email" maxLength={255} required defaultValue={editUser?.email ?? ""} />
                  </label>
                  {!editUser && <label className="field field-wide">Senha provisória
                    <input className="input" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required />
                  </label>}
                </div>
                {error && <div className="notice error-notice" role="alert">{error}</div>}
                <div className="form-actions">
                  <button className="button button-secondary" type="button" onClick={() => { setFormOpen(false); setEditUser(null); }}>Cancelar</button>
                  <button className="button" type="submit" disabled={saving}>{saving ? "Salvando..." : editUser ? "Salvar alterações" : "Criar usuário"}</button>
                </div>
              </form>
            </section>
          )}
        </>
      )}
      rowActions={(user, reload) => (
        <>
          <button type="button" className="button button-small button-secondary" onClick={() => { setEditUser(user); setFormOpen(true); }}>
            Editar
          </button>
          <button type="button" className="button button-small button-secondary" onClick={() => setResetUser(user)}>
            Redefinir senha
          </button>
          <button
            type="button"
            className={`button button-small ${user.isActive ? "button-secondary" : ""}`}
            onClick={() => {
              if (!window.confirm(`${user.isActive ? "Desativar" : "Ativar"} o usuário ${user.name}?`)) return;
              void apiMutation(`users/${user.id}/status`, "PATCH", { isActive: !user.isActive })
                .then(reload)
                .catch((reason: unknown) => setError(errorMessage(reason)));
            }}
          >
            {user.isActive ? "Desativar" : "Ativar"}
          </button>
          <button
            type="button"
            className="button button-small button-danger"
            onClick={() => {
              if (!window.confirm(`Excluir o usuário ${user.name}?`)) return;
              void apiMutation(`users/${user.id}`, "DELETE")
                .then(reload)
                .catch((reason: unknown) => setError(errorMessage(reason)));
            }}
          >
            Excluir
          </button>
        </>
      )}
    />
  );
}
