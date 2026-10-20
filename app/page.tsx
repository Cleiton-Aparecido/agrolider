import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { ProductShowcase } from "@/components/product-showcase";
import { SESSION_COOKIE } from "@/lib/server/api";
import { HOME_ROUTE } from "@/lib/routes";

export default function Home() {
  return (
    <div className="store-page">
      <header className="store-header">
        <div className="store-header-inner">
          <Link href="/" aria-label="AgroLider Fertilizantes — início">
            <Image src="/images/agrolider-logo.png" alt="AgroLider Fertilizantes" width={150} height={56} priority style={{ height: "auto", width: 150 }} />
          </Link>
          <Suspense fallback={<Link className="button" href="/login">Entrar</Link>}>
            <AccountAction />
          </Suspense>
        </div>
      </header>
      <main className="store-main">
        <section className="store-hero">
          <p className="eyebrow">Catálogo AgroLider</p>
          <h1>Fertilizantes e insumos para o seu campo</h1>
          <p>Confira os produtos disponíveis. Para fazer pedidos e acompanhar a operação, acesse o sistema.</p>
        </section>
        <Suspense fallback={<div className="loading-state" role="status"><span className="spinner" aria-hidden="true" /> Carregando produtos...</div>}>
          <ProductShowcase />
        </Suspense>
      </main>
      <footer className="store-footer">© AgroLider Fertilizantes</footer>
    </div>
  );
}

async function AccountAction() {
  const hasSession = (await cookies()).has(SESSION_COOKIE);
  return hasSession ? (
    <Link className="button" href={HOME_ROUTE}>Acessar o sistema</Link>
  ) : (
    <Link className="button" href="/login">Entrar</Link>
  );
}
