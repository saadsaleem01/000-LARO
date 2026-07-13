/**
 * Phase 106 — role-based settings & team permissions (multi-user access).
 *
 * A real team model: a team owner grants other users access to their cases. This
 * turns the single-user app into a genuine multi-user one for shared case work,
 * without a schema migration — memberships are stored in system_config as JSON.
 *
 * Access rule (enforced in `assertCaseOwnership`): a user may access a case if
 * they own it OR they are a member of the case owner's team.
 */
import { getSystemValue, setSystemValue } from "./systemState";

function membersKey(ownerId: string): string {
  return `team:${ownerId}:members`;
}

/** The userIds who are members of `ownerId`'s team (excludes the owner). */
export async function getTeamMembers(ownerId: string): Promise<string[]> {
  const raw = await getSystemValue(membersKey(ownerId));
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function addTeamMember(ownerId: string, memberId: string): Promise<string[]> {
  if (memberId === ownerId) return getTeamMembers(ownerId);
  const members = new Set(await getTeamMembers(ownerId));
  members.add(memberId);
  const list = [...members];
  await setSystemValue(membersKey(ownerId), JSON.stringify(list));
  return list;
}

export async function removeTeamMember(ownerId: string, memberId: string): Promise<string[]> {
  const list = (await getTeamMembers(ownerId)).filter((m) => m !== memberId);
  await setSystemValue(membersKey(ownerId), JSON.stringify(list));
  return list;
}

/** True when `userId` may access a case owned by `ownerId` (owner or teammate). */
export async function hasCaseAccessViaTeam(ownerId: string, userId: string): Promise<boolean> {
  if (ownerId === userId) return true;
  return (await getTeamMembers(ownerId)).includes(userId);
}
