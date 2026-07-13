# Backup & Restore (Phase 053)

Date: 2026-07-06 · Branch `Phase-Imp`

Real SQLite backup/restore in `server/backup.ts`.

## Backup
- `backupDatabase(destPath)` uses better-sqlite3's online `.backup()` — a
  consistent copy that is safe while the app is running. Returns `{ path, bytes }`.
- The server DB lives at `DATABASE_URL` (desktop: `<userData>/laro-server.sqlite`).

## Restore
- `validateBackup(srcPath)` confirms the file is a SQLite DB containing the core
  tables (`users`, `cases`) before any destructive action.
- `restoreDatabase(srcPath)` keeps a timestamped `.bak-<ts>` of the current DB,
  copies the backup over the live file, and removes stale `-wal`/`-shm` sidecars.
- **The app must be restarted** afterward so the restored DB is opened.

## Operator procedure
1. Close LARO.
2. Copy `<userData>/laro-server.sqlite` somewhere safe (or call `backupDatabase`).
3. To restore: place the backup file, call `restoreDatabase(path)`, relaunch.

## Verification
`tests/backend/phase051_060.test.ts` backs up a live DB to a temp file and
asserts it is a valid, restorable SQLite DB containing `cases`.

## CLI
`npx tsx scripts/backup.ts <dest.sqlite>` — one-shot backup of the configured DB.
