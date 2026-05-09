#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { Command, Option } from 'commander';
import { IediStore } from '../storage/iedi-store.js';
import type { WorkDomain } from '../storage/iedi-store.js';

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

// ---- early validation ----------------------------------------------------

function checkWorkspace(): void {
  if (!process.env['IEDI_WORKSPACE'] && !process.env['IEDI_DB_PATH']) {
    console.error('Error: IEDI_WORKSPACE is not set. Please define the IEDI_WORKSPACE environment variable.');
    process.exit(1);
  }
}

// ---- record resolution helper --------------------------------------------

function resolveRecordId(store: IediStore, opts: { last?: boolean; recordId?: string }): string {
  if (opts.last) {
    const open = store.getOpenRecord();
    if (!open) {
      console.error('Error: no open record. Run "iedi open" first.');
      process.exit(1);
    }
    return open.record_id;
  }
  return opts.recordId as string;
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
  .version('0.1.0');

// ---- iedi open -----------------------------------------------------------

program
  .command('open')
  .description('Open a new IEDI record (errors if an open record already exists)')
  .requiredOption('-i, --intent <text>', 'Pre-declared intent statement')
  .addOption(new Option('-d, --work-domain <type>', 'Work domain').choices(['internal_task', 'external_transaction', 'decision', 'retrospective']).default('internal_task'))
  .option('-t, --tool-called <name>', 'Tool or service identifier (e.g. coding_session)')
  .action((opts) => {
    checkWorkspace();
    const store = new IediStore();
    try {
      if (store.isNewActor) {
        const iediDir = process.env['IEDI_DB_PATH']
          ? process.env['IEDI_DB_PATH'].replace(/[/\\][^/\\]+$/, '') // dirname
          : `${process.env['IEDI_WORKSPACE']}/.iedi`;
        console.log(`First run — actor ID created: ${store.actorId}`);
        console.log(`Config: ${iediDir}/config.json  DB: ${iediDir}/records.db\n`);
      }
      const record = store.openRecord({
        intent: opts.intent as string,
        work_domain: opts.workDomain as WorkDomain,
        tool_called: opts.toolCalled as string | undefined,
      });
      console.log(`Record opened: ${record.record_id}`);
      console.log(`  work_domain: ${record.work_domain}`);
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
  .description('Append an evidence entry to a record (--last or --record-id required)')
  .option('--last', 'Target the current open record')
  .option('--record-id <id>', 'Target a specific record by ID')
  .option('--text <text>', 'Evidence content as a string')
  .option('--session-summary <file>', 'Read a session summary markdown file and append as evidence')
  .option('--git-diff', 'Capture git status + git diff HEAD as evidence')
  .option('--source <source>', 'Evidence source label (auto-set per option, or override)')
  .action(async (opts) => {
    checkWorkspace();
    if (!opts.last && !opts.recordId) {
      console.error('Error: specify --last or --record-id <id>');
      process.exit(1);
    }

    const hasContent = !!(opts.text || opts.sessionSummary || opts.gitDiff);
    if (!hasContent && process.stdin.isTTY) {
      console.error('Error: no text provided. Use --text, --session-summary, --git-diff, or pipe content via stdin.');
      process.exit(1);
    }

    const store = new IediStore();
    try {
      const recordId = resolveRecordId(store, opts);
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
  .option('--last', 'Target the current open record')
  .option('--record-id <id>', 'Target a specific record by ID')
  .requiredOption('--delta <text>', 'Natural-language diff between intent and what actually happened')
  .option('--insight-provider <text>', 'Retrospective insight (model perspective, 4-section format)')
  .option('--insight-requester <text>', 'Retrospective insight (user perspective)')
  .addOption(new Option('--status <status>', 'Completion status').choices(['completed', 'failed']).default('completed'))
  .action((opts) => {
    checkWorkspace();
    if (!opts.last && !opts.recordId) {
      console.error('Error: specify --last or --record-id <id>');
      process.exit(1);
    }

    const store = new IediStore();
    try {
      const recordId = resolveRecordId(store, opts);

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
  .option('--work-domain <type>', 'Filter by work domain')
  .option('--limit <n>', 'Maximum records to show', '20')
  .option('--json', 'Output raw JSON')
  .action((opts) => {
    checkWorkspace();
    const store = new IediStore();
    try {
      const parsedLimit = parseInt(opts.limit as string, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1) {
        console.error('Error: --limit must be a positive integer');
        process.exit(1);
      }
      const records = store.listRecords({
        work_domain: opts.workDomain as WorkDomain | undefined,
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
        console.log(`[${icon}] [${r.work_domain}] ${r.record_id}  ${date}`);
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
