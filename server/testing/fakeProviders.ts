/**
 * Phase 038 — fake provider lab for tests only.
 *
 * In-memory fakes for the external providers (email, storage, LLM) so tests can
 * exercise flows without real credentials or network. These are HARD-GUARDED
 * against production use: constructing them when NODE_ENV === 'production'
 * throws, so a fake can never be presented as a real provider in prod.
 */
function assertNotProduction(what: string): void {
  if ((process.env.NODE_ENV || 'production') === 'production') {
    throw new Error(`[FakeProviders] ${what} must never be used in production.`);
  }
}

export interface SentEmail {
  to: string;
  subject: string;
  body: string;
}

/** Fake email provider — records "sent" mail instead of transmitting it. */
export class FakeEmailProvider {
  readonly sent: SentEmail[] = [];
  constructor() {
    assertNotProduction('FakeEmailProvider');
  }
  async send(email: SentEmail): Promise<{ success: true; id: string }> {
    this.sent.push(email);
    return { success: true, id: `fake-${this.sent.length}` };
  }
}

/** Fake object storage — keeps bytes in a Map. */
export class FakeStorage {
  readonly objects = new Map<string, Buffer>();
  constructor() {
    assertNotProduction('FakeStorage');
  }
  async put(key: string, body: Buffer | string): Promise<{ key: string }> {
    this.objects.set(key, Buffer.isBuffer(body) ? body : Buffer.from(body));
    return { key };
  }
  async get(key: string): Promise<Buffer | undefined> {
    return this.objects.get(key);
  }
}

/** Fake LLM — deterministic canned response, clearly labelled as fake. */
export function fakeLLM(prompt: string): { text: string; provider: 'fake' } {
  assertNotProduction('fakeLLM');
  return { text: `[FAKE LLM RESPONSE] echo: ${prompt.slice(0, 40)}`, provider: 'fake' };
}
