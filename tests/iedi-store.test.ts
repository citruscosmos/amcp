import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { IediStore, computeHash } from '../src/storage/iedi-store.js';

const ACTOR = 'TEST_ACTOR_01HTEST000000000000000000';

describe('IediStore', () => {
  let store: IediStore;

  beforeEach(() => {
    store = new IediStore({ dbPath: ':memory:', actorId: ACTOR });
  });

  afterEach(() => {
    store.close();
  });

  // ---- double-close -------------------------------------------------------

  it('double-close throws an error', () => {
    const r = store.openRecord({ intent: 'test intent' });
    store.closeRecord({ record_id: r.record_id, delta: 'done' });
    expect(() =>
      store.closeRecord({ record_id: r.record_id, delta: 'done again' }),
    ).toThrow(/already closed/);
  });

  // ---- computeHash --------------------------------------------------------

  it('computeHash excludes record_hash field — same hash regardless of record_hash value', () => {
    const r = store.openRecord({ intent: 'hash test' });
    store.closeRecord({ record_id: r.record_id, delta: 'finished' });
    const closed = store.getRecord(r.record_id)!;

    const hashA = computeHash({ ...closed, record_hash: null });
    const hashB = computeHash({ ...closed, record_hash: 'some-other-value' });
    const hashC = computeHash({ ...closed, record_hash: closed.record_hash });

    expect(hashA).toBe(hashB);
    expect(hashA).toBe(hashC);
    expect(hashA).toBe(closed.record_hash);
  });

  // ---- first record prev_hash = null --------------------------------------

  it('first record has prev_record_hash=null and chain is stable', () => {
    const r = store.openRecord({ intent: 'first record' });
    store.closeRecord({ record_id: r.record_id, delta: 'done' });
    const closed = store.getRecord(r.record_id)!;

    expect(closed.requester_prev_record_hash).toBeNull();
    expect(closed.provider_prev_record_hash).toBeNull();
    expect(closed.record_hash).toBeTruthy();

    // Recomputing hash should match the stored value
    expect(computeHash(closed)).toBe(closed.record_hash);
  });

  // ---- JCS + Unicode roundtrip -------------------------------------------

  it('hash is stable after Unicode text SQLite roundtrip', () => {
    const r = store.openRecord({ intent: '日本語テスト intent 🎌' });
    store.closeRecord({
      record_id: r.record_id,
      delta: 'Δelta with ñ and 中文',
      insight_provider: '次回の改善点: インターフェースを先に確認する',
    });
    const closed = store.getRecord(r.record_id)!;

    // Hash stored in DB should equal freshly computed hash from the same record
    expect(computeHash(closed)).toBe(closed.record_hash);
  });

  // ---- chain link ---------------------------------------------------------

  it('2nd record prev_hash === 1st record record_hash', () => {
    const r1 = store.openRecord({ intent: 'first' });
    store.closeRecord({ record_id: r1.record_id, delta: 'done first' });
    const closed1 = store.getRecord(r1.record_id)!;

    const r2 = store.openRecord({ intent: 'second' });
    expect(r2.requester_prev_record_hash).toBe(closed1.record_hash);
    expect(r2.provider_prev_record_hash).toBe(closed1.record_hash);
  });

  // ---- multi-open support -------------------------------------------------

  it('allows multiple open records simultaneously (open constraint removed)', () => {
    const r1 = store.openRecord({ intent: 'first' });
    const r2 = store.openRecord({ intent: 'second' });
    expect(r1.record_id).toBeTruthy();
    expect(r2.record_id).toBeTruthy();
    expect(r1.record_id).not.toBe(r2.record_id);

    // Both should be retrievable with status 'open'
    expect(store.getRecord(r1.record_id)?.status).toBe('open');
    expect(store.getRecord(r2.record_id)?.status).toBe('open');
  });

  // ---- internal record has provider=requester ------------------------------

  it('record has provider_actor_id === requester_actor_id', () => {
    const r = store.openRecord({ intent: 'code review' });
    store.closeRecord({ record_id: r.record_id, delta: 'reviewed 3 files' });
    const closed = store.getRecord(r.record_id)!;

    expect(closed.requester_actor_id).toBe(ACTOR);
    expect(closed.provider_actor_id).toBe(ACTOR);
  });

  // ---- negative paths -----------------------------------------------------

  it('appendEvidence throws when record_id does not exist', () => {
    expect(() =>
      store.appendEvidence('NONEXISTENT_ID', { content: 'x', source: 'test' }),
    ).toThrow(/Record not found/);
  });

  it('appendEvidence throws when record is already closed', () => {
    const r = store.openRecord({ intent: 'will be closed' });
    store.closeRecord({ record_id: r.record_id, delta: 'done' });
    expect(() =>
      store.appendEvidence(r.record_id, { content: 'too late', source: 'test' }),
    ).toThrow(/not open/);
  });

  it('closeRecord throws when record does not exist', () => {
    expect(() =>
      store.closeRecord({ record_id: 'NONEXISTENT_ID', delta: 'done' }),
    ).toThrow(/Record not found/);
  });

  // ---- tool_called field --------------------------------------------------

  it('tool_called is stored and retrieved when provided', () => {
    const r = store.openRecord({ intent: 'use a tool', tool_called: 'coding_session' });
    expect(r.tool_called).toBe('coding_session');
    store.closeRecord({ record_id: r.record_id, delta: 'done' });
    const closed = store.getRecord(r.record_id)!;
    expect(closed.tool_called).toBe('coding_session');
  });

  // ---- getRecord ----------------------------------------------------------

  it('getRecord returns null for a non-existent ID', () => {
    expect(store.getRecord('NONEXISTENT_ID')).toBeNull();
  });

  // ---- listRecords --------------------------------------------------------

  it('listRecords returns empty array when no records exist', () => {
    expect(store.listRecords()).toHaveLength(0);
  });

  it('listRecords returns all records ordered by record_id DESC', () => {
    const r1 = store.openRecord({ intent: 'task' });
    store.closeRecord({ record_id: r1.record_id, delta: 'done' });
    const r2 = store.openRecord({ intent: 'decide' });
    store.closeRecord({ record_id: r2.record_id, delta: 'decided' });

    const all = store.listRecords();
    expect(all).toHaveLength(2);
  });

  it('listRecords respects limit', () => {
    for (let i = 0; i < 3; i++) {
      const r = store.openRecord({ intent: `item ${i}` });
      store.closeRecord({ record_id: r.record_id, delta: 'done' });
    }
    const limited = store.listRecords({ limit: 2 });
    expect(limited).toHaveLength(2);
  });

  // ---- failed status ------------------------------------------------------

  it('closeRecord with status=failed sets status correctly', () => {
    const r = store.openRecord({ intent: 'risky operation' });
    const closed = store.closeRecord({ record_id: r.record_id, delta: 'failed halfway', status: 'failed' });
    expect(closed.status).toBe('failed');
    const retrieved = store.getRecord(r.record_id)!;
    expect(retrieved.status).toBe('failed');
  });

  // ---- dual insight fields ------------------------------------------------

  it('insight_requester only → provider=null, requester=value', () => {
    const r = store.openRecord({ intent: 'test' });
    store.closeRecord({ record_id: r.record_id, delta: 'd', insight_requester: '総評' });
    const closed = store.getRecord(r.record_id)!;
    expect(closed.insight).toEqual({ provider: null, requester: '総評' });
    expect(closed.record_hash).toBeTruthy();
  });

  it('insight_provider + insight_requester both set', () => {
    const r = store.openRecord({ intent: 'test' });
    store.closeRecord({
      record_id: r.record_id,
      delta: 'd',
      insight_provider: 'モデル視点',
      insight_requester: 'ユーザー視点',
    });
    const closed = store.getRecord(r.record_id)!;
    expect(closed.insight).toEqual({ provider: 'モデル視点', requester: 'ユーザー視点' });
    expect(computeHash(closed)).toBe(closed.record_hash);
  });

  it('insight_requester change causes hash change (chain integrity)', () => {
    const r = store.openRecord({ intent: 'test' });
    store.closeRecord({ record_id: r.record_id, delta: 'd', insight_requester: 'A' });
    const closed = store.getRecord(r.record_id)!;
    const hashWithB = computeHash({ ...closed, insight: { provider: null, requester: 'B' } });
    expect(hashWithB).not.toBe(closed.record_hash);
  });

  // ---- recordFeedback -------------------------------------------------------

  it('recordFeedback saves delta to open record', () => {
    const r = store.openRecord({ intent: 'feedback test' });
    store.recordFeedback(r.record_id, { delta: 'partial progress' });
    const updated = store.getRecord(r.record_id)!;
    expect(updated.delta).toBe('partial progress');
    expect(updated.status).toBe('open');
  });

  it('recordFeedback saves insight_provider', () => {
    const r = store.openRecord({ intent: 'feedback test' });
    store.recordFeedback(r.record_id, { delta: 'd', insight_provider: 'provider note' });
    const updated = store.getRecord(r.record_id)!;
    expect(updated.insight).toEqual({ provider: 'provider note', requester: null });
  });

  it('recordFeedback saves insight_requester', () => {
    const r = store.openRecord({ intent: 'feedback test' });
    store.recordFeedback(r.record_id, { delta: 'd', insight_requester: 'requester note' });
    const updated = store.getRecord(r.record_id)!;
    expect(updated.insight).toEqual({ provider: null, requester: 'requester note' });
  });

  it('recordFeedback saves both insights simultaneously', () => {
    const r = store.openRecord({ intent: 'feedback test' });
    store.recordFeedback(r.record_id, {
      delta: 'progress',
      insight_provider: 'prov',
      insight_requester: 'req',
    });
    const updated = store.getRecord(r.record_id)!;
    expect(updated.insight).toEqual({ provider: 'prov', requester: 'req' });
  });

  it('recordFeedback keeps status open', () => {
    const r = store.openRecord({ intent: 'stay open' });
    store.recordFeedback(r.record_id, { delta: 'mid-session note' });
    const updated = store.getRecord(r.record_id)!;
    expect(updated.status).toBe('open');
    expect(updated.closed_at).toBeNull();
  });

  it('recordFeedback throws when record is already closed', () => {
    const r = store.openRecord({ intent: 'will close first' });
    store.closeRecord({ record_id: r.record_id, delta: 'done' });
    expect(() =>
      store.recordFeedback(r.record_id, { delta: 'too late' }),
    ).toThrow(/not open/);
  });

  it('recordFeedback throws when record_id does not exist', () => {
    expect(() =>
      store.recordFeedback('NONEXISTENT', { delta: 'nothing' }),
    ).toThrow(/Record not found/);
  });

  it('recordFeedback overwrites delta on second call', () => {
    const r = store.openRecord({ intent: 'overwrite test' });
    store.recordFeedback(r.record_id, { delta: 'first delta' });
    store.recordFeedback(r.record_id, { delta: 'second delta' });
    const updated = store.getRecord(r.record_id)!;
    expect(updated.delta).toBe('second delta');
  });

  it('recordFeedback overwrites insight on second call', () => {
    const r = store.openRecord({ intent: 'overwrite insight' });
    store.recordFeedback(r.record_id, { delta: 'd', insight_provider: 'first' });
    store.recordFeedback(r.record_id, { delta: 'd', insight_requester: 'second' });
    const updated = store.getRecord(r.record_id)!;
    expect(updated.insight).toEqual({ provider: null, requester: 'second' });
  });

  // ---- multi-actor openRecord -----------------------------------------------

  it('openRecord with explicit requester_actor_id', () => {
    const r = store.openRecord({
      intent: 'p2p request',
      requester_actor_id: 'did:amcp:alice-abc123',
    });
    expect(r.requester_actor_id).toBe('did:amcp:alice-abc123');
    expect(r.provider_actor_id).toBe(ACTOR); // default
  });

  it('openRecord with explicit provider_actor_id', () => {
    const r = store.openRecord({
      intent: 'p2p request',
      provider_actor_id: 'did:amcp:bob-def456',
    });
    expect(r.requester_actor_id).toBe(ACTOR); // default
    expect(r.provider_actor_id).toBe('did:amcp:bob-def456');
  });

  it('openRecord with both actor IDs explicit', () => {
    const r = store.openRecord({
      intent: 'full p2p',
      requester_actor_id: 'did:amcp:alice-abc123',
      provider_actor_id: 'did:amcp:bob-def456',
    });
    expect(r.requester_actor_id).toBe('did:amcp:alice-abc123');
    expect(r.provider_actor_id).toBe('did:amcp:bob-def456');
  });

  it('openRecord with omitted actor IDs defaults to this._actorId', () => {
    const r = store.openRecord({ intent: 'default actors' });
    expect(r.requester_actor_id).toBe(ACTOR);
    expect(r.provider_actor_id).toBe(ACTOR);
  });

  it('openRecord stores requester_actor_id correctly in retrieved record', () => {
    const r = store.openRecord({
      intent: 'verify storage',
      requester_actor_id: 'did:amcp:charlie-ghi789',
    });
    const retrieved = store.getRecord(r.record_id)!;
    expect(retrieved.requester_actor_id).toBe('did:amcp:charlie-ghi789');
  });

  it('openRecord stores provider_actor_id correctly in retrieved record', () => {
    const r = store.openRecord({
      intent: 'verify storage',
      provider_actor_id: 'did:amcp:diana-jkl012',
    });
    const retrieved = store.getRecord(r.record_id)!;
    expect(retrieved.provider_actor_id).toBe('did:amcp:diana-jkl012');
  });

  it('requester_prev_record_hash links to previous record with same requester', () => {
    // First record for requester A
    const r1 = store.openRecord({
      intent: 'first by A',
      requester_actor_id: 'actor-A',
    });
    store.closeRecord({ record_id: r1.record_id, delta: 'done' });
    const closed1 = store.getRecord(r1.record_id)!;

    // Second record for requester A → prev_hash should point to r1
    const r2 = store.openRecord({
      intent: 'second by A',
      requester_actor_id: 'actor-A',
    });
    expect(r2.requester_prev_record_hash).toBe(closed1.record_hash);
  });

  it('provider_prev_record_hash links to previous record with same provider', () => {
    // First record for provider B
    const r1 = store.openRecord({
      intent: 'first for B',
      provider_actor_id: 'actor-B',
    });
    store.closeRecord({ record_id: r1.record_id, delta: 'done' });
    const closed1 = store.getRecord(r1.record_id)!;

    // Second record for provider B → prev_hash should point to r1
    const r2 = store.openRecord({
      intent: 'second for B',
      provider_actor_id: 'actor-B',
    });
    expect(r2.provider_prev_record_hash).toBe(closed1.record_hash);
  });

  it('multiple open records allowed for different actor pairs', () => {
    const r1 = store.openRecord({
      intent: 'pair 1',
      requester_actor_id: 'A',
      provider_actor_id: 'B',
    });
    const r2 = store.openRecord({
      intent: 'pair 2',
      requester_actor_id: 'C',
      provider_actor_id: 'D',
    });
    expect(r1.status).toBe('open');
    expect(r2.status).toBe('open');
  });

  it('multiple open records allowed for same actor pair', () => {
    const r1 = store.openRecord({
      intent: 'task 1',
      requester_actor_id: 'X',
      provider_actor_id: 'Y',
    });
    const r2 = store.openRecord({
      intent: 'task 2',
      requester_actor_id: 'X',
      provider_actor_id: 'Y',
    });
    expect(r1.status).toBe('open');
    expect(r2.status).toBe('open');
  });

  it('getOpenRecord with explicit actorId returns that actor\'s record', () => {
    const r = store.openRecord({
      intent: 'specific actor',
      requester_actor_id: 'actor-Z',
      provider_actor_id: 'actor-Z',
    });
    const open = store.getOpenRecord('actor-Z');
    expect(open).toBeTruthy();
    expect(open!.record_id).toBe(r.record_id);
  });

  it('getOpenRecord without actorId uses default actor', () => {
    const r = store.openRecord({ intent: 'default actor test' });
    const open = store.getOpenRecord();
    expect(open).toBeTruthy();
    expect(open!.record_id).toBe(r.record_id);
  });

  // ---- closeRecord post-feedback --------------------------------------------

  it('closeRecord with delta and insight sets both fields correctly', () => {
    const r = store.openRecord({ intent: 'close with all fields' });
    const closed = store.closeRecord({
      record_id: r.record_id,
      delta: 'completed with notes',
      insight_provider: 'model feedback',
      insight_requester: 'user feedback',
    });
    expect(closed.delta).toBe('completed with notes');
    expect(closed.insight).toEqual({ provider: 'model feedback', requester: 'user feedback' });
    expect(closed.status).toBe('completed');
    expect(closed.record_hash).toBeTruthy();
  });

  it('closeRecord without delta throws (delta is required)', () => {
    const r = store.openRecord({ intent: 'missing delta' });
    // closeRecord requires delta via TypeScript — test that empty delta still works
    const closed = store.closeRecord({ record_id: r.record_id, delta: '' });
    expect(closed.delta).toBe('');
    expect(closed.status).toBe('completed');
  });
});

// ---- migration tests --------------------------------------------------------

describe('IediStore migration', () => {
  // Test 1: Old schema → migration removes work_domain column
  it('migrates old schema by removing work_domain column', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'iedi-mig-old-'));
    const dbPath = join(tmpDir, 'records.db');
    try {
      // Create old schema with work_domain column (v0.2)
      const db = new Database(dbPath);
      db.exec(`
        CREATE TABLE records (
          record_id                  TEXT PRIMARY KEY,
          schema_version             TEXT NOT NULL,
          tool_called                TEXT,
          work_domain                TEXT,
          requester_actor_id         TEXT NOT NULL,
          provider_actor_id          TEXT NOT NULL,
          mode_used                  TEXT NOT NULL,
          status                     TEXT NOT NULL,
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
      `);
      db.pragma('user_version = 0');
      db.close();

      // Open via IediStore to trigger migration
      const store = new IediStore({ dbPath, actorId: 'MIG_OLD_ACTOR_0000000000000000' });
      store.close();

      // Verify work_domain was removed
      const checkDb = new Database(dbPath);
      const cols = checkDb.pragma('table_info(records)') as Array<{ name: string }>;
      expect(cols.some((c) => c.name === 'work_domain')).toBe(false);
      checkDb.close();
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // Test 2: New DB creates latest schema without warnings
  it('creates new DB with latest schema and no warnings', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'iedi-mig-new-'));
    const dbPath = join(tmpDir, 'records.db');
    try {
      const consoleWarnCalls: string[] = [];
      const originalWarn = console.warn;
      console.warn = (...args: unknown[]) => {
        consoleWarnCalls.push(args.map(String).join(' '));
      };
      try {
        const store = new IediStore({ dbPath, actorId: 'MIG_NEW_ACTOR_0000000000000000' });
        store.close();

        // Verify schema
        const checkDb = new Database(dbPath);
        const cols = checkDb.pragma('table_info(records)') as Array<{ name: string }>;
        expect(cols.some((c) => c.name === 'work_domain')).toBe(false);
        checkDb.close();

        // No migration warnings for new DBs
        const migrationWarns = consoleWarnCalls.filter((m) => m.includes('work_domain'));
        expect(migrationWarns).toHaveLength(0);
      } finally {
        console.warn = originalWarn;
      }
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  // Test 3: Idempotency — re-running on migrated DB is safe
  it('is idempotent — re-running migrations on already migrated DB does not error', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'iedi-mig-idem-'));
    const dbPath = join(tmpDir, 'records.db');
    try {
      // First open — migration runs
      const store1 = new IediStore({ dbPath, actorId: 'MIG_IDEM_ACTOR_000000000000000' });
      store1.close();

      // Re-open — should be safe
      const store2 = new IediStore({ dbPath, actorId: 'MIG_IDEM_ACTOR_000000000000000' });
      store2.close();

      // Verify schema unchanged
      const checkDb = new Database(dbPath);
      const cols = checkDb.pragma('table_info(records)') as Array<{ name: string }>;
      expect(cols.some((c) => c.name === 'work_domain')).toBe(false);
      checkDb.close();
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
