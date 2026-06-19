import { redirect } from "next/navigation";

// Root entry: legacy `?worker=<token>` links redirect to the isolated portal
// route; everything else goes to the Painel (which the professional layout
// guards, redirecting unauthenticated users to /auth).
export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ worker?: string }>;
}) {
  const sp = await searchParams;
  if (sp.worker) redirect(`/portal/${sp.worker}`);
  redirect("/painel");
}
