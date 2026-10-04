import type { ReactNode } from "react";
import { AuthorizedShell, commandCenterPermissions } from "../_components/AuthorizedShell";
import { requirePagePermissions } from "../../lib/auth/page-actor";

export default async function Layout({ children }: { children: ReactNode }) {
  const actor = await requirePagePermissions(commandCenterPermissions);
  return <AuthorizedShell actor={actor}>{children}</AuthorizedShell>;
}
