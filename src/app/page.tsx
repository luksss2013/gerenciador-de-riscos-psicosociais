"use client";

import { useEffect } from "react";
import { useAuth, useView } from "@/lib/store";
import { api, ApiError } from "@/lib/api";
import { AuthScreen } from "@/components/auth/auth-screen";
import { AppShell } from "@/components/shell/app-shell";
import { WorkerPortal } from "@/components/worker/worker-portal";

export default function Home() {
  const { professional, loading, set, setLoading } = useAuth();
  const { view, workerToken } = useView();

  // Bootstrap session on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const p = await api.me.get();
        if (!cancelled) set(p);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          if (!cancelled) set(null);
        } else {
          if (!cancelled) set(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [set, setLoading]);

  // Seed COPSOQ on first mount (idempotent) so demo works.
  useEffect(() => {
    api.system.seedCopsoq().catch(() => {});
  }, []);

  // Worker portal is rendered full-screen (simulated distinct context).
  if (view === "worker" && workerToken) {
    return <WorkerPortal token={workerToken} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando…</p>
        </div>
      </div>
    );
  }

  if (!professional) {
    return <AuthScreen />;
  }

  return <AppShell />;
}
