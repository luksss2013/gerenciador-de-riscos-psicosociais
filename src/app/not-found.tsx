"use client";

import { Compass, Home } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface)]">
      <header className="px-4 sm:px-6 lg:px-8 py-5 border-b border-border">
        <Logo withWordmark size={28} />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 sm:px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex h-16 w-16 rounded-full bg-[var(--background)] border border-border items-center justify-center mx-auto">
            <Compass className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <p className="font-mono-numeric text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Erro 404
            </p>
            <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-foreground">
              Página não encontrada
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
              O endereço acessado não corresponde a nenhuma rota da plataforma. Verifique o link ou
              volte ao painel.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Button asChild>
              <Link href="/">
                <Home className="h-4 w-4" />
                Voltar ao painel
              </Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground/70 pt-6 font-mono-numeric">
            Plataforma restrita · sem índice público
          </p>
        </div>
      </main>
    </div>
  );
}
