import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const ROOT = join(import.meta.dirname, '..');
const CLI = join(ROOT, 'src/cli/iedi.ts');

function iedi(args: string, env: NodeJS.ProcessEnv): string {
  return execSync(`npx tsx ${CLI} ${args}`, {
    env,
    encoding: 'utf-8',
    cwd: ROOT,
  });
}

function iediStdin(args: string, stdin: string, env: NodeJS.ProcessEnv): string {
  return execSync(`npx tsx ${CLI} ${args}`, {
    input: stdin,
    env,
    encoding: 'utf-8',
    cwd: ROOT,
  });
}

function iediInDir(args: string, cwd: string, env: NodeJS.ProcessEnv): string {
  return execSync(`npx tsx ${CLI} ${args}`, {
    env,
    encoding: 'utf-8',
    cwd,
  });
}

describe.sequential('CLI happy path: start → evidence add → close → query', () => {
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

describe.sequential('CLI additional coverage: --record-id, --status failed, icons, stdin', () => {
  let tmpDir: string;
  let env: NodeJS.ProcessEnv;
  let recordId: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'iedi-cli-extra-'));
    env = {
      ...process.env,
      IEDI_DB_PATH: join(tmpDir, 'records.db'),
      IEDI_ACTOR_ID: 'CLI_EXTRA_ACTOR_00000000000000000',
    };
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('query on empty DB shows "No records found."', () => {
    const out = iedi('query', env);
    expect(out).toContain('No records found.');
  });

  it('start with --tool-called stores tool name in output', () => {
    const out = iedi(`start --intent "use a tool" --tool-called coding_session`, env);
    expect(out).toMatch(/Record started:/);
    const match = out.match(/Record started:\s+(\S+)/);
    recordId = match?.[1] ?? '';
    expect(recordId).toBeTruthy();
  });

  it('query shows [*] icon for open record', () => {
    const out = iedi('query', env);
    expect(out).toContain('[*]');
  });

  it('evidence add via --record-id appends to a specific record', () => {
    const out = iedi(`evidence add --record-id ${recordId} --text "found a bug"`, env);
    expect(out).toMatch(/Evidence added/);
    expect(out).toContain('1 item');
  });

  it('evidence add via stdin appends content from stdin', () => {
    const out = iediStdin(`evidence add --record-id ${recordId}`, 'stdin content here', env);
    expect(out).toMatch(/Evidence added/);
    expect(out).toContain('2 item');
  });

  it('close with --record-id and --status failed marks record as failed', () => {
    const out = iedi(
      `close --record-id ${recordId} --delta "did not complete" --status failed`,
      env,
    );
    expect(out).toContain('failed');
    expect(out).toMatch(/hash:\s+[0-9a-f]{64}/);
  });

  it('query shows [x] icon for failed record', () => {
    const out = iedi('query', env);
    expect(out).toContain('[x]');
  });

  it('tool_called is persisted and visible in --json output', () => {
    const out = iedi('query --json', env);
    const records = JSON.parse(out) as Record<string, unknown>[];
    expect(records[0]['tool_called']).toBe('coding_session');
  });
});

describe.sequential('CLI evidence capture: session-summary, git-diff, graceful skip', () => {
  let tmpDir: string;
  let env: NodeJS.ProcessEnv;
  let summaryFile: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'iedi-capture-test-'));
    env = {
      ...process.env,
      IEDI_DB_PATH: join(tmpDir, 'records.db'),
      IEDI_ACTOR_ID: 'CAPTURE_TEST_ACTOR_000000000000000',
    };
    summaryFile = join(tmpDir, 'session-summary.md');
    writeFileSync(
      summaryFile,
      '# Session Summary\nrecord_id: test\n\n## What happened\nImplemented evidence capture.\n',
      'utf-8',
    );
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('start opens a record for capture tests', () => {
    const out = iedi('start --intent "evidence capture test"', env);
    expect(out).toMatch(/Record started:/);
  });

  it('evidence capture --session-summary appends file content as evidence', () => {
    const out = iedi(`evidence capture --session-summary "${summaryFile}" --last`, env);
    expect(out).toMatch(/Session summary captured for/);
  });

  it('evidence capture --git-diff captures from a git repository', () => {
    // Create a temporary git repo to test the happy path
    const gitDir = mkdtempSync(join(tmpdir(), 'iedi-git-'));
    try {
      execSync('git init', { cwd: gitDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: gitDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: gitDir, stdio: 'pipe' });
      const out = iediInDir('evidence capture --git-diff --last', gitDir, env);
      expect(out).toMatch(/Git diff captured for/);
    } finally {
      rmSync(gitDir, { recursive: true, force: true });
    }
  });

  it('evidence capture --git-diff gracefully skips in a non-git directory', () => {
    const out = iediInDir('evidence capture --git-diff --last', tmpDir, env);
    expect(out).toMatch(/Skipped:/);
  });

  it('evidence array has both captured items', () => {
    const out = iedi('query --json --limit 1', env);
    const records = JSON.parse(out) as Record<string, unknown>[];
    const evidence = records[0]['evidence'] as unknown[];
    expect(evidence.length).toBeGreaterThanOrEqual(2);
  });

  it('evidence capture with no source flag exits with error', () => {
    expect(() => iedi('evidence capture --last', env)).toThrow();
  });

  it('evidence capture with no target flag exits with error', () => {
    expect(() => iedi('evidence capture --git-diff', env)).toThrow();
  });
});
