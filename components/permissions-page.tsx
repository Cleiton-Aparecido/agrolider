"use client";

import { useState, type FormEvent } from "react";
import { ApiListPage, type TableRow } from "@/components/api-list-page";
import { apiMutation, errorMessage } from "@/lib/api/client";

interface Permission extends TableRow {
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean;
}

export function PermissionsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function createPermission(event: FormEvent<HTMLFormElement>, reload: () => void) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setError("");
    try {
      await apiMutation<Permission>("permissions", "POST", {
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

  return (
    <ApiListPage<Permission>
      title="Permissões"
      description="Permissões disponíveis no sistema e seus identificadores estáveis. Atribuições são gerenciadas nas roles."
      endpoint="permissions"
      columns={[
        { key: "name", label: "Permissão", primary: true },
        { key: "slug", label: "Identificador" },
        { key: "description", label: "Descrição" },
        { key: "isSystem", label: "Sistema" },
      ]}
      searchable
      inlineError={error}
      toolbar={(reload) => (
        <>
          <div className="form-actions" style={{ marginBottom: 13 }}>
            <button className="button" type="button" onClick={() => setFormOpen(!formOpen)}>
              {formOpen ? "Fechar cadastro" : "Nova permissão"}
            </button>
          </div>
          {formOpen && (
            <section className="form-panel">
              <h2 className="panel-title">Criar permissão</h2>
              <form onSubmit={(event) => void createPermission(event, reload)} style={{ marginTop: 15 }}>
                <div className="field-grid">
                  <label className="field">Nome
                    <input className="input" name="name" minLength={2} maxLength={150} required />
                  </label>
                  <label className="field">Slug
                    <input className="input" name="slug" pattern="[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*" maxLength={160} required placeholder="products.read" />
                  </label>
                  <label className="field field-wide">Descrição
                    <textarea className="textarea" name="description" maxLength={500} />
                  </label>
                </div>
                {error && <div className="notice error-notice" role="alert">{error}</div>}
                <div className="form-actions">
                  <button className="button button-secondary" type="button" onClick={() => setFormOpen(false)}>Cancelar</button>
                  <button className="button" type="submit" disabled={saving}>{saving ? "Salvando..." : "Criar permissão"}</button>
                </div>
              </form>
            </section>
          )}
        </>
      )}
      rowActions={(permission, reload) => !permission.isSystem && (
        <button
          type="button"
          className="button button-small button-danger"
          onClick={() => {
            if (!window.confirm(`Excluir a permissão “${permission.name}”?`)) return;
            void apiMutation(`permissions/${permission.id}`, "DELETE")
              .then(reload)
              .catch((reason: unknown) => setError(errorMessage(reason)));
          }}
        >
          Excluir
        </button>
      )}
    />
  );
}
