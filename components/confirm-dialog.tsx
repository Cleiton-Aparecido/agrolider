"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import { errorMessage } from "@/lib/api/client";

/** Confirmação de operações críticas, no lugar de window.confirm. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => Promise<unknown>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      onClose();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        setError("");
        onClose();
      }}
      title={title}
      size="sm"
      busy={busy}
      footer={(requestClose) => (
        <>
          <button type="button" className="button button-secondary" onClick={requestClose} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className={`button ${danger ? "button-danger" : ""}`} onClick={() => void confirm()} disabled={busy}>
            {busy && <span className="spinner spinner-inline" aria-hidden="true" />}
            {busy ? "Processando..." : confirmLabel}
          </button>
        </>
      )}
    >
      <p className="modal-message">{message}</p>
      {error && <div className="notice error-notice" role="alert">{error}</div>}
    </Modal>
  );
}
