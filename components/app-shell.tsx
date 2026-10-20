"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileBottomNavigation, MobileMoreMenu } from "@/components/mobile-navigation";
import { currentTitle } from "@/components/nav-config";
import { request, SESSION_EXPIRED_EVENT } from "@/lib/api/client";
import type { CurrentUser } from "@/lib/auth/types";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userQuery = useQuery({
    queryKey: ["session"],
    queryFn: () => request<CurrentUser>("/api/auth/me"),
    retry: false,
  });
  const user = userQuery.data ?? null;

  useEffect(() => {
    if (userQuery.isPending) return;
    if (userQuery.isError) {
      router.replace("/login");
      return;
    }
    if (user?.mustChangePassword && pathname !== "/primeiro-acesso") {
      router.replace("/primeiro-acesso");
    }
  }, [pathname, router, user?.mustChangePassword, userQuery.isError, userQuery.isPending]);

  useEffect(() => {
    const handleSessionExpired = () => {
      queryClient.clear();
      router.replace("/login");
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [queryClient, router]);

  async function signOut() {
    try {
      await request("/api/auth/logout", { method: "POST" });
    } catch {
      toast.error("A sessão local foi encerrada, mas a API não confirmou a revogação.");
    } finally {
      queryClient.clear();
      router.replace("/");
      router.refresh();
    }
  }

  if (!user) {
    return (
      <>
        <main className="session-check" role="status">
          <span className="spinner" aria-hidden="true" />
          <p>{userQuery.isError ? "Redirecionando para entrar..." : "Validando sessão..."}</p>
        </main>
        <div hidden>{children}</div>
      </>
    );
  }

  return (
    <div className="app-frame" data-sidebar-collapsed={collapsed}>
      <AppSidebar
        pathname={pathname}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((current) => !current)}
      />
      <div className="main-frame">
        <header className="topbar">
          <div className="topbar-context">
            <Link className="topbar-logo" href="/produtos" aria-label="AgroLider, início">
              <Image src="/images/agrolider-logo.png" alt="AgroLider" width={39} height={40} />
            </Link>
            <span className="topbar-overline">AGROLIDER FERTILIZANTES</span>
            <span className="topbar-title">{currentTitle(pathname)}</span>
          </div>
          <div className="user-menu-wrap">
            <button
              className="user-menu-trigger"
              type="button"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className="avatar" aria-hidden="true">
                {user.name.trim().charAt(0).toLocaleUpperCase("pt-BR")}
              </span>
              <span className="user-menu-name">
                <strong>{user.name}</strong>
                <small>{user.roles.join(", ") || "Usuário"}</small>
              </span>
              <ChevronDown size={15} aria-hidden="true" />
            </button>
            {menuOpen && (
              <div className="user-menu">
                <span className="user-menu-email">{user.email}</span>
                <button className="menu-action" onClick={signOut} type="button">
                  <LogOut size={15} aria-hidden="true" /> Sair da conta
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
      <MobileBottomNavigation
        pathname={pathname}
        moreOpen={moreOpen}
        onOpenMore={() => setMoreOpen(true)}
      />
      <MobileMoreMenu
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        pathname={pathname}
        user={user}
        onSignOut={() => {
          setMoreOpen(false);
          void signOut();
        }}
      />
    </div>

  );
}
