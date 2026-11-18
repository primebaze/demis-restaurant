/**
 * Who's who for Demi's Meetings: active staff from the clock-in app plus the
 * branch each person was given here (MeetStaff).
 */
import { prisma } from "@/lib/prisma";
import { getClockinStaff, isManagerRole, type ClockinStaff } from "@/lib/clockin";

export type Person = ClockinStaff & { branch: string; manager: boolean; kitchen: boolean };

const KITCHEN = /cook|chef|kitchen|porter|prep/i;

export async function activePeople(): Promise<Person[]> {
  const staff = (await getClockinStaff()).filter((s) => s.active);
  const rows = await prisma.meetStaff.findMany({ where: { clockinId: { in: staff.map((s) => s.id) } } });
  const branchOf = new Map(rows.map((r) => [r.clockinId, r.branch]));
  return staff.map((s) => ({ ...s, branch: branchOf.get(s.id) || "", manager: isManagerRole(s.role), kitchen: KITCHEN.test(s.role) }));
}

export const AUDIENCES = ["everyone", "cricklewood", "streatham", "kitchen"] as const;
export type Audience = (typeof AUDIENCES)[number];
export const isAudience = (a: unknown): a is Audience => typeof a === "string" && (AUDIENCES as readonly string[]).includes(a);

/** Does a post for this audience reach this person? People with no branch (or both) see both branches' posts. */
export function inAudience(p: Pick<Person, "branch" | "kitchen" | "manager">, audience: string): boolean {
  if (audience === "everyone") return true;
  if (audience === "kitchen") return p.kitchen || p.manager;
  return p.branch === audience || p.branch === "both" || p.branch === "" || p.manager;
}

export const firstNameOf = (name: string) => name.trim().split(/\s+/)[0] || name;
