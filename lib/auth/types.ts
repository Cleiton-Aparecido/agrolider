export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  /** Slugs concedidos pelo backend; ausente ou vazio significa nenhum acesso. */
  permissions: string[];
  mustChangePassword: boolean;
}
