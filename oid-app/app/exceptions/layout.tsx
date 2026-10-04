import type { ReactNode } from "react";
import { AuthorizedShell } from "../_components/AuthorizedShell";
import { requirePagePermission } from "../../lib/auth/page-actor";
import { PERMISSIONS } from "../../lib/permissions";

export default async function Layout({ children }: { children: ReactNode }) {
  const actor = await requirePagePermission(PERMISSIONS.EXCEPTION_READ);
  return <AuthorizedShell actor={actor}>{children}</AuthorizedShell>;
}
