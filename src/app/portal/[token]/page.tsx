"use client";

import { useParams } from "next/navigation";
import { WorkerPortal } from "@/components/worker/worker-portal";

// Worker portal — isolated, cookie-less, no professional chrome (spec §3.2).
// No auth guard; the route group guard in (professional) does not apply here.
export default function PortalPage() {
  const { token } = useParams<{ token: string | string[] }>();
  const t = Array.isArray(token) ? token[0] : token;
  if (!t) return null;
  return <WorkerPortal token={t} />;
}
