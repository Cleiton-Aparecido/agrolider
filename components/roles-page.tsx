"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ApiListPage, type TableRow } from "@/components/api-list-page";
import { api, apiMutation, errorMessage, type PageResult } from "@/lib/api/client";

interface Role extends TableRow {
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
  permissions: { id: string; name: string; slug: string }[];
}

interface Permission extends TableRow {
  name: string;
  slug: string;
}

export function RolesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedPermission, setSelectedPermission] = useState("");
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([
      api<PageResult<Role>>("/roles?page=1&limit=100").then((result) => setRoles(result.items)),
      api<PageResult<Permission>>("/permissions?page=1&limit=100").then((result) => setPermissions(result.items)),
    ]).catch((reason: unknown) => setError(errorMessage(reason)));
  }, []);

  async function createRole(event: FormEvent<HTMLFormElement>, reload: () => void) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setError("");
    try {
      await apiMutation<Role>("roles", "POST", {
        name: String(form.get("name")).trim(),
        slug: String(form.get("slug")).trim(),
        description: String(form.get("description")).trim() || undefined,
      });
      formElement.reset();
      setFormOpen(false);
      reload();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  async function assignPermission(event: FormEvent<HTMLFormElement>, reload: () => void) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiMutation(`roles/${selectedRole}/permissions`, "POST", { permissionId: selectedPermission });
      setNotice("Permissão associada à role.");
      reload();
      const updated = await api<PageResult<Role>>("/roles?page=1&limit=100");
      setRoles(updated.items);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  const [notice, setNotice] = useState("");

  return (
    <ApiListPage<Role>
      title="Roles"
      description="Papéis e permissões associados cadastrados no backend. Papéis de sistema são protegidos pela API."
      endpoint="roles"
      inlineError={error}
      columns={[
        { key: "name", label: "Nome", primary: true },
        { key: "slug", label: "Identificador" },
        { key: "description", label: "Descrição" },
        { key: "isSystem", label: "Sistema" },
      ]}
      toolbar={(reload) => (
        <>
          <div className="form-actions" style={{ marginBottom: 13 }}>
            <button className="button button-secondary" type="button" onClick={() => setAssignmentOpen(!assignmentOpen)}>
              {assignmentOpen ? "Fechar associação" : "Associar permissão"}
            </button>
            <button className="button" type="button" onClick={() => setFormOpen(!formOpen)}>
              {formOpen ? "Fechar cadastro" : "Nova role"}
            </button>
          </div>
          {assignmentOpen && (
            <section className="form-panel">
              <h2 className="panel-title">Associar permissão a uma role</h2>
              <p className="panel-subtitle">A API valida se a role e a permissão podem ser associadas.</p>
              <form className="inline-form" onSubmit={(event) => void assignPermission(event, reload)} style={{ marginTop: 14 }}>
                <label className="field">Role
                  <select className="select" required value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
                    <option value="">Selecione uma role</option>
                    {roles.map((role) => <option key={role.id} value={role.id}>{role.name} · {role.slug}</option>)}
                  </select>
                </label>
                <label className="field">Permissão
                  <select className="select" required value={selectedPermission} onChange={(event) => setSelectedPermission(event.target.value)}>
                    <option value="">Selecione uma permissão</option>
                    {permissions.map((permission) => <option key={permission.id} value={permission.id}>{permission.name} · {permission.slug}</option>)}
                  </select>
                </label>
                <button className="button" type="submit" disabled={saving || !roles.length || !permissions.length}>{saving ? "Associando..." : "Associar"}</button>
              </form>
            </section>
          )}
          {notice && <div className="notice" role="status" style={{ marginBottom: 12 }}>{notice}</div>}
          {formOpen && (
            <section className="form-panel">
              <h2 className="panel-title">Criar role</h2>
              <form onSubmit={(event) => void createRole(event, reload)} style={{ marginTop: 15 }}>
                <div className="field-grid">
                  <label className="field">Nome
                    <input className="input" name="name" minLength={2} maxLength={120} required />
                  </label>
                  <label className="field">Slug
                    <input className="input" name="slug" pattern="[a-z][a-z0-9-]*" maxLength={120} required placeholder="operador" />
                  </label>
                  <label className="field field-wide">Descrição
                    <textarea className="textarea" name="description" maxLength={500} />
                  </label>
                </div>
                {error && <div className="notice error-notice" role="alert">{error}</div>}
                <div className="form-actions">
                  <button className="button button-secondary" type="button" onClick={() => setFormOpen(false)}>Cancelar</button>
                  <button className="button" type="submit" disabled={saving}>{saving ? "Salvando..." : "Criar role"}</button>
                </div>
              </form>
            </section>
          )}
        </>
      )}
      rowActions={(role, reload) => (
        <>
          {role.permissions.map((permission) => (
            <button
              type="button"
              className="button button-small button-secondary"
              key={permission.id}
              aria-label={`Remover ${permission.name} da role ${role.name}`}
              onClick={() => {
                if (!window.confirm(`Remover a permissão ${permission.slug} da role ${role.name}?`)) return;
                void apiMutation(`roles/${role.id}/permissions/${permission.id}`, "DELETE")
                  .then(() => {
                    reload();
                    return api<PageResult<Role>>("/roles?page=1&limit=100");
                  })
                  .then((updated) => setRoles(updated.items))
                  .catch((reason: unknown) => setError(errorMessage(reason)));
              }}
            >
              − {permission.slug}
            </button>
          ))}
          {!role.isSystem && (
            <button
              type="button"
              className="button button-small button-danger"
              onClick={() => {
                if (!window.confirm(`Excluir a role “${role.name}”?`)) return;
                void apiMutation(`roles/${role.id}`, "DELETE")
                  .then(reload)
                  .catch((reason: unknown) => setError(errorMessage(reason)));
              }}
            >
              Excluir
            </button>
          )}
        </>
      )}
    />
  );
}
