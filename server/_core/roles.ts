/**
 * Phase 106 — role-based settings & permissions.
 *
 * A small, real role model layered on the existing `users.role` column. Roles are
 * ordered (a higher role satisfies a lower requirement). `requireRole` throws a
 * tRPC FORBIDDEN when the caller's role is insufficient — the same primitive
 * `adminProcedure` uses, but reusable for finer-grained gating (e.g. an operator
 * tier below full admin).
 *
 * This does not yet implement multi-user teams/tenancy (that is Phase 107 on the
 * roadmap); it makes the single-account role checks real and reusable.
 */
export type Role = "user" | "operator" | "admin";

const RANK: Record<Role, number> = { user: 0, operator: 1, admin: 2 };

export function normalizeRole(role: string | null | undefined): Role {
  if (role === "admin" || role === "operator" || role === "user") return role;
  return "user";
}

/** True when `have` meets or exceeds `need` in the role hierarchy. */
export function roleSatisfies(have: string | null | undefined, need: Role): boolean {
  return RANK[normalizeRole(have)] >= RANK[need];
}

/** Throw FORBIDDEN unless the user's role satisfies `need`. */
export async function requireRole(user: { role?: string | null } | null, need: Role): Promise<void> {
  if (!user || !roleSatisfies(user.role, need)) {
    const { TRPCError } = await import("@trpc/server");
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `This action requires the "${need}" role or higher.`,
    });
  }
}

/** The set of capabilities a role grants — used to drive role-based settings UI. */
export function capabilitiesFor(role: string | null | undefined): string[] {
  const r = normalizeRole(role);
  const caps: string[] = ["manage-own-cases", "export-own-data", "delete-own-account"];
  if (RANK[r] >= RANK.operator) caps.push("view-diagnostics", "run-retention-preview", "engage-emergency-stop");
  if (RANK[r] >= RANK.admin) caps.push("manage-flags", "run-retention", "release-emergency-stop", "view-all-diagnostics");
  return caps;
}
