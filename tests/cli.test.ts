import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');

function iedi(args: string, env: NodeJS.ProcessEnv): string {
  return execSync(`npx tsx ${join(ROOT, 'src/cli/iedi.ts')} ${args}`, {
    env,
    encoding: 'utf-8',
    cwd: ROOT,
  });
}

describe('CLI happy path: start → evidence add → close → query', () => {
  let tmpDir: string;
  let env: NodeJS.ProcessEnv;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'iedi-cli-test-'));
    env = {
      ...process.env,
      IEDI_DB_PATH: join(tmpDir, 'records.db'),
      IEDI_ACTOR_ID: 'CLI_TEST_ACTOR_000000000000000000',
    };
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('start outputs a record ID', () => {
    const out = iedi(`start --intent "テストを書く" --work-domain internal_task`, env);
    expect(out).toMatch(/Record started:/);
    expect(out).toContain('テストを書く');
  });

  it('second start fails with an open record already exists error', () => {
    expect(() => iedi(`start --intent "second"`, env)).toThrow();
  });

  it('evidence add appends an entry', () => {
    const out = iedi(`evidence add --last --text "vitest を導入した"`, env);
    expect(out).toMatch(/Evidence added/);
    expect(out).toContain('1 item');
  });

  it('close persists delta and insight, outputs hash', () => {
    const out = iedi(
      `close --last --delta "テスト範囲が想定より広く、統合テストを追加した" --insight "次回は事前にインターフェースを確認する"`,
      env,
    );
    expect(out).toMatch(/Record closed:/);
    expect(out).toContain('completed');
    expect(out).toMatch(/hash:\s+[0-9a-f]{64}/);
  });

  it('query shows the closed record', () => {
    const out = iedi(`query`, env);
    expect(out).toContain('テストを書く');
    expect(out).toContain('テスト範囲が想定より広く');
  });

  it('query --json returns valid JSON with required fields', () => {
    const out = iedi(`query --json`, env);
    const records = JSON.parse(out) as Record<string, unknown>[];
    expect(records).toHaveLength(1);
    const r = records[0];
    expect(r).toHaveProperty('work_domain', 'internal_task');
    expect(r).toHaveProperty('intent', 'テストを書く');
    expect(typeof r['delta']).toBe('string');
    expect(r).toHaveProperty('insight');
    expect(r['requester_prev_record_hash']).toBeNull();
    expect(typeof r['record_hash']).toBe('string');
  });

  it('hash chain: prev_record_hash of 2nd record equals record_hash of 1st', () => {
    // Open and close a second record
    iedi(`start --intent "2件目のタスク"`, env);
    iedi(`close --last --delta "完了した"`, env);

    const out = iedi(`query --json`, env);
    const records = JSON.parse(out) as Record<string, unknown>[];
    expect(records).toHaveLength(2);

    // query returns newest first
    const [second, first] = records;
    expect(second['requester_prev_record_hash']).toBe(first['record_hash']);
    expect(second['provider_prev_record_hash']).toBe(first['record_hash']);
  });
});
