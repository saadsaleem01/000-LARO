/**
 * Phase 057 — internationalization (Dutch/English readiness).
 *
 * A dependency-free i18n foundation: a message catalog keyed by message id, with
 * `nl` and `en` translations, plus `t(key, locale, vars)` with `{var}`
 * interpolation and a graceful fallback (requested locale → English → the key).
 *
 * This is the foundation the UI can adopt incrementally; it does not yet replace
 * every hardcoded string in the renderer (tracked as a follow-up). The legal
 * disclaimer (Phase 013) already ships NL + EN.
 */
export type Locale = "nl" | "en";
export const SUPPORTED_LOCALES: Locale[] = ["nl", "en"];
export const DEFAULT_LOCALE: Locale = "nl";

type Catalog = Record<string, { nl: string; en: string }>;

export const messages: Catalog = {
  "app.title": { nl: "LARO", en: "LARO" },
  "case.create": { nl: "Zaak aanmaken", en: "Create case" },
  "case.status.Intake": { nl: "Intake", en: "Intake" },
  "case.status.Matching": { nl: "Matchen", en: "Matching" },
  "case.status.Outreach": { nl: "Benaderen", en: "Outreach" },
  "case.status.Matched": { nl: "Gematcht", en: "Matched" },
  "case.status.Closed": { nl: "Gesloten", en: "Closed" },
  "outreach.pending": { nl: "Wacht op goedkeuring", en: "Pending approval" },
  "outreach.approved": { nl: "Goedgekeurd", en: "Approved" },
  "outreach.rejected": { nl: "Afgewezen", en: "Rejected" },
  "outreach.notSent": { nl: "Nog niet verzonden", en: "Not sent yet" },
  "validation.email": { nl: "Voer een geldig e-mailadres in", en: "Enter a valid email" },
  "validation.required": { nl: "Dit veld is verplicht", en: "This field is required" },
  "gdpr.exported": { nl: "Uw gegevens zijn geëxporteerd", en: "Your data has been exported" },
  "gdpr.deleted": { nl: "Uw account en gegevens zijn verwijderd", en: "Your account and data were deleted" },
  "matches.none": { nl: "Nog geen advocaten gevonden", en: "No lawyers found yet" },
};

export function isLocale(x: unknown): x is Locale {
  return typeof x === "string" && (SUPPORTED_LOCALES as string[]).includes(x);
}

export function normalizeLocale(input?: string | null): Locale {
  if (!input) return DEFAULT_LOCALE;
  const base = input.toLowerCase().split(/[-_]/)[0];
  return isLocale(base) ? base : DEFAULT_LOCALE;
}

/** Translate a message id. Falls back: requested locale → English → the key. */
export function t(key: string, locale: Locale = DEFAULT_LOCALE, vars?: Record<string, string | number>): string {
  const entry = messages[key];
  let str = entry ? (entry[locale] ?? entry.en) : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}
