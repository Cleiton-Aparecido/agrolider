import { Suspense } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, ShoppingCart, User } from "lucide-react";
import { ProductShowcase } from "@/components/product-showcase";
import { StoreSearch } from "@/components/store-search";
import { SESSION_COOKIE } from "@/lib/server/api";
import { HOME_ROUTE } from "@/lib/routes";

export default function Home() {
  return (
    <div className="store-page">
      <header className="store-header">
        <div className="store-header-inner">
          <Link className="store-logo" href="/" aria-label="AgroLíder Fertilizantes — início">
            <span role="img" aria-label="AgroLíder" />
          </Link>
          <Suspense fallback={<div className="store-search" aria-hidden="true" />}>
            <StoreSearch />
          </Suspense>
          <Suspense fallback={<Link className="store-login" href="/login"><User size={18} aria-hidden="true" />Login</Link>}>
            <AccountAction />
          </Suspense>
        </div>
      </header>
      <section className="store-hero">
        <div className="store-hero-inner">
          <p className="eyebrow">Fertilizantes e insumos agrícolas</p>
          <h1>Mais produtividade <span>para o seu campo</span></h1>
          <p>Produtos de alta qualidade para nutrir o solo, proteger suas plantas e garantir melhores resultados.</p>
          <a className="store-hero-cta" href="#produtos">
            <ShoppingCart size={18} aria-hidden="true" /> Ver produtos <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
      </section>
      <main className="store-main" id="produtos">
        <Suspense fallback={<div className="loading-state" role="status"><span className="spinner" aria-hidden="true" /> Carregando produtos...</div>}>
          <ProductShowcase />
        </Suspense>
      </main>
      <footer className="store-footer">© AgroLíder Fertilizantes</footer>
    </div>
  );
}

async function AccountAction() {
  const hasSession = (await cookies()).has(SESSION_COOKIE);
  return hasSession ? (
    <Link className="store-login" href={HOME_ROUTE}><User size={18} aria-hidden="true" />Sistema</Link>
  ) : (
    <Link className="store-login" href="/login"><User size={18} aria-hidden="true" />Login</Link>
  );
}
