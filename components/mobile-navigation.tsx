"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { LogOut, MoreHorizontal, X } from "lucide-react";
import {
  isRouteActive,
  mobileMoreGroups,
  mobilePrimaryLinks,
} from "@/components/nav-config";
import type { CurrentUser } from "@/lib/auth/types";

export function MobileMoreMenu({
  open,
  onClose,
  pathname,
  user,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  user: CurrentUser;
  onSignOut: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="more-sheet"
      aria-labelledby="more-sheet-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="more-sheet-body">
        <div className="more-sheet-header">
          <div>
            <h2 id="more-sheet-title">Mais opções</h2>
            <p>{user.name}</p>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar menu">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {mobileMoreGroups.map((group) => (
          <section className="more-group" key={group.id}>
            <h3>{group.heading}</h3>
            <div className="more-grid">
              {group.links.map((item) => {
                const active = isRouteActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`more-link${active ? " more-link-active" : ""}`}
                    aria-current={active ? "page" : undefined}
                    onClick={onClose}
                  >
                    <Icon size={20} strokeWidth={1.9} aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
        <button className="more-signout" type="button" onClick={onSignOut}>
          <LogOut size={18} aria-hidden="true" /> Sair da conta
        </button>
      </div>
    </dialog>
  );
}

export function MobileBottomNavigation({
  pathname,
  moreOpen,
  onOpenMore,
}: {
  pathname: string;
  moreOpen: boolean;
  onOpenMore: () => void;
}) {
  const moreActive = mobileMoreGroups.some((group) =>
    group.links.some((link) => isRouteActive(pathname, link.href)),
  );

  return (
    <nav className="bottom-nav" aria-label="Navegação principal">
      {mobilePrimaryLinks.map((item) => {
        const active = isRouteActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`bottom-nav-item${active ? " bottom-nav-item-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={22} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
            <span>{item.shortLabel}</span>
          </Link>
        );
      })}
      <button
        type="button"
        className={`bottom-nav-item${moreActive || moreOpen ? " bottom-nav-item-active" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={moreOpen}
        onClick={onOpenMore}
      >
        <MoreHorizontal size={22} strokeWidth={moreActive ? 2.2 : 1.8} aria-hidden="true" />
        <span>Menu</span>
      </button>
    </nav>
  );
}
