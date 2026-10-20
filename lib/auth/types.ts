export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  mustChangePassword: boolean;
}
