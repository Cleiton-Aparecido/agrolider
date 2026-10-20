import {
  ArrowLeftRight,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  Package,
  ShieldCheck,
  Store,
  Truck,
  UserCog,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
export interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  /**
   * Slugs reais do backend (@RequirePermissions) das quais o usuário precisa de pelo menos uma
   * para ver o item. Sem o campo, o item é público dentro da área autenticada.
   */
  permissions?: string[];
}

export interface NavGroup {
  id: string;
  heading: string;
  links: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    id: "comercial",
    heading: "Comercial",
    links: [
      { href: "/produtos", label: "Produtos", shortLabel: "Produtos", icon: Package, permissions: ["products.read"] },
      { href: "/clientes", label: "Clientes", shortLabel: "Clientes", icon: Users, permissions: ["customers.read"] },
      { href: "/pedidos", label: "Pedidos", shortLabel: "Pedidos", icon: ClipboardList, permissions: ["orders.read"] },
      { href: "/", label: "Vitrine de Produtos", shortLabel: "Vitrine", icon: Store },
    ],
  },
  {
    id: "estoque",
    heading: "Estoque",
    links: [
      { href: "/estoque", label: "Visão geral do estoque", shortLabel: "Estoque", icon: Warehouse, permissions: ["stock.read"] },
      { href: "/movimentacoes", label: "Movimentações", shortLabel: "Movimentações", icon: ArrowLeftRight, permissions: ["stock.movements.read"] },
    ],
  },
  {
    id: "operacoes",
    heading: "Operações",
    links: [
      { href: "/logistica", label: "Logística", shortLabel: "Logística", icon: Truck, permissions: ["logistics.orders.read"] },
      {
        href: "/dashboard",
        label: "Painel",
        shortLabel: "Painel",
        icon: LayoutDashboard,
        permissions: ["products.read", "customers.read", "orders.read"],
      },
    ],
  },
  {
    id: "administracao",
    heading: "Administração",
    links: [
      { href: "/usuarios", label: "Usuários", shortLabel: "Usuários", icon: UserCog, permissions: ["users.read"] },
      { href: "/roles", label: "Roles", shortLabel: "Roles", icon: ShieldCheck, permissions: ["roles.read"] },
      { href: "/permissoes", label: "Permissões", shortLabel: "Permissões", icon: KeyRound, permissions: ["permissions.read"] },
    ],
  },
];

const allLinks = navigation.flatMap((group) => group.links);

export const mobilePrimaryHrefs = ["/produtos", "/estoque", "/pedidos", "/clientes"];

/** Divide os grupos já filtrados entre a barra inferior e o menu "Mais". */
export function splitMobileNavigation(groups: NavGroup[]): {
  primaryLinks: NavItem[];
  moreGroups: NavGroup[];
} {
  const links = groups.flatMap((group) => group.links);
  return {
    primaryLinks: mobilePrimaryHrefs
      .map((href) => links.find((link) => link.href === href))
      .filter((link): link is NavItem => Boolean(link)),
    moreGroups: groups
      .map((group) => ({
        ...group,
        links: group.links.filter((link) => !mobilePrimaryHrefs.includes(link.href)),
      }))
      .filter((group) => group.links.length > 0),
  };
}

export function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Item de navegação que governa a rota atual, se houver. */
export function linkForPath(pathname: string): NavItem | undefined {
  return allLinks.find((link) => link.href !== "/" && isRouteActive(pathname, link.href));
}

export function currentTitle(pathname: string): string {
  return allLinks.find((link) => isRouteActive(pathname, link.href))?.label ?? "Gestão da operação";
}
