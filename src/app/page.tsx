"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { AuthScreen } from "@/components/auth/auth-screen";
import { AppShell } from "@/components/shell/app-shell";
import { WorkerPortal } from "@/components/worker/worker-portal";
import { api } from "@/lib/api";
import { useAuth, useView } from "@/lib/store";

function HomeContent() {
  const { professional, loading, set, setLoading } = useAuth();
  const { view, workerToken, openWorker } = useView();
  const searchParams = useSearchParams();

  // Bootstrap session on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const p = await api.me.get();
        if (!cancelled) set(p);
      } catch {
        if (!cancelled) set(null);
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

  // Read ?worker=<token> from URL — opens the worker portal full-screen.
  // This lets workers access the questionnaire via the generated link
  // (e.g. https://app.example.com/?worker=abc-123).
  useEffect(() => {
    const token = searchParams.get("worker");
    if (token && view !== "worker") {
      openWorker(token);
    }
  }, [searchParams, view, openWorker]);

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

export default function Home() {
  // Suspense boundary required by Next.js for useSearchParams
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
