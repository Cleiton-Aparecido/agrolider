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
      { href: "/produtos", label: "Produtos", shortLabel: "Produtos", icon: Package },
      { href: "/clientes", label: "Clientes", shortLabel: "Clientes", icon: Users },
      { href: "/pedidos", label: "Pedidos", shortLabel: "Pedidos", icon: ClipboardList },
      { href: "/", label: "Vitrine de Produtos", shortLabel: "Vitrine", icon: Store },
    ],
  },
  {
    id: "estoque",
    heading: "Estoque",
    links: [
      { href: "/estoque", label: "Visão geral do estoque", shortLabel: "Estoque", icon: Warehouse },
      { href: "/movimentacoes", label: "Movimentações", shortLabel: "Movimentações", icon: ArrowLeftRight },
    ],
  },
  {
    id: "operacoes",
    heading: "Operações",
    links: [
      { href: "/logistica", label: "Logística", shortLabel: "Logística", icon: Truck },
      { href: "/dashboard", label: "Painel", shortLabel: "Painel", icon: LayoutDashboard },
    ],
  },
  {
    id: "administracao",
    heading: "Administração",
    links: [
      { href: "/usuarios", label: "Usuários", shortLabel: "Usuários", icon: UserCog },
      { href: "/roles", label: "Roles", shortLabel: "Roles", icon: ShieldCheck },
      { href: "/permissoes", label: "Permissões", shortLabel: "Permissões", icon: KeyRound },
    ],
  },
];

const allLinks = navigation.flatMap((group) => group.links);

export const mobilePrimaryHrefs = ["/produtos", "/estoque", "/pedidos", "/clientes"];

export const mobilePrimaryLinks = mobilePrimaryHrefs
  .map((href) => allLinks.find((link) => link.href === href))
  .filter((link): link is NavItem => Boolean(link));

export const mobileMoreGroups: NavGroup[] = navigation
  .map((group) => ({
    ...group,
    links: group.links.filter((link) => !mobilePrimaryHrefs.includes(link.href)),
  }))
  .filter((group) => group.links.length > 0);

export function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function currentTitle(pathname: string): string {
  return allLinks.find((link) => isRouteActive(pathname, link.href))?.label ?? "Gestão da operação";
}
