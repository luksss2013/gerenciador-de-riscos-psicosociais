"use client";

import { Loader2, LogOut, Menu, Settings, X } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { SidebarContent } from "@/components/shell/app-shell";
import { GlobalSearch } from "@/components/shell/global-search";
import { Logo } from "@/components/shell/logo";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { useAuth, useView } from "@/lib/store";

// ─── Top bar (desktop + mobile) ─────────────────────────────────────────────

export function TopBar() {
  const { professional } = useAuth();
  const go = useView((s) => s.go);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await api.auth.logout();
    } catch {
      // ignore — clear local state regardless
    } finally {
      useAuth.getState().set(null);
      toast.success("Sessão encerrada.");
      setSigningOut(false);
      setSignOutOpen(false);
    }
  };

  const initials = React.useMemo(() => {
    if (!professional?.name) return "?";
    const parts = professional.name.trim().split(/\s+/);
    // Skip honorifics
    const HONORIFICS = new Set([
      "dr",
      "dra",
      "sr",
      "sra",
      "srta",
      "prof",
      "profa",
      "dr.",
      "dra.",
      "sr.",
      "sra.",
      "srta.",
      "prof.",
      "profa.",
    ]);
    const realParts = parts.filter((p) => !HONORIFICS.has(p.toLowerCase()));
    const useParts = realParts.length > 0 ? realParts : parts;
    if (useParts.length === 1) return useParts[0].slice(0, 2).toUpperCase();
    return (useParts[0][0] + useParts[useParts.length - 1][0]).toUpperCase();
  }, [professional?.name]);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-3 h-16 px-4 sm:px-6 lg:px-8 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {/* Mobile nav trigger */}
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir menu de navegação"
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <div className="absolute top-3 right-3 z-10">
              <SheetClose asChild>
                <Button variant="ghost" size="icon" aria-label="Fechar menu">
                  <X className="h-4 w-4" />
                </Button>
              </SheetClose>
            </div>
            <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Logo + wordmark (left) */}
        <button
          type="button"
          onClick={() => go("painel")}
          className="flex items-center gap-2.5 shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
          aria-label="Ir para o início"
        >
          <Logo size={32} />
          <span className="hidden sm:block leading-tight">
            <span className="font-display font-semibold text-[15px] text-foreground block">
              NR-1 Copsoq
            </span>
            <span className="text-[11px] text-muted-foreground block">Riscos psicossociais</span>
          </span>
        </button>

        {/* Global search (center, flex-1) */}
        <div className="flex-1 flex justify-center px-2 sm:px-4">
          <GlobalSearch />
        </div>

        {/* User profile (right) */}
        <div className="flex items-center gap-2 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--surface)] cursor-pointer transition-colors text-left"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-[var(--sidebar-accent)] text-[var(--brand)] text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block min-w-0 max-w-[140px]">
                  <div className="text-sm font-medium truncate text-foreground">
                    {professional?.name ?? "—"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {professional?.email ?? ""}
                  </div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{professional?.name ?? "—"}</span>
                  <span className="text-xs text-muted-foreground">{professional?.email ?? ""}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => go("configuracoes")}>
                <Settings className="h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  setSignOutOpen(true);
                }}
                disabled={signingOut}
              >
                {signingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Logout confirmation */}
      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-xl">Encerrar sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              Você sairá da plataforma e precisará informar suas credenciais novamente para acessar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={signingOut}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={signingOut}
              onClick={(e) => {
                e.preventDefault();
                void handleSignOut();
              }}
            >
              {signingOut && <Loader2 className="h-4 w-4 animate-spin" />}
              Sair
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
