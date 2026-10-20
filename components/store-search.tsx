"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

const DEBOUNCE_MS = 300;

/** Atualiza `?busca=` na URL (sem recarregar); a vitrine reage e consulta o backend com `search`. */
export function StoreSearch() {
  const searchParams = useSearchParams();
  const urlValue = searchParams.get("busca") ?? "";
  const [value, setValue] = useState(urlValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(urlValue);
  }, [urlValue]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function apply(next: string) {
    const params = new URLSearchParams(window.location.search);
    const term = next.trim();
    if (term === (params.get("busca") ?? "")) return;
    if (term) params.set("busca", term);
    else params.delete("busca");
    params.delete("pagina");
    params.delete("produto");
    const query = params.toString();
    window.history.replaceState(null, "", query ? `/?${query}` : "/");
  }

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => apply(next), DEBOUNCE_MS);
  }

  return (
    <form
      className="store-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        apply(value);
      }}
    >
      <Search size={18} aria-hidden="true" />
      <input
        type="search"
        name="busca"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar produtos ou SKU..."
        aria-label="Buscar produtos"
        maxLength={100}
        autoComplete="off"
      />
    </form>
  );
}
