/**
 * Phase 027 — notifications and reminders.
 *
 * A real, DB-backed notification writer used by workflow events (case created,
 * outreach approved, etc.). Rows land in the `notifications` table that the
 * `notifications` router already reads (list / unreadCount / markAsRead), so
 * these show up in the UI's notification surface.
 *
 * This is distinct from the console-only `notification.ts:notifyOwner` operator
 * stub; this one persists user-facing notifications.
 */
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { notifications } from "./schema";

export async function createNotification(params: {
  userId: string;
  title: string;
  body?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Notifications] DB not available; dropping notification:", params.title);
    return;
  }
  try {
    await db.insert(notifications).values({
      id: nanoid(),
      userId: params.userId,
      title: params.title,
      body: params.body ?? null,
      read: false,
      createdAt: new Date(),
    } as any);
  } catch (e) {
    console.error("[Notifications] Failed to create notification:", e);
  }
}
