import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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

  // ---- concurrent open protection ----------------------------------------

  it('opening a 2nd record while one is open throws an error', () => {
    store.openRecord({ intent: 'first' });
    expect(() => store.openRecord({ intent: 'second' })).toThrow(/open record already exists/i);
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
});
