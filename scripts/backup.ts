/**
 * Phase 053 — one-shot DB backup CLI.
 * Usage: npx tsx scripts/backup.ts <dest.sqlite>
 */
import { backupDatabase } from '../server/backup';

async function main() {
  const dest = process.argv[2];
  if (!dest) {
    console.error('Usage: npx tsx scripts/backup.ts <dest.sqlite>');
    process.exit(1);
  }
  const res = await backupDatabase(dest);
  console.log(`[Backup] Wrote ${res.bytes} bytes to ${res.path}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('[Backup] Failed:', e);
  process.exit(1);
});
