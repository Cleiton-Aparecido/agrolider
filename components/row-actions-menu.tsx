"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

export interface RowAction {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  /** Ações sem autorização não devem ser enviadas ao menu. */
  hidden?: boolean;
}

/** Menu de três pontos; posição fixa para não ser cortado pelo scroll horizontal da tabela. */
export function RowActionsMenu({ actions, label }: { actions: RowAction[]; label: string }) {
  const visible = actions.filter((action) => !action.hidden);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;
    const close = (event: Event) => {
      if (event instanceof MouseEvent && (menuRef.current?.contains(event.target as Node) || buttonRef.current?.contains(event.target as Node))) return;
      setPosition(null);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPosition(null);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("keydown", key);
    menuRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", key);
    };
  }, [position]);

  if (!visible.length) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="row-menu-trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={Boolean(position)}
        onClick={() => {
          if (position) return setPosition(null);
          const rect = buttonRef.current?.getBoundingClientRect();
          if (rect) setPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
        }}
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {position && (
        <div ref={menuRef} className="row-menu" role="menu" style={{ top: position.top, right: position.right }}>
          {visible.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              className={action.danger ? "row-menu-danger" : undefined}
              onClick={() => {
                setPosition(null);
                action.onSelect();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
