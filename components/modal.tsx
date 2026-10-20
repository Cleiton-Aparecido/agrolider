"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { X } from "lucide-react";

export type ModalSize = "sm" | "md" | "lg" | "drawer";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: ModalSize;
  /** Impede fechar enquanto uma operação assíncrona está em andamento. */
  busy?: boolean;
  /** Pede confirmação antes de descartar alterações. */
  dirty?: boolean;
  children: ReactNode;
  footer?: (requestClose: () => void) => ReactNode;
  /** Quando informado, corpo e rodapé ficam dentro de um <form>. */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  onDirty?: () => void;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  busy = false,
  dirty = false,
  children,
  footer,
  onSubmit,
  onDirty,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [discarding, setDiscarding] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
  }, [open]);

  function requestClose() {
    if (busy) return;
    if (dirty) {
      setDiscarding(true);
      return;
    }
    onClose();
  }

  if (!open) return null;

  const body = (
    <>
      <div className="modal-body">{children}</div>
      {discarding && (
        <div className="modal-discard" role="alertdialog" aria-label="Descartar alterações">
          <span>Você tem alterações não salvas. Deseja descartá-las?</span>
          <div className="modal-discard-actions">
            <button type="button" className="button button-secondary button-small" onClick={() => setDiscarding(false)}>
              Continuar editando
            </button>
            <button type="button" className="button button-danger button-small" onClick={onClose}>
              Descartar
            </button>
          </div>
        </div>
      )}
      {footer && <div className="modal-footer">{footer(requestClose)}</div>}
    </>
  );

  return (
    <dialog
      ref={ref}
      className={`modal modal-${size}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div className="modal-surface">
        <header className="modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="modal-close" aria-label="Fechar" onClick={requestClose} disabled={busy}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        {onSubmit ? (
          <form className="modal-form" onSubmit={onSubmit} onChange={onDirty}>
            {body}
          </form>
        ) : (
          body
        )}
      </div>
    </dialog>
  );
}

interface FormModalProps extends Omit<ModalProps, "footer" | "onSubmit"> {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitLabel: string;
  submittingLabel?: string;
  submitting: boolean;
  error?: string;
  submitDisabled?: boolean;
}

/** Estrutura visual padrão para formulários: erro, cancelar e salvar com bloqueio de envio duplicado. */
export function FormModal({
  children,
  error,
  submitLabel,
  submittingLabel = "Salvando...",
  submitting,
  submitDisabled,
  ...rest
}: FormModalProps) {
  return (
    <Modal
      {...rest}
      busy={submitting}
      footer={(requestClose) => (
        <>
          <button type="button" className="button button-secondary" onClick={requestClose} disabled={submitting}>
            Cancelar
          </button>
          <button type="submit" className="button" disabled={submitting || submitDisabled}>
            {submitting && <span className="spinner spinner-inline" aria-hidden="true" />}
            {submitting ? submittingLabel : submitLabel}
          </button>
        </>
      )}
    >
      {children}
      {error && <div className="notice error-notice" role="alert">{error}</div>}
    </Modal>
  );
}

/** Estado padrão de um formulário em modal: erro, envio e alterações pendentes. */
export function useModalForm() {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  return {
    error,
    setError,
    submitting,
    dirty,
    markDirty: () => setDirty(true),
    reset() {
      setError("");
      setSubmitting(false);
      setDirty(false);
    },
    /** Executa a operação uma única vez por vez e informa se teve sucesso. */
    async run(operation: () => Promise<unknown>, errorOf: (reason: unknown) => string): Promise<boolean> {
      if (submitting) return false;
      setSubmitting(true);
      setError("");
      try {
        await operation();
        return true;
      } catch (reason) {
        setError(errorOf(reason));
        return false;
      } finally {
        setSubmitting(false);
      }
    },
  };
}
