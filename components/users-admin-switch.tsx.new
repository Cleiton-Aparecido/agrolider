"use client";

import { usePathname } from "next/navigation";
import { UserRolesPage } from "@/components/user-roles-page";
import { UsersListPage } from "@/components/users-list-page";

/** `/usuarios-roles` é reescrito para `/usuarios` em next.config.ts; a URL do navegador decide a tela. */
export function UsersAdminSwitch() {
  const pathname = usePathname();
  return pathname.startsWith("/usuarios-roles") ? <UserRolesPage /> : <UsersListPage />;
}
