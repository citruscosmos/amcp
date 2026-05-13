import Database from 'better-sqlite3';
import { createHash } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { ulid } from 'ulid';
import { canonicalize } from 'json-canonicalize';

// ---- Types ----------------------------------------------------------------

export type ModeUsed = 'autonomous' | 'cooperative' | 'delegated';

export type Status = 'open' | 'completed' | 'failed' | 'cancelled';

export interface Evidence {
  timestamp: string;
  content: string;
  source: string;
}

export interface Insight {
  requester: string | null;
  provider: string | null;
}

export interface IediRecord {
  record_id: string;
  schema_version: string;
  tool_called: string | null;
  requester_actor_id: string;
  provider_actor_id: string;
  mode_used: ModeUsed;
  status: Status;
  intent: string;
  evidence: Evidence[];
  delta: string | null;
  insight: Insight | null;
  requester_prev_record_hash: string | null;
  provider_prev_record_hash: string | null;
  record_hash: string | null;
  created_at: string;
  closed_at: string | null;
}

export interface OpenRecordParams {
  intent: string;
  tool_called?: string;
  mode_used?: ModeUsed;
}

export interface CloseRecordParams {
  record_id: string;
  delta: string;
  insight_provider?: string;
  insight_requester?: string;
  status?: 'completed' | 'failed';
}

export interface IediStoreOptions {
  dbPath?: string;
  actorId?: string;
}

// ---- Constants & filesystem helpers --------------------------------------

const SCHEMA_VERSION = '0.3';

function defaultIediDir(): string {
  const dbPath = process.env['IEDI_DB_PATH'];
  if (dbPath) return dirname(dbPath);
  const ws = process.env['IEDI_WORKSPACE'];
  if (!ws) throw new Error('IEDI_WORKSPACE is not set. Run /iedi-setup first.');
  return join(ws, '.iedi');
}

function defaultDbPath(): string {
  return process.env['IEDI_DB_PATH'] ?? join(defaultIediDir(), 'records.db');
}

function configPath(iediDir: string): string {
  return join(iediDir, 'config.json');
}

interface Config {
  actor_id: string;
  created_at: string;
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function getOrCreateConfig(iediDir: string): { config: Config; isNew: boolean } {
  ensureDir(iediDir);
  const cfgPath = configPath(iediDir);
  if (existsSync(cfgPath)) {
    return { config: JSON.parse(readFileSync(cfgPath, 'utf-8')) as Config, isNew: false };
  }
  const config: Config = { actor_id: ulid(), created_at: new Date().toISOString() };
  writeFileSync(cfgPath, JSON.stringify(config, null, 2), 'utf-8');
  return { config, isNew: true };
}

// ---- SQLite schema -------------------------------------------------------

function initDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      record_id                  TEXT PRIMARY KEY,
      schema_version             TEXT NOT NULL,
      tool_called                TEXT,
      requester_actor_id         TEXT NOT NULL,
      provider_actor_id          TEXT NOT NULL,
      mode_used                  TEXT NOT NULL CHECK(mode_used IN ('autonomous','cooperative','delegated')),
      status                     TEXT NOT NULL CHECK(status IN ('open','completed','failed','cancelled')),
      intent                     TEXT NOT NULL,
      evidence                   TEXT NOT NULL,
      delta                      TEXT,
      insight                    TEXT,
      requester_prev_record_hash TEXT,
      provider_prev_record_hash  TEXT,
      record_hash                TEXT,
      created_at                 TEXT NOT NULL,
      closed_at                  TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_records_status     ON records (status);
    CREATE INDEX IF NOT EXISTS idx_records_closed_at  ON records (closed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_records_created_at ON records (created_at DESC);
  `);
}

// ---- Hash computation ----------------------------------------------------

export function computeHash(record: IediRecord): string {
  // Exclude record_hash itself and build a plain object in a deterministic field order.
  // JCS (RFC 8785) sorts keys, so insertion order doesn't matter, but being explicit
  // makes the exclusion of record_hash obvious.
  const payload: Omit<IediRecord, 'record_hash'> = {
    record_id: record.record_id,
    schema_version: record.schema_version,
    tool_called: record.tool_called,
    requester_actor_id: record.requester_actor_id,
    provider_actor_id: record.provider_actor_id,
    mode_used: record.mode_used,
    status: record.status,
    intent: record.intent,
    evidence: record.evidence,
    delta: record.delta,
    insight: record.insight,
    requester_prev_record_hash: record.requester_prev_record_hash,
    provider_prev_record_hash: record.provider_prev_record_hash,
    created_at: record.created_at,
    closed_at: record.closed_at,
  };
  const canonical = canonicalize(payload as Record<string, unknown>);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

// ---- Row deserialization -------------------------------------------------

function rowToRecord(row: Record<string, unknown>): IediRecord {
  return {
    record_id: row['record_id'] as string,
    schema_version: row['schema_version'] as string,
    tool_called: (row['tool_called'] ?? null) as string | null,
    requester_actor_id: row['requester_actor_id'] as string,
    provider_actor_id: row['provider_actor_id'] as string,
    mode_used: row['mode_used'] as ModeUsed,
    status: row['status'] as Status,
    intent: row['intent'] as string,
    evidence: JSON.parse(row['evidence'] as string) as Evidence[],
    delta: (row['delta'] ?? null) as string | null,
    insight: row['insight'] ? (JSON.parse(row['insight'] as string) as Insight) : null,
    requester_prev_record_hash: (row['requester_prev_record_hash'] ?? null) as string | null,
    provider_prev_record_hash: (row['provider_prev_record_hash'] ?? null) as string | null,
    record_hash: (row['record_hash'] ?? null) as string | null,
    created_at: row['created_at'] as string,
    closed_at: (row['closed_at'] ?? null) as string | null,
  };
}

// ---- IediStore -----------------------------------------------------------

export class IediStore {
  private db: Database.Database;
  private _actorId: string;
  readonly isNewActor: boolean;

  constructor(options: IediStoreOptions = {}) {
    const envActorId = process.env['IEDI_ACTOR_ID'];
    const dbPath = options.dbPath ?? defaultDbPath();

    if (options.actorId ?? envActorId) {
      this._actorId = (options.actorId ?? envActorId)!;
      this.isNewActor = false;
      // For :memory: or explicit dbPath with no config needed, skip dir creation.
      if (dbPath !== ':memory:' && !options.actorId) {
        ensureDir(defaultIediDir());
      }
    } else {
      const iediDir = defaultIediDir();
      const { config, isNew } = getOrCreateConfig(iediDir);
      this._actorId = config.actor_id;
      this.isNewActor = isNew;
    }

    this.db = new Database(dbPath);
    initDb(this.db);
  }

  get actorId(): string {
    return this._actorId;
  }

  // ---- write operations --------------------------------------------------

  openRecord(params: OpenRecordParams): IediRecord {
    return this.db.transaction((): IediRecord => {
      const existing = this.db
        .prepare(`SELECT record_id FROM records WHERE status = 'open' LIMIT 1`)
        .get() as { record_id: string } | undefined;

      if (existing) {
        throw new Error(
          `Open record already exists (${existing.record_id}). Run 'iedi close --last' first.`,
        );
      }

      const lastClosed = this.db
        .prepare(
          `SELECT record_hash FROM records WHERE record_hash IS NOT NULL ORDER BY closed_at DESC, record_id DESC LIMIT 1`,
        )
        .get() as { record_hash: string } | undefined;

      const prevHash = lastClosed?.record_hash ?? null;
      const modeUsed: ModeUsed = params.mode_used ?? 'cooperative';

      const record: IediRecord = {
        record_id: ulid(),
        schema_version: SCHEMA_VERSION,
        tool_called: params.tool_called ?? null,
        requester_actor_id: this._actorId,
        provider_actor_id: this._actorId,
        mode_used: modeUsed,
        status: 'open',
        intent: params.intent,
        evidence: [],
        delta: null,
        insight: null,
        requester_prev_record_hash: prevHash,
        provider_prev_record_hash: prevHash,
        record_hash: null,
        created_at: new Date().toISOString(),
        closed_at: null,
      };

      this.db
        .prepare(
          `INSERT INTO records (
            record_id, schema_version, tool_called,
            requester_actor_id, provider_actor_id, mode_used, status,
            intent, evidence, delta, insight,
            requester_prev_record_hash, provider_prev_record_hash,
            record_hash, created_at, closed_at
          ) VALUES (
            @record_id, @schema_version, @tool_called,
            @requester_actor_id, @provider_actor_id, @mode_used, @status,
            @intent, @evidence, @delta, @insight,
            @requester_prev_record_hash, @provider_prev_record_hash,
            @record_hash, @created_at, @closed_at
          )`,
        )
        .run({
          ...record,
          evidence: JSON.stringify(record.evidence),
          insight: null,
        });

      return record;
    })();
  }

  appendEvidence(recordId: string, item: Omit<Evidence, 'timestamp'>): IediRecord {
    return this.db.transaction((): IediRecord => {
      const row = this.db
        .prepare(`SELECT * FROM records WHERE record_id = ?`)
        .get(recordId) as Record<string, unknown> | undefined;

      if (!row) throw new Error(`Record not found: ${recordId}`);

      const record = rowToRecord(row);
      if (record.status !== 'open') {
        throw new Error(`Record ${recordId} is not open (status: ${record.status})`);
      }

      const newItem: Evidence = {
        timestamp: new Date().toISOString(),
        content: item.content,
        source: item.source,
      };
      const updatedEvidence = [...record.evidence, newItem];

      this.db
        .prepare(`UPDATE records SET evidence = ? WHERE record_id = ?`)
        .run(JSON.stringify(updatedEvidence), recordId);

      return { ...record, evidence: updatedEvidence };
    })();
  }

  closeRecord(params: CloseRecordParams): IediRecord {
    return this.db.transaction((): IediRecord => {
      const row = this.db
        .prepare(`SELECT * FROM records WHERE record_id = ?`)
        .get(params.record_id) as Record<string, unknown> | undefined;

      if (!row) throw new Error(`Record not found: ${params.record_id}`);

      const record = rowToRecord(row);
      if (record.status !== 'open') {
        throw new Error(
          `Record ${params.record_id} is already closed (status: ${record.status})`,
        );
      }

      const closedAt = new Date().toISOString();
      const insight: Insight | null =
        params.insight_provider || params.insight_requester
          ? { requester: params.insight_requester ?? null, provider: params.insight_provider ?? null }
          : null;
      const status: Status = params.status ?? 'completed';

      const updated: IediRecord = {
        ...record,
        delta: params.delta,
        insight,
        status,
        closed_at: closedAt,
        record_hash: null,
      };

      const hash = computeHash(updated);
      updated.record_hash = hash;

      this.db
        .prepare(
          `UPDATE records SET
            delta      = @delta,
            insight    = @insight,
            status     = @status,
            closed_at  = @closed_at,
            record_hash = @record_hash
          WHERE record_id = @record_id`,
        )
        .run({
          delta: params.delta,
          insight: insight ? JSON.stringify(insight) : null,
          status,
          closed_at: closedAt,
          record_hash: hash,
          record_id: params.record_id,
        });

      return updated;
    })();
  }

  // ---- read operations ---------------------------------------------------

  getOpenRecord(): IediRecord | null {
    const row = this.db
      .prepare(`SELECT * FROM records WHERE status = 'open' LIMIT 1`)
      .get() as Record<string, unknown> | undefined;
    return row ? rowToRecord(row) : null;
  }

  getRecord(recordId: string): IediRecord | null {
    const row = this.db
      .prepare(`SELECT * FROM records WHERE record_id = ?`)
      .get(recordId) as Record<string, unknown> | undefined;
    return row ? rowToRecord(row) : null;
  }

  listRecords(filters?: { limit?: number }): IediRecord[] {
    let query = `SELECT * FROM records`;
    const params: unknown[] = [];

    query += ` ORDER BY record_id DESC`;

    if (filters?.limit) {
      query += ` LIMIT ?`;
      params.push(filters.limit);
    }

    const rows = this.db.prepare(query).all(...params) as Record<string, unknown>[];
    return rows.map(rowToRecord);
  }

  close(): void {
    this.db.close();
  }
}
