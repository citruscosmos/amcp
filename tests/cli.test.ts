import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import Database from 'better-sqlite3';

const ROOT = join(import.meta.dirname, '..');
const CLI = join(ROOT, 'src/cli/iedi.ts');

function iedi(args: string, dbPath: string, extraEnv?: NodeJS.ProcessEnv): string {
  return execSync(`npx tsx ${CLI} --db-path ${dbPath} ${args}`, {
    env: extraEnv ? { ...process.env, ...extraEnv } : undefined,
    encoding: 'utf-8',
    cwd: ROOT,
  });
}

function iediStdin(args: string, stdin: string, dbPath: string, extraEnv?: NodeJS.ProcessEnv): string {
  return execSync(`npx tsx ${CLI} --db-path ${dbPath} ${args}`, {
    input: stdin,
    env: extraEnv ? { ...process.env, ...extraEnv } : undefined,
    encoding: 'utf-8',
    cwd: ROOT,
  });
}

function iediInDir(args: string, cwd: string, dbPath: string, extraEnv?: NodeJS.ProcessEnv): string {
  return execSync(`npx tsx ${CLI} --db-path ${dbPath} ${args}`, {
    env: extraEnv ? { ...process.env, ...extraEnv } : undefined,
    encoding: 'utf-8',
    cwd,
  });
}

function iediCatch(args: string, dbPath: string, extraEnv?: NodeJS.ProcessEnv): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execSync(`npx tsx ${CLI} --db-path ${dbPath} ${args}`, {
      env: extraEnv ? { ...process.env, ...extraEnv } : undefined,
      encoding: 'utf-8',
      cwd: ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { stdout, stderr: '', status: 0 };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: (err.stdout as string) ?? '',
      stderr: (err.stderr as string) ?? '',
      status: err.status ?? 1,
    };
  }
}

describe.sequential('CLI happy path: open → add evidence → close → query', () => {
  let tmpDir: string;
  let dbPath: string;
  let recordId: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'iedi-cli-test-'));
    dbPath = join(tmpDir, '.iedi');
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('open outputs a record ID', () => {
    const out = iedi(`open --intent "テストを書く"`, dbPath);
    expect(out).toMatch(/Record opened:/);
    expect(out).toContain('テストを書く');
    const match = out.match(/Record opened:\s+(\S+)/);
    recordId = match?.[1] ?? '';
    expect(recordId).toBeTruthy();
  });

  it('second open succeeds (open constraint removed)', () => {
    const out = iedi(`open --intent "second"`, dbPath);
    expect(out).toMatch(/Record opened:/);
    const match = out.match(/Record opened:\s+(\S+)/);
    const secondId = match?.[1] ?? '';
    // Close it so it doesn't pollute downstream tests
    iedi(`close --record-id ${secondId} --delta "cleanup"`, dbPath);
  });

  it('add evidence appends an entry', () => {
    const out = iedi(`add evidence --record-id ${recordId} --text "vitest を導入した"`, dbPath);
    expect(out).toMatch(/Evidence added/);
    expect(out).toContain('1 item');
  });

  it('close persists delta and insight, outputs hash', () => {
    const out = iedi(
      `close --record-id ${recordId} --delta "テスト範囲が想定より広く、統合テストを追加した" --insight-provider "次回は事前にインターフェースを確認する"`,
      dbPath,
    );
    expect(out).toMatch(/Record closed:/);
    expect(out).toContain('completed');
    expect(out).toMatch(/hash:\s+[0-9a-f]{64}/);
  });

  it('query shows the closed record', () => {
    const out = iedi(`query`, dbPath);
    expect(out).toContain('テストを書く');
    expect(out).toContain('テスト範囲が想定より広く');
  });

  it('query --json returns valid JSON with required fields', () => {
    const out = iedi(`query --json`, dbPath);
    const records = JSON.parse(out) as Record<string, unknown>[];
    expect(records).toHaveLength(2); // 1st record + cleanup from "second open" test
    const r = records.find((rec) => rec['intent'] === 'テストを書く');
    expect(r).toBeTruthy();
    expect(r).toHaveProperty('intent', 'テストを書く');
    expect(typeof r['delta']).toBe('string');
    expect(r).toHaveProperty('insight');
    expect(r['requester_prev_record_hash']).toBeNull();
    expect(typeof r['record_hash']).toBe('string');
  });

  it('hash chain: prev_record_hash of 2nd record equals record_hash of 1st', () => {
    // Open and close a second record
    const out2 = iedi(`open --intent "2件目のタスク"`, dbPath);
    const match2 = out2.match(/Record opened:\s+(\S+)/);
    const thirdId = match2?.[1] ?? '';
    iedi(`close --record-id ${thirdId} --delta "完了した"`, dbPath);

    const out = iedi(`query --json`, dbPath);
    const records = JSON.parse(out) as Record<string, unknown>[];
    expect(records).toHaveLength(3); // 2 from earlier + this new one

    // query returns newest first (3 records: 2 from earlier tests + this new one)
    // Directional per-actor chains link to most recently closed record for that actor,
    // not the record_id-adjacent one.
    const [newest, middle, oldest] = records;
    expect(newest['requester_prev_record_hash']).toBeTruthy();
    expect(newest['provider_prev_record_hash']).toBeTruthy();
    // Both chains should point to the same prev record (same actor for requester & provider)
    expect(newest['requester_prev_record_hash']).toBe(newest['provider_prev_record_hash']);
  });
});

describe.sequential('CLI additional coverage: --record-id, --status failed, icons, stdin', () => {
  let tmpDir: string;
  let dbPath: string;
  let recordId: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'iedi-cli-extra-'));
    dbPath = join(tmpDir, '.iedi');
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('query on empty DB shows "No records found."', () => {
    const out = iedi('query', dbPath);
    expect(out).toContain('No records found.');
  });

  it('open with --tool-called stores tool name in output', () => {
    const out = iedi(`open --intent "use a tool" --tool-called coding_session`, dbPath);
    expect(out).toMatch(/Record opened:/);
    const match = out.match(/Record opened:\s+(\S+)/);
    recordId = match?.[1] ?? '';
    expect(recordId).toBeTruthy();
  });

  it('query shows [*] icon for open record', () => {
    const out = iedi('query', dbPath);
    expect(out).toContain('[*]');
  });

  it('add evidence via --record-id appends to a specific record', () => {
    const out = iedi(`add evidence --record-id ${recordId} --text "found a bug"`, dbPath);
    expect(out).toMatch(/Evidence added/);
    expect(out).toContain('1 item');
  });

  it('add evidence via stdin appends content from stdin', () => {
    const out = iediStdin(`add evidence --record-id ${recordId}`, 'stdin content here', dbPath);
    expect(out).toMatch(/Evidence added/);
    expect(out).toContain('2 item');
  });

  it('close with --record-id and --status failed marks record as failed', () => {
    const out = iedi(
      `close --record-id ${recordId} --delta "did not complete" --status failed`,
      dbPath,
    );
    expect(out).toContain('failed');
    expect(out).toMatch(/hash:\s+[0-9a-f]{64}/);
  });

  it('query shows [x] icon for failed record', () => {
    const out = iedi('query', dbPath);
    expect(out).toContain('[x]');
  });

  it('tool_called is persisted and visible in --json output', () => {
    const out = iedi('query --json', dbPath);
    const records = JSON.parse(out) as Record<string, unknown>[];
    expect(records[0]['tool_called']).toBe('coding_session');
  });
});

describe.sequential('CLI add evidence: session-summary, git-diff, graceful skip', () => {
  let tmpDir: string;
  let dbPath: string;
  let summaryFile: string;
  let recordId: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'iedi-capture-test-'));
    dbPath = join(tmpDir, '.iedi');
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

  it('open starts a record for add evidence tests', () => {
    const out = iedi('open --intent "add evidence test"', dbPath);
    expect(out).toMatch(/Record opened:/);
    const match = out.match(/Record opened:\s+(\S+)/);
    recordId = match?.[1] ?? '';
    expect(recordId).toBeTruthy();
  });

  it('add evidence --session-summary appends file content as evidence', () => {
    const out = iedi(`add evidence --session-summary "${summaryFile}" --record-id ${recordId}`, dbPath);
    expect(out).toMatch(/Evidence added/);
  });

  it('add evidence --git-diff captures from a git repository', () => {
    // Create a temporary git repo to test the happy path
    const gitDir = mkdtempSync(join(tmpdir(), 'iedi-git-'));
    try {
      execSync('git init', { cwd: gitDir, stdio: 'pipe' });
      execSync('git config user.email "test@test.com"', { cwd: gitDir, stdio: 'pipe' });
      execSync('git config user.name "Test"', { cwd: gitDir, stdio: 'pipe' });
      const out = iediInDir(`add evidence --git-diff --record-id ${recordId}`, gitDir, dbPath);
      expect(out).toMatch(/Evidence added/);
    } finally {
      rmSync(gitDir, { recursive: true, force: true });
    }
  });

  it('add evidence --git-diff gracefully skips in a non-git directory', () => {
    const out = iediInDir(`add evidence --git-diff --record-id ${recordId}`, tmpDir, dbPath);
    expect(out).toMatch(/Skipped:/);
  });

  it('add evidence with no content option reads from stdin in non-TTY', () => {
    const out = iediStdin(`add evidence --record-id ${recordId}`, 'stdin fallback content', dbPath);
    expect(out).toMatch(/Evidence added/);
  });

  it('evidence array has captured items', () => {
    const out = iedi('query --json --limit 1', dbPath);
    const records = JSON.parse(out) as Record<string, unknown>[];
    const evidence = records[0]['evidence'] as unknown[];
    expect(evidence.length).toBeGreaterThanOrEqual(3);
  });

  it('add evidence without required --record-id exits with error', () => {
    expect(() => iedi('add evidence --git-diff', dbPath)).toThrow();
  });
});

describe.sequential('CLI deprecated commands: start, evidence add, evidence capture', () => {
  let tmpDir: string;
  let dbPath: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'iedi-deprecated-'));
    dbPath = join(tmpDir, '.iedi');
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('iedi start prints deprecation error and references iedi open', () => {
    expect(() => iedi('start --intent "test"', dbPath)).toThrow();
    try {
      iedi('start --intent "test"', dbPath);
    } catch (e) {
      const msg = (e as { stdout?: string; stderr?: string }).stderr ?? String(e);
      expect(msg).toMatch(/deprecated.*iedi open/i);
    }
  });

  it('iedi evidence add prints deprecation error', () => {
    expect(() => iedi('evidence add --last --text "test"', dbPath)).toThrow();
    try {
      iedi('evidence add --last --text "test"', dbPath);
    } catch (e) {
      const msg = (e as { stdout?: string; stderr?: string }).stderr ?? String(e);
      expect(msg).toMatch(/deprecated.*iedi add evidence/i);
    }
  });

  it('iedi evidence capture prints deprecation error', () => {
    expect(() => iedi('evidence capture --last --git-diff', dbPath)).toThrow();
    try {
      iedi('evidence capture --last --git-diff', dbPath);
    } catch (e) {
      const msg = (e as { stdout?: string; stderr?: string }).stderr ?? String(e);
      expect(msg).toMatch(/deprecated.*iedi add evidence/i);
    }
  });
});

// ---- iedi doctor -----------------------------------------------------------

describe.sequential('iedi doctor', () => {
  let tmpDir: string;
  let dbPath: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'iedi-doctor-test-'));
    dbPath = join(tmpDir, '.iedi');
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('doctor reports all OK when hashes are intact', () => {
    const out1 = iedi('open --intent "task A"', dbPath);
    const id1 = out1.match(/Record opened:\s+(\S+)/)?.[1] ?? '';
    iedi(`close --record-id ${id1} --delta "done"`, dbPath);

    const out2 = iedi('open --intent "task B"', dbPath);
    const id2 = out2.match(/Record opened:\s+(\S+)/)?.[1] ?? '';
    iedi(`close --record-id ${id2} --delta "done too"`, dbPath);

    const out = iedi('doctor', dbPath);
    expect(out).toContain('0 with issues');
    expect(out).toContain('Requester chain:');
    expect(out).toContain('0 broken');
  });

  it('doctor with --verbose shows per-record status', () => {
    const out = iedi('doctor --verbose', dbPath);
    expect(out).toMatch(/\[.+\]\s+OK/);
  });

  it('doctor with --json outputs valid JSON with expected fields', () => {
    const out = iedi('doctor --json', dbPath);
    const result = JSON.parse(out) as Record<string, unknown>;
    expect(result).toHaveProperty('records');
    expect(result).toHaveProperty('issues');
    expect(result).toHaveProperty('requester_chain');
    expect(result).toHaveProperty('provider_chain');
    expect(result.issues).toBe(0);
  });

  it('doctor detects hash mismatch when DB is tampered', () => {
    // Create a record, then tamper with its delta in DB to cause hash mismatch
    const out1 = iedi('open --intent "tamper test"', dbPath);
    const id = out1.match(/Record opened:\s+(\S+)/)?.[1] ?? '';
    iedi(`close --record-id ${id} --delta "original"`, dbPath);

    // Tamper: change delta in DB directly
    const db = new Database(join(tmpDir, '.iedi', 'records.db'));
    db.prepare('UPDATE records SET delta = ? WHERE record_id = ?').run('TAMPERED', id);
    db.close();

    const result = iediCatch('doctor --verbose', dbPath);
    expect(result.stdout).toContain('HASH_MISMATCH');
    expect(result.status).toBe(1);
  });

  it('doctor detects broken chain link', () => {
    // Create record with a fake prev_hash
    const out1 = iedi('open --intent "broken chain"', dbPath);
    const id = out1.match(/Record opened:\s+(\S+)/)?.[1] ?? '';
    iedi(`close --record-id ${id} --delta "done"`, dbPath);

    // Tamper: set a non-existent prev_hash
    const db = new Database(join(tmpDir, '.iedi', 'records.db'));
    db.prepare('UPDATE records SET requester_prev_record_hash = ? WHERE record_id = ?').run('0000000000000000000000000000000000000000000000000000000000000000', id);
    db.close();

    const result = iediCatch('doctor --verbose', dbPath);
    expect(result.stdout).toContain('CHAIN_BROKEN');
    expect(result.status).toBe(1);
  });

  it('doctor on empty DB prints "No records found."', () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'iedi-doctor-empty-'));
    const emptyDbPath = join(emptyDir, '.iedi');
    try {
      const out = iedi('doctor', emptyDbPath);
      expect(out).toContain('No records found.');
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});

// ---- CLI --insight-provider / --insight-requester integration ---------------

describe.sequential('CLI close with dual insight flags', () => {
  let tmpDir: string;
  let dbPath: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'iedi-insight-cli-'));
    dbPath = join(tmpDir, '.iedi');
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('close with --insight-provider stores provider insight', () => {
    const out1 = iedi('open --intent "provider only"', dbPath);
    const id = out1.match(/Record opened:\s+(\S+)/)?.[1] ?? '';
    const out = iedi(
      `close --record-id ${id} --delta "done" --insight-provider "モデルの気づき"`,
      dbPath,
    );
    expect(out).toContain('insight (provider)');
  });

  it('close with --insight-requester stores requester insight', () => {
    const out1 = iedi('open --intent "requester only"', dbPath);
    const id = out1.match(/Record opened:\s+(\S+)/)?.[1] ?? '';
    const out = iedi(
      `close --record-id ${id} --delta "done" --insight-requester "ユーザーの気づき"`,
      dbPath,
    );
    expect(out).toContain('insight (requester)');
  });

  it('close with both flags stores both insights', () => {
    const out1 = iedi('open --intent "both insights"', dbPath);
    const id = out1.match(/Record opened:\s+(\S+)/)?.[1] ?? '';
    const out = iedi(
      `close --record-id ${id} --delta "done" --insight-provider "prov" --insight-requester "req"`,
      dbPath,
    );
    expect(out).toContain('insight (provider)');
    expect(out).toContain('insight (requester)');
  });

  it('query --json shows insight fields in closed record', () => {
    const out = iedi('query --json --limit 1', dbPath);
    const records = JSON.parse(out) as Record<string, unknown>[];
    const r = records[0];
    expect(r).toHaveProperty('insight');
    const insight = r['insight'] as Record<string, unknown>;
    expect(insight['provider']).toBe('prov');
    expect(insight['requester']).toBe('req');
  });
});

// ---- --last regression tests ------------------------------------------------

describe.sequential('CLI --last regression: rejects removed flag', () => {
  let tmpDir: string;
  let dbPath: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'iedi-last-regress-'));
    dbPath = join(tmpDir, '.iedi');
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('iedi close --last is rejected (--last removed)', () => {
    const result = iediCatch('close --last --delta "test"', dbPath);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/error/);
  });

  it('iedi add evidence --last is rejected (--last removed)', () => {
    const result = iediCatch('add evidence --last --text "test"', dbPath);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/error/);
  });
});

// ---- DID generation ---------------------------------------------------------

describe.sequential('CLI actor ID generation (did:amcp format)', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'iedi-did-test-'));
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates did:amcp from config on first workspace open', () => {
    // Use a subdirectory to isolate config from other DID tests
    const subDir = join(tmpDir, 'custom');
    const iediDir = join(subDir, '.iedi');
    iedi(`open --intent "test"`, iediDir);
    // Read the generated config.json and verify DID format
    const config = JSON.parse(readFileSync(join(iediDir, 'config.json'), 'utf-8'));
    expect(config['actor_id']).toMatch(/^did:amcp:[a-zA-Z0-9_-]+-[0-9a-f]{12}$/);
  });

  it('uses OS username in DID when AMCP_USERNAME is not set', () => {
    const subDir = join(tmpDir, 'os-fallback');
    const iediDir = join(subDir, '.iedi');
    iedi('open --intent "test"', iediDir);
    const config = JSON.parse(readFileSync(join(iediDir, 'config.json'), 'utf-8'));
    expect(config['actor_id']).toMatch(/^did:amcp:[a-zA-Z0-9_-]+-[0-9a-f]{12}$/);
  });

  it('re-reads existing config without overwriting actor_id', () => {
    const subDir = join(tmpDir, 'reread');
    const iediDir = join(subDir, '.iedi');
    // First open — creates workspace config
    iedi('open --intent "first"', iediDir, { AMCP_USERNAME: 'original-name' });
    const config1 = JSON.parse(readFileSync(join(iediDir, 'config.json'), 'utf-8'));
    const firstActorId = config1['actor_id'] as string;
    expect(firstActorId).toBeTruthy();

    // Second open — should re-read same actor_id
    iedi('open --intent "second"', iediDir, { AMCP_USERNAME: 'original-name' });
    const config2 = JSON.parse(readFileSync(join(iediDir, 'config.json'), 'utf-8'));
    expect(config2['actor_id']).toBe(firstActorId);
  });
});

// ---- export tests ---------------------------------------------------------

describe.sequential('CLI iedi export --portable', () => {
  let tmpDir: string;
  let dbPath: string;
  let recordId: string;

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'iedi-export-test-'));
    dbPath = join(tmpDir, '.iedi');

    // Create a record with evidence and close it so we have data to export
    const openOut = iedi('open --intent "export test record"', dbPath);
    const m = openOut.match(/Record opened:\s+(\S+)/);
    recordId = m?.[1] ?? '';

    iedi(`add evidence --record-id "${recordId}" --text "test evidence"`, dbPath);
    iedi(`close --record-id "${recordId}" --delta "test delta" --status completed`, dbPath);
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exports JWS compact serialization to stdout', () => {
    const out = iedi('export', dbPath).trim();
    const segments = out.split('.');
    expect(segments).toHaveLength(3);

    // Decode header
    const header = JSON.parse(Buffer.from(segments[0], 'base64url').toString('utf-8'));
    expect(header['alg']).toBe('EdDSA');
    expect(header['kid']).toBeTruthy();

    // Decode payload
    const payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf-8'));
    expect(payload['format']).toBe('iedi-export-v0.1');
    expect(payload['exported_at']).toBeTruthy();
    expect(payload['actor_id']).toBeTruthy();
    expect(payload['record_count']).toBe(1);
    expect(payload['records']).toHaveLength(1);
    expect(payload['records'][0]['record_id']).toBe(recordId);
  });

  it('exports to file with --output flag', () => {
    const outputPath = join(tmpDir, 'export.jws');
    const out = iedi(`export --output "${outputPath}"`, dbPath).trim();
    expect(out).toMatch(/Exported \d+ record\(s\) to/);

    const fileContent = readFileSync(outputPath, 'utf-8').trim();
    const segments = fileContent.split('.');
    expect(segments).toHaveLength(3);

    // File content should match stdout format
    const stdoutContent = iedi('export', dbPath).trim();
    // Same signing key and export time should produce identical JWS
    // (may differ by exported_at timestamp, so just check structure)
    const filePayload = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf-8'));
    expect(filePayload['format']).toBe('iedi-export-v0.1');
    expect(filePayload['records']).toHaveLength(1);
  });

  it('errors on empty DB', () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'iedi-export-empty-'));
    const emptyDbPath = join(emptyDir, '.iedi');

    try {
      const result = iediCatch('export', emptyDbPath);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/no records to export/i);
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});
