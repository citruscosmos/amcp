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
      insight: '次回の改善点: インターフェースを先に確認する',
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

  // ---- internal_task with provider=requester ------------------------------

  it('internal_task record has provider_actor_id === requester_actor_id', () => {
    const r = store.openRecord({ intent: 'code review', work_domain: 'internal_task' });
    store.closeRecord({ record_id: r.record_id, delta: 'reviewed 3 files' });
    const closed = store.getRecord(r.record_id)!;

    expect(closed.requester_actor_id).toBe(ACTOR);
    expect(closed.provider_actor_id).toBe(ACTOR);
    expect(closed.work_domain).toBe('internal_task');
  });

  // ---- decision domain caps at cooperative --------------------------------

  it('decision work_domain forces mode_used=cooperative regardless of requested mode', () => {
    const r = store.openRecord({
      intent: 'choose tech stack',
      work_domain: 'decision',
      mode_used: 'autonomous',
    });
    expect(r.mode_used).toBe('cooperative');
  });
});
