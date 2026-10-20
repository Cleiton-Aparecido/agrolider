"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { request } from "@/lib/api/client";
import { HOME_ROUTE } from "@/lib/routes";
import { loginSchema, type LoginInput } from "@/lib/auth/schemas";

interface LoginResult {
  mustChangePassword: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function submit(values: LoginInput) {
    setApiError("");
    try {
      const result = await request<LoginResult>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: values.email.trim(), password: values.password }),
      });
      router.replace(result.mustChangePassword ? "/primeiro-acesso" : HOME_ROUTE);
      router.refresh();
    } catch (reason) {
      setApiError(reason instanceof Error ? reason.message : "Não foi possível entrar.");
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-visual" aria-label="AgroLider Fertilizantes">
        <div className="auth-logo">
          <Image src="/images/agrolider-logo.png" alt="AgroLider Fertilizantes" width={220} height={90} priority />
        </div>
        <div className="auth-hero">
          <p>Gestão AgroLider</p>
          <h1>Uma operação mais conectada ao campo.</h1>
          <span>Acompanhe produtos, clientes, pedidos e logística em um só lugar.</span>
        </div>
        <div className="auth-footer">AgroLider Fertilizantes · Acesso seguro</div>
      </section>
      <section className="auth-form-side">
        <div className="auth-card">
          <h2>Bem-vindo de volta</h2>
          <p>Entre com seu e-mail corporativo para acessar o sistema.</p>
          <form onSubmit={handleSubmit(submit)} noValidate>
            <label className="field" htmlFor="email">
              E-mail
              <input
                className="input"
                id="email"
                type="email"
                autoComplete="username"
                maxLength={255}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...register("email")}
              />
              {errors.email && <span className="field-error" id="email-error">{errors.email.message}</span>}
            </label>
            <label className="field" htmlFor="password">
              Senha
              <span className="password-wrap">
                <input
                  className="input"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  maxLength={128}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  {...register("password")}
                />
                <button
                  className="password-toggle"
                  type="button"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </span>
              {errors.password && <span className="field-error" id="password-error">{errors.password.message}</span>}
            </label>
            {apiError && <div className="notice error-notice" role="alert">{apiError}</div>}
            <button className="button auth-submit" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Validando acesso..." : "Entrar"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
