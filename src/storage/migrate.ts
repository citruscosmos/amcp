import type Database from 'better-sqlite3';

export interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'remove work_domain column — existing work_domain values will be permanently dropped (schema v0.3)',
    up: (db) => {
      const cols = db.pragma('table_info(records)') as Array<{ name: string }>;
      if (cols.some((c) => c.name === 'work_domain')) {
        try {
          db.exec(`ALTER TABLE records DROP COLUMN work_domain`);
        } catch {
          console.warn(
            'iedi: ALTER TABLE DROP COLUMN not supported (SQLite < 3.35.0). ' +
            'work_domain column will remain but is ignored by the application.'
          );
        }
      }
    },
  },
  {
    version: 2,
    description: 'add per-actor hash chain indices for multi-actor directional prev_hash lookups',
    up: (db) => {
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_records_requester_closed
          ON records (requester_actor_id, closed_at DESC);
        CREATE INDEX IF NOT EXISTS idx_records_provider_closed
          ON records (provider_actor_id, closed_at DESC);
      `);
    },
  },
];

export function runMigrations(db: Database.Database): void {
  for (let i = 1; i < MIGRATIONS.length; i++) {
    if (MIGRATIONS[i].version <= MIGRATIONS[i - 1].version) {
      throw new Error(
        `MIGRATIONS must be sorted by version ascending. ` +
        `Found ${MIGRATIONS[i].version} after ${MIGRATIONS[i - 1].version}.`
      );
    }
  }

  const currentVersion = db.pragma('user_version', { simple: true }) as number;
  const tableExists = (
    db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='records'`
    ).get() as { name: string } | undefined
  ) !== undefined;

  if (!tableExists || currentVersion >= MIGRATIONS.length) {
    return;
  }

  for (const m of MIGRATIONS) {
    if (currentVersion < m.version) {
      m.up(db);
      db.pragma(`user_version = ${m.version}`);
    }
  }
}
