#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Command, Option } from 'commander';
import { IediStore, computeHash, signJws } from '../storage/iedi-store.js';

// Prevent ugly EPIPE stack trace when output is piped (e.g. iedi query --json | head)
process.stdout.on('error', (err) => {
  if ((err as NodeJS.ErrnoException).code === 'EPIPE') process.exit(0);
});

// ---- stdin helper --------------------------------------------------------

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf-8').trim();
}

// ---- evidence source resolution -------------------------------------------

function resolveSource(opts: { source?: string; sessionSummary?: unknown; gitDiff?: unknown }): string {
  if (opts.source) return opts.source as string;
  if (opts.sessionSummary) return 'session_summary';
  if (opts.gitDiff) return 'git_diff';
  return 'cli';
}

// ---- CLI -----------------------------------------------------------------

const program = new Command();

program
  .name('iedi')
  .description('IEDI record logger — AMCP Approach A (internal solo logger)')
  .version('0.1.0')
  .option('--db-path <path>', 'Path to .iedi directory containing records.db');

// ---- iedi open -----------------------------------------------------------

program
  .command('open')
  .description('Open a new IEDI record (errors if an open record already exists)')
  .requiredOption('-i, --intent <text>', 'Pre-declared intent statement')
  .option('-t, --tool-called <name>', 'Tool or service identifier (e.g. coding_session)')
  .action((opts) => {
    const dbPath = program.opts().dbPath
      ? join(program.opts().dbPath, 'records.db')
      : undefined;
    const store = new IediStore({ dbPath });
    try {
      if (store.isNewActor) {
        const iediDir = (opts.dbPath as string) ?? join(process.cwd(), '.iedi');
        console.log(`First run — actor ID created: ${store.actorId}`);
        console.log(`Config: ${iediDir}/config.json  DB: ${iediDir}/records.db\n`);
      }
      const record = store.openRecord({
        intent: opts.intent as string,
        tool_called: opts.toolCalled as string | undefined,
      });
      console.log(`Record opened: ${record.record_id}`);
      console.log(`  mode:        ${record.mode_used}`);
      console.log(`  intent:      ${record.intent}`);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    } finally {
      store.close();
    }
  });

// ---- iedi add ------------------------------------------------------------

const addCmd = program
  .command('add')
  .description('Append items to an IEDI record');

addCmd
  .command('evidence')
  .description('Append an evidence entry to a record')
  .requiredOption('--record-id <id>', 'Target record ID')
  .option('--text <text>', 'Evidence content as a string')
  .option('--session-summary <file>', 'Read a session summary markdown file and append as evidence')
  .option('--git-diff', 'Capture git status + git diff HEAD as evidence')
  .option('--source <source>', 'Evidence source label (auto-set per option, or override)')
  .action(async (opts) => {
    const hasContent = !!(opts.text || opts.sessionSummary || opts.gitDiff);
    if (!hasContent && process.stdin.isTTY) {
      console.error('Error: no text provided. Use --text, --session-summary, --git-diff, or pipe content via stdin.');
      process.exit(1);
    }

    const dbPath = program.opts().dbPath
      ? join(program.opts().dbPath, 'records.db')
      : undefined;
    const store = new IediStore({ dbPath });
    try {
      const recordId = opts.recordId as string;
      const source = resolveSource(opts);
      let count = 0;

      if (opts.text) {
        store.appendEvidence(recordId, { content: opts.text as string, source });
        count++;
      }

      if (opts.sessionSummary) {
        const content = readFileSync(opts.sessionSummary as string, 'utf-8');
        store.appendEvidence(recordId, { content, source });
        count++;
      }

      if (opts.gitDiff) {
        try {
          const status = execSync('git status', {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
          });
          let diff = '';
          try {
            diff = execSync('git diff HEAD', {
              encoding: 'utf-8',
              stdio: ['pipe', 'pipe', 'pipe'],
            });
          } catch { /* no commits yet — omit diff section */ }
          const content =
            `## git status\n\`\`\`\n${status.trim()}\n\`\`\`\n\n` +
            `## git diff HEAD\n\`\`\`diff\n${diff.trim()}\n\`\`\``;
          store.appendEvidence(recordId, { content, source });
          count++;
        } catch {
          console.log('Skipped: not a git repository or git is not available.');
        }
      }

      if (!hasContent) {
        // No content option given — fall back to stdin
        const content = await readStdin();
        if (!content) {
          console.error('Error: stdin was empty.');
          process.exit(1);
        }
        store.appendEvidence(recordId, { content, source });
        count++;
      }

      // Get final evidence count for accurate reporting
      const record = store.getRecord(recordId);
      console.log(`Evidence added to ${recordId} (${record?.evidence.length ?? count} item(s))`);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    } finally {
      store.close();
    }
  });

// ---- iedi close ----------------------------------------------------------

program
  .command('close')
  .description('Close an open record, compute hash, and persist to DB')
  .requiredOption('--record-id <id>', 'Target record ID')
  .requiredOption('--delta <text>', 'Natural-language diff between intent and what actually happened')
  .option('--insight-provider <text>', 'Retrospective insight (model perspective, 4-section format)')
  .option('--insight-requester <text>', 'Retrospective insight (user perspective)')
  .addOption(new Option('--status <status>', 'Completion status').choices(['completed', 'failed']).default('completed'))
  .action((opts) => {
    const dbPath = program.opts().dbPath
      ? join(program.opts().dbPath, 'records.db')
      : undefined;
    const store = new IediStore({ dbPath });
    try {
      const recordId = opts.recordId as string;

      const record = store.closeRecord({
        record_id: recordId,
        delta: opts.delta as string,
        insight_provider: opts.insightProvider as string | undefined,
        insight_requester: opts.insightRequester as string | undefined,
        status: opts.status as 'completed' | 'failed',
      });

      console.log(`Record closed: ${record.record_id}`);
      console.log(`  status:  ${record.status}`);
      console.log(`  delta:   ${record.delta}`);
      if (record.insight?.provider) {
        console.log(`  insight (provider):   ${record.insight.provider}`);
      }
      if (record.insight?.requester) {
        console.log(`  insight (requester):  ${record.insight.requester}`);
      }
      console.log(`  hash:    ${record.record_hash}`);
      if (record.requester_prev_record_hash) {
        console.log(`  prev:    ${record.requester_prev_record_hash}`);
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    } finally {
      store.close();
    }
  });

// ---- iedi query ----------------------------------------------------------

program
  .command('query')
  .description('List IEDI records')
  .option('--limit <n>', 'Maximum records to show', '20')
  .option('--json', 'Output raw JSON')
  .action((opts) => {
    const dbPath = program.opts().dbPath
      ? join(program.opts().dbPath, 'records.db')
      : undefined;
    const store = new IediStore({ dbPath });
    try {
      const parsedLimit = parseInt(opts.limit as string, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        console.error('Error: --limit must be a positive integer');
        process.exit(1);
      }
      const records = store.listRecords({
        limit: parsedLimit,
      });

      if (opts.json) {
        console.log(JSON.stringify(records, null, 2));
        return;
      }

      if (records.length === 0) {
        console.log('No records found.');
        return;
      }

      for (const r of records) {
        const date = r.created_at.slice(0, 16).replace('T', ' ');
        const icon =
          r.status === 'completed' ? 'v' :
          r.status === 'open'      ? '*' :
          r.status === 'failed'    ? 'x' : '-';
        console.log(`[${icon}] ${r.record_id}  ${date}`);
        console.log(`    intent:  ${r.intent}`);
        if (r.delta) console.log(`    delta:   ${r.delta}`);
        if (r.insight?.provider) console.log(`    insight: ${r.insight.provider}`);
        if (r.record_hash) console.log(`    hash:    ${r.record_hash.slice(0, 16)}...`);
        console.log('');
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    } finally {
      store.close();
    }
  });

// ---- iedi doctor ---------------------------------------------------------

program
  .command('doctor')
  .description('Verify hash-chain integrity of all IEDI records (read-only)')
  .option('--verbose', 'Show per-record verification details')
  .option('--json', 'Output results as JSON')
  .action((opts) => {
    const dbPath = program.opts().dbPath
      ? join(program.opts().dbPath, 'records.db')
      : undefined;
    const store = new IediStore({ dbPath });
    try {
      const records = store.listRecords();
      if (records.length === 0) {
        if (opts.json) {
          console.log(JSON.stringify({ records: 0, issues: 0, requester_chain: { verified: 0, broken: 0 }, provider_chain: { verified: 0, broken: 0 } }));
        } else {
          console.log('No records found.');
        }
        process.exit(0);
      }

      // Build lookup map: record_hash -> record
      const byHash = new Map<string, typeof records[0]>();
      for (const r of records) {
        if (r.record_hash) byHash.set(r.record_hash, r);
      }

      const issues: Array<{ record_id: string; type: string; detail: string }> = [];
      let requesterLinksOk = 0;
      let requesterLinksBroken = 0;
      let providerLinksOk = 0;
      let providerLinksBroken = 0;

      for (const r of records) {
        const recomputed = computeHash(r);
        if (r.record_hash && recomputed !== r.record_hash) {
          issues.push({
            record_id: r.record_id,
            type: 'HASH_MISMATCH',
            detail: `stored: ${r.record_hash.slice(0, 16)}..., computed: ${recomputed.slice(0, 16)}...`,
          });
        }

        if (r.requester_prev_record_hash) {
          const prev = byHash.get(r.requester_prev_record_hash);
          if (prev) {
            requesterLinksOk++;
          } else {
            requesterLinksBroken++;
            issues.push({
              record_id: r.record_id,
              type: 'CHAIN_BROKEN',
              detail: `requester_prev_record_hash "${r.requester_prev_record_hash.slice(0, 16)}..." not found`,
            });
          }
        }

        if (r.provider_prev_record_hash) {
          const prev = byHash.get(r.provider_prev_record_hash);
          if (prev) {
            providerLinksOk++;
          } else {
            providerLinksBroken++;
            issues.push({
              record_id: r.record_id,
              type: 'CHAIN_BROKEN',
              detail: `provider_prev_record_hash "${r.provider_prev_record_hash.slice(0, 16)}..." not found`,
            });
          }
        }

        if (opts.verbose) {
          const recordIssues = issues.filter((i) => i.record_id === r.record_id);
          if (recordIssues.length === 0 && r.record_hash) {
            console.log(`[${r.record_id}] OK`);
          } else if (!r.record_hash) {
            console.log(`[${r.record_id}] NO_HASH — record not finalized`);
          } else {
            for (const issue of recordIssues) {
              console.log(`[${r.record_id}] ${issue.type} — ${issue.detail}`);
            }
          }
        }
      }

      if (opts.json) {
        console.log(JSON.stringify({
          records: records.length,
          issues: issues.length,
          requester_chain: { verified: requesterLinksOk, broken: requesterLinksBroken },
          provider_chain: { verified: providerLinksOk, broken: providerLinksBroken },
          details: issues.length > 0 ? issues : undefined,
        }, null, 2));
      } else {
        console.log(`\nRecords: ${records.length} verified, ${issues.length} with issues`);
        console.log(`Requester chain: ${requesterLinksOk} links verified, ${requesterLinksBroken} broken`);
        console.log(`Provider chain: ${providerLinksOk} links verified, ${providerLinksBroken} broken`);
      }

      process.exit(issues.length > 0 ? 1 : 0);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    } finally {
      store.close();
    }
  });

// ---- iedi export ---------------------------------------------------------

program
  .command('export')
  .description('Export all IEDI records as a JWS-signed portable bundle')
  .option('--output <file>', 'Output file path (writes to stdout if omitted)')
  .action((opts) => {
    const dbPath = program.opts().dbPath
      ? join(program.opts().dbPath, 'records.db')
      : undefined;
    const store = new IediStore({ dbPath });
    try {
      const records = store.listRecords();
      if (records.length === 0) {
        console.error('Error: no records to export.');
        process.exit(1);
      }

      const payload = {
        format: 'iedi-export-v0.1',
        exported_at: new Date().toISOString(),
        actor_id: store.actorId,
        record_count: records.length,
        records,
      };

      const jws = signJws(payload, store.signingKey, store.actorId);

      if (opts.output) {
        writeFileSync(opts.output as string, jws, 'utf-8');
        console.log(`Exported ${records.length} record(s) to ${opts.output}`);
      } else {
        console.log(jws);
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    } finally {
      store.close();
    }
  });

// ---- deprecated commands --------------------------------------------------

program
  .command('start')
  .description('DEPRECATED — use "iedi open" instead')
  .allowUnknownOption()
  .action(() => {
    console.error("Error: 'iedi start' is deprecated. Use 'iedi open' instead.");
    process.exit(1);
  });

const deprecatedEvidence = program
  .command('evidence')
  .description('DEPRECATED — use "iedi add evidence" instead');

deprecatedEvidence
  .command('add')
  .description('DEPRECATED')
  .allowUnknownOption()
  .action(() => {
    console.error("Error: 'iedi evidence add' is deprecated. Use 'iedi add evidence' instead.");
    process.exit(1);
  });

deprecatedEvidence
  .command('capture')
  .description('DEPRECATED')
  .allowUnknownOption()
  .action(() => {
    console.error("Error: 'iedi evidence capture' is deprecated. Use 'iedi add evidence --session-summary <file>' or 'iedi add evidence --git-diff' instead.");
    process.exit(1);
  });

// ---- entry point ---------------------------------------------------------

await program.parseAsync(process.argv);
