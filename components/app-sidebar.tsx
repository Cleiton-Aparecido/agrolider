"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { isRouteActive, navigation } from "@/components/nav-config";

export function AppSidebar({
  pathname,
  collapsed,
  onToggleCollapsed,
}: {
  pathname: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const [closedGroups, setClosedGroups] = useState<string[]>([]);

  function toggleGroup(id: string) {
    setClosedGroups((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <aside className="sidebar" data-collapsed={collapsed}>
      <Link className="brand" href="/produtos" aria-label="AgroLider, início">
        <Image
          src="/images/agrolider-logo.png"
          alt="AgroLider Fertilizantes"
          width={176}
          height={180}
          priority
        />
      </Link>
      <nav className="sidebar-nav" aria-label="Navegação principal">
        {navigation.map((group) => {
          const open = collapsed || !closedGroups.includes(group.id);
          return (
            <section className="nav-group" key={group.id}>
              <button
                className="nav-group-toggle"
                type="button"
                aria-expanded={open}
                aria-controls={`nav-group-${group.id}`}
                onClick={() => toggleGroup(group.id)}
              >
                <span>{group.heading}</span>
                <ChevronDown className="nav-group-chevron" size={14} aria-hidden="true" />
              </button>
              {open && (
                <div id={`nav-group-${group.id}`}>
                  {group.links.map((item) => {
                    const active = isRouteActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        className={`nav-link${active ? " nav-link-active" : ""}`}
                        href={item.href}
                        key={item.href}
                        aria-current={active ? "page" : undefined}
                        aria-label={collapsed ? item.label : undefined}
                        title={collapsed ? item.label : undefined}
                      >
                        <Icon className="nav-icon" size={19} strokeWidth={1.9} aria-hidden="true" />
                        <span className="nav-label">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </nav>
      <button
        className="sidebar-collapse"
        type="button"
        onClick={onToggleCollapsed}
        aria-pressed={collapsed}
        aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
        title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
      >
        {collapsed ? (
          <PanelLeftOpen size={19} strokeWidth={1.9} aria-hidden="true" />
        ) : (
          <PanelLeftClose size={19} strokeWidth={1.9} aria-hidden="true" />
        )}
        <span className="nav-label">Recolher menu</span>
      </button>
    </aside>
  );
}
