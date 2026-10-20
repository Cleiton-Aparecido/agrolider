"use client";

import { useState, type FormEvent } from "react";
import { ApiListPage, type TableRow } from "@/components/api-list-page";
import { apiMutation, errorMessage } from "@/lib/api/client";

interface Customer extends TableRow {
  name: string;
  documentNumber: string;
  documentType: string;
  tradeName: string | null;
  address: Record<string, string> | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
}

export function CustomersPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function createCustomer(event: FormEvent<HTMLFormElement>, reload: () => void) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const street = String(form.get("street") ?? "").trim();
    const city = String(form.get("city") ?? "").trim();
    const state = String(form.get("state") ?? "").trim();
    const postalCode = String(form.get("postalCode") ?? "").trim();
    const address = Object.fromEntries(
      Object.entries({ street, city, state, postalCode }).filter(([, value]) => value),
    );
    setSaving(true);
    setError("");
    try {
      await apiMutation<Customer>(
        editCustomer ? `customers/${editCustomer.id}` : "customers",
        editCustomer ? "PATCH" : "POST",
        {
        ...(editCustomer ? {} : { documentNumber: String(form.get("documentNumber")) }),
        name: String(form.get("name")).trim(),
        tradeName: String(form.get("tradeName") ?? "").trim() || undefined,
        email: String(form.get("email") ?? "").trim() || undefined,
        phone: String(form.get("phone") ?? "").trim() || undefined,
        notes: String(form.get("notes") ?? "").trim() || undefined,
        ...(Object.keys(address).length ? { address } : {}),
        },
      );
      setFormOpen(false);
      setEditCustomer(null);
      formElement.reset();
      reload();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ApiListPage<Customer>
      title="Clientes"
      description="Cadastros de clientes e documentos fiscais. A API valida CPF/CNPJ e unicidade."
      endpoint="customers"
      searchable
      inlineError={error}
      columns={[
        { key: "name", label: "Cliente", primary: true },
        { key: "documentNumber", label: "CPF/CNPJ" },
        { key: "documentType", label: "Tipo" },
        { key: "phone", label: "Telefone" },
        { key: "email", label: "E-mail" },
        { key: "isActive", label: "Situação" },
      ]}
      toolbar={(reload) => (
        <>
          <div className="form-actions" style={{ marginBottom: 13 }}>
            <button className="button" type="button" onClick={() => { setFormOpen(!formOpen); if (formOpen) setEditCustomer(null); }}>
              {formOpen ? "Fechar cadastro" : "Novo cliente"}
            </button>
          </div>
          {formOpen && (
            <section className="form-panel" key={editCustomer?.id ?? "new-customer"}>
              <h2 className="panel-title">{editCustomer ? "Editar cliente" : "Cadastrar cliente"}</h2>
              <form onSubmit={(event) => void createCustomer(event, reload)} style={{ marginTop: 15 }}>
                <div className="field-grid">
                  {editCustomer ? (
                    <label className="field">CPF/CNPJ (imutável)
                      <input className="input" value={editCustomer.documentNumber} disabled readOnly />
                    </label>
                  ) : (
                    <label className="field">CPF/CNPJ
                      <input className="input" name="documentNumber" autoComplete="off" maxLength={20} required />
                    </label>
                  )}
                  <label className="field">Nome / razão social
                    <input className="input" name="name" minLength={2} maxLength={180} required defaultValue={editCustomer?.name ?? ""} />
                  </label>
                  <label className="field">Nome fantasia (opcional)
                    <input className="input" name="tradeName" maxLength={180} defaultValue={editCustomer?.tradeName ?? ""} />
                  </label>
                  <label className="field">Telefone
                    <input className="input" name="phone" type="tel" maxLength={30} defaultValue={editCustomer?.phone ?? ""} />
                  </label>
                  <label className="field">E-mail
                    <input className="input" name="email" type="email" maxLength={255} defaultValue={editCustomer?.email ?? ""} />
                  </label>
                  <label className="field">CEP
                    <input className="input" name="postalCode" maxLength={20} defaultValue={editCustomer?.address?.postalCode ?? ""} />
                  </label>
                  <label className="field">Endereço
                    <input className="input" name="street" maxLength={180} defaultValue={editCustomer?.address?.street ?? ""} />
                  </label>
                  <label className="field">Cidade
                    <input className="input" name="city" maxLength={120} defaultValue={editCustomer?.address?.city ?? ""} />
                  </label>
                  <label className="field">UF
                    <input className="input" name="state" maxLength={2} defaultValue={editCustomer?.address?.state ?? ""} />
                  </label>
                  <label className="field field-wide">Observações
                    <textarea className="textarea" name="notes" maxLength={5000} defaultValue={editCustomer?.notes ?? ""} />
                  </label>
                </div>
                {error && <div className="notice error-notice" role="alert">{error}</div>}
                <div className="form-actions">
                  <button className="button button-secondary" type="button" onClick={() => { setFormOpen(false); setEditCustomer(null); }}>Cancelar</button>
                  <button className="button" type="submit" disabled={saving}>{saving ? "Salvando..." : editCustomer ? "Salvar alterações" : "Salvar cliente"}</button>
                </div>
              </form>
            </section>
          )}
        </>
      )}
      rowActions={(customer, reload) => (
        <>
          <button
            className="button button-secondary button-small"
            type="button"
            onClick={() => { setEditCustomer(customer); setFormOpen(true); }}
          >
            Editar
          </button>
          <button
            className={`button button-small ${customer.isActive ? "button-secondary" : ""}`}
            type="button"
            onClick={() => {
              const action = customer.isActive ? "deactivate" : "activate";
              if (customer.isActive && !window.confirm(`Desativar o cadastro de ${customer.name}?`)) return;
              void apiMutation(`customers/${customer.id}/${action}`, "PATCH")
                .then(reload)
                .catch((reason: unknown) => setError(errorMessage(reason)));
            }}
          >
            {customer.isActive ? "Desativar" : "Ativar"}
          </button>
        </>
      )}
    />
  );
}
