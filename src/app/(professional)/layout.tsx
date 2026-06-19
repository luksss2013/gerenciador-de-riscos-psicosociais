import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { getCurrentProfessional } from "@/lib/session";

// Server-side auth guard for the entire professional app. Reads the session
// cookie (async in Next 16) and redirects unauthenticated users to /auth.
// The (professional) route group adds no URL segment; it exists only to share
// this guard + the AppShell chrome across all professional routes.
export default async function ProfessionalLayout({ children }: { children: React.ReactNode }) {
  const professional = await getCurrentProfessional();
  if (!professional) redirect("/auth");
  return <AppShell>{children}</AppShell>;
}
