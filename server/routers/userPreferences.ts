import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { userPreferences } from "../schema";
import { nanoid } from "nanoid";

const DEFAULT_NOTIFICATION_SETTINGS = {
  newMessages: { email: true, push: true, inApp: true },
  caseStatusChanges: { email: true, push: true, inApp: true },
  evidenceAdded: { email: false, push: true, inApp: true },
  lawyerAssigned: { email: true, push: true, inApp: true },
  gapDetected: { email: false, push: false, inApp: true },
};

export type AppWorkbenchPrefs = {
  outreach: {
    followUpIntervalDays: number;
    maxFollowUps: number;
    filterThreshold: number;
    batchLimit: number;
    scraperSchedule: string;
  };
  quickNotificationToggles: {
    lawyerMatch: boolean;
    emailActivity: boolean;
    newCase: boolean;
    scraper: boolean;
  };
};

const DEFAULT_APP_WORKBENCH: AppWorkbenchPrefs = {
  outreach: {
    followUpIntervalDays: 5,
    maxFollowUps: 2,
    filterThreshold: 3,
    batchLimit: 10,
    scraperSchedule: "Every Sunday at 2:00 AM",
  },
  quickNotificationToggles: {
    lawyerMatch: true,
    emailActivity: true,
    newCase: true,
    scraper: false,
  },
};

function effectiveUserId(ctx: { user: { id: string } }) {
  return ctx.user.id;
}

async function getRow(userId: string) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1);
  return row ?? null;
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseAppWorkbench(row: Awaited<ReturnType<typeof getRow>>): AppWorkbenchPrefs {
  const raw = parseJson<Partial<AppWorkbenchPrefs>>(row?.userPreferences ?? null, {});
  return {
    outreach: { ...DEFAULT_APP_WORKBENCH.outreach, ...raw.outreach },
    quickNotificationToggles: {
      ...DEFAULT_APP_WORKBENCH.quickNotificationToggles,
      ...raw.quickNotificationToggles,
    },
  };
}

export const userPreferencesRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const userId = effectiveUserId(ctx);
    const row = await getRow(userId);

    return {
      dashboardWidgets: parseJson<Record<string, boolean>>(row?.dashboardWidgets ?? null, {}),
      notificationSettings: parseJson<typeof DEFAULT_NOTIFICATION_SETTINGS>(
        row?.notificationSettings ?? null,
        DEFAULT_NOTIFICATION_SETTINGS
      ),
      preferredLawyers: parseJson<unknown[]>(row?.preferredLawyers ?? null, []),
      caseTemplates: parseJson<unknown[]>(row?.caseTemplates ?? null, []),
      appWorkbench: parseAppWorkbench(row),
    };
  }),

  updateWidgets: protectedProcedure
    .input(z.record(z.boolean()))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { ok: true };
      const userId = effectiveUserId(ctx);
      const existing = await getRow(userId);
      const merged = { ...parseJson(existing?.dashboardWidgets ?? null, {}), ...input };
      const payload = JSON.stringify(merged);

      if (existing) {
        await db
          .update(userPreferences)
          .set({ dashboardWidgets: payload, updatedAt: new Date() })
          .where(eq(userPreferences.userId, userId));
      } else {
        await db.insert(userPreferences).values({
          id: nanoid(),
          userId,
          dashboardWidgets: payload,
          updatedAt: new Date(),
        });
      }
      return { ok: true };
    }),

  updateNotifications: protectedProcedure
    .input(z.any())
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { ok: true };
      const userId = effectiveUserId(ctx);
      const existing = await getRow(userId);
      const prev = parseJson(existing?.notificationSettings ?? null, DEFAULT_NOTIFICATION_SETTINGS);

      let next: typeof DEFAULT_NOTIFICATION_SETTINGS & Record<string, unknown>;
      if (input && typeof input === "object" && "notificationSettings" in input && input.notificationSettings) {
        next = { ...prev, ...input.notificationSettings };
      } else if (input && typeof input === "object") {
        next = { ...prev, ...input };
      } else {
        next = prev;
      }

      const payload = JSON.stringify(next);

      if (existing) {
        await db
          .update(userPreferences)
          .set({ notificationSettings: payload, updatedAt: new Date() })
          .where(eq(userPreferences.userId, userId));
      } else {
        await db.insert(userPreferences).values({
          id: nanoid(),
          userId,
          notificationSettings: payload,
          updatedAt: new Date(),
        });
      }
      return { ok: true };
    }),

  updateAppWorkbench: protectedProcedure
    .input(
      z.object({
        outreach: z
          .object({
            followUpIntervalDays: z.number().min(1).max(90).optional(),
            maxFollowUps: z.number().min(0).max(20).optional(),
            filterThreshold: z.number().min(0).max(100).optional(),
            batchLimit: z.number().min(1).max(500).optional(),
            scraperSchedule: z.string().max(500).optional(),
          })
          .optional(),
        quickNotificationToggles: z
          .object({
            lawyerMatch: z.boolean().optional(),
            emailActivity: z.boolean().optional(),
            newCase: z.boolean().optional(),
            scraper: z.boolean().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return { ok: true };
      const userId = effectiveUserId(ctx);
      const existing = await getRow(userId);
      const prev = existing ? parseAppWorkbench(existing) : DEFAULT_APP_WORKBENCH;
      const next: AppWorkbenchPrefs = {
        outreach: { ...prev.outreach, ...input.outreach },
        quickNotificationToggles: { ...prev.quickNotificationToggles, ...input.quickNotificationToggles },
      };
      const payload = JSON.stringify(next);

      if (existing) {
        await db
          .update(userPreferences)
          .set({ userPreferences: payload, updatedAt: new Date() })
          .where(eq(userPreferences.userId, userId));
      } else {
        await db.insert(userPreferences).values({
          id: nanoid(),
          userId,
          userPreferences: payload,
          updatedAt: new Date(),
        });
      }
      return { ok: true };
    }),

  togglePreferredLawyer: protectedProcedure
    .input(z.object({ lawyerId: z.string() }))
    .mutation(async ({ ctx }) => {
      void ctx;
      return { ok: true };
    }),

  updateCaseTemplates: protectedProcedure.input(z.any()).mutation(async () => ({ ok: true })),
});
