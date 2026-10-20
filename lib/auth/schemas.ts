import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido.").max(255),
  password: z.string().min(1, "Informe sua senha.").max(128),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(8, "A senha atual deve ter pelo menos 8 caracteres.")
      .max(128),
    newPassword: z
      .string()
      .min(12, "A nova senha deve ter pelo menos 12 caracteres.")
      .max(128),
    confirmNewPassword: z
      .string()
      .min(12, "A confirmação deve ter pelo menos 12 caracteres.")
      .max(128),
  })
  .refine((values) => values.newPassword === values.confirmNewPassword, {
    message: "A confirmação de senha não corresponde.",
    path: ["confirmNewPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
