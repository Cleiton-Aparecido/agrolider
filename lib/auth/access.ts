import { navigation, linkForPath, type NavGroup, type NavItem } from "@/components/nav-config";
import type { CurrentUser } from "@/lib/auth/types";

/** Regra única de visibilidade; sem lista de permissões no item, o acesso é livre. Falha fechada. */
export function canAccessItem(user: CurrentUser, item: NavItem): boolean {
  if (!item.permissions?.length) return true;
  const granted = Array.isArray(user.permissions) ? user.permissions : [];
  return item.permissions.some((permission) => granted.includes(permission));
}

export function filterNavigation(user: CurrentUser, groups: NavGroup[] = navigation): NavGroup[] {
  return groups
    .map((group) => ({ ...group, links: group.links.filter((link) => canAccessItem(user, link)) }))
    .filter((group) => group.links.length > 0);
}

export function canAccessPath(user: CurrentUser, pathname: string): boolean {
  const item = linkForPath(pathname);
  return !item || canAccessItem(user, item);
}

/** Primeira rota autorizada, ignorando a vitrine pública. */
export function firstAllowedRoute(user: CurrentUser): string | null {
  const links = filterNavigation(user).flatMap((group) => group.links);
  return links.find((link) => link.href !== "/")?.href ?? null;
}
