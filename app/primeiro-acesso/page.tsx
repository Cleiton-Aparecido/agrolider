"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { request } from "@/lib/api/client";
import { HOME_ROUTE } from "@/lib/routes";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/auth/schemas";

export default function FirstAccessPage() {
  const router = useRouter();
  const [apiError, setApiError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  async function submit(values: ChangePasswordInput) {
    setApiError("");
    try {
      await request("/api/auth/password/change", {
        method: "POST",
        body: JSON.stringify(values),
      });
      router.replace(HOME_ROUTE);
      router.refresh();
    } catch (reason) {
      setApiError(reason instanceof Error ? reason.message : "Não foi possível alterar a senha.");
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="auth-logo">
          <Image src="/images/agrolider-logo.png" alt="AgroLider Fertilizantes" width={220} height={90} priority />
        </div>
        <div className="auth-hero">
          <p>Proteção da conta</p>
          <h1>Defina sua senha pessoal.</h1>
          <span>Para continuar, atualize a senha provisória da sua conta.</span>
        </div>
        <div className="auth-footer">AgroLider Fertilizantes · Acesso seguro</div>
      </section>
      <section className="auth-form-side">
        <div className="auth-card">
          <h2>Primeiro acesso</h2>
          <p>Informe a senha atual e escolha uma nova senha com pelo menos 12 caracteres.</p>
          <form onSubmit={handleSubmit(submit)} noValidate>
            <label className="field" htmlFor="currentPassword">
              Senha atual
              <input
                className="input"
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.currentPassword)}
                aria-describedby={errors.currentPassword ? "current-password-error" : undefined}
                {...register("currentPassword")}
              />
              {errors.currentPassword && <span className="field-error" id="current-password-error">{errors.currentPassword.message}</span>}
            </label>
            <label className="field" htmlFor="newPassword">
              Nova senha
              <input
                className="input"
                id="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                aria-invalid={Boolean(errors.newPassword)}
                aria-describedby={errors.newPassword ? "new-password-error" : undefined}
                {...register("newPassword")}
              />
              {errors.newPassword && <span className="field-error" id="new-password-error">{errors.newPassword.message}</span>}
            </label>
            <label className="field" htmlFor="confirmNewPassword">
              Confirmar nova senha
              <input
                className="input"
                id="confirmNewPassword"
                type="password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                aria-invalid={Boolean(errors.confirmNewPassword)}
                aria-describedby={errors.confirmNewPassword ? "confirm-password-error" : undefined}
                {...register("confirmNewPassword")}
              />
              {errors.confirmNewPassword && <span className="field-error" id="confirm-password-error">{errors.confirmNewPassword.message}</span>}
            </label>
            {apiError && <div className="notice error-notice" role="alert">{apiError}</div>}
            <button className="button auth-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Atualizando..." : "Atualizar senha"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
