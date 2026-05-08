#!/usr/bin/env node
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

// ---- CLI -----------------------------------------------------------------

const program = new Command();

program
  .name('iedi')
  .description('IEDI record logger — AMCP Approach A (internal solo logger)')
  .version('0.1.0');

// ---- iedi start ----------------------------------------------------------

program
  .command('start')
  .description('Open a new IEDI record (errors if an open record already exists)')
  .requiredOption('-i, --intent <text>', 'Pre-declared intent statement')
  .addOption(new Option('-d, --work-domain <type>', 'Work domain').choices(['internal_task', 'external_transaction', 'decision', 'retrospective']).default('internal_task'))
  .option('-t, --tool-called <name>', 'Tool or service identifier (e.g. coding_session)')
  .action((opts) => {
    const store = new IediStore();
    try {
      if (store.isNewActor) {
        console.log(`First run — actor ID created: ${store.actorId}`);
        console.log(`Config: ~/.iedi/config.json  DB: ~/.iedi/records.db\n`);
      }
      const record = store.openRecord({
        intent: opts.intent as string,
        work_domain: opts.workDomain as WorkDomain,
        tool_called: opts.toolCalled as string | undefined,
      });
      console.log(`Record started: ${record.record_id}`);
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

// ---- iedi evidence -------------------------------------------------------

const evidenceCmd = program
  .command('evidence')
  .description('Manage evidence for an open record');

evidenceCmd
  .command('add')
  .description('Append an evidence entry to an open record (--last or --record-id required)')
  .option('--last', 'Target the current open record')
  .option('--record-id <id>', 'Target a specific record by ID')
  .option('--text <text>', 'Evidence content (omit to read from stdin)')
  .option('--source <source>', 'Evidence source label', 'cli')
  .action(async (opts) => {
    if (!opts.last && !opts.recordId) {
      console.error('Error: specify --last or --record-id <id>');
      process.exit(1);
    }

    const store = new IediStore();
    try {
      let recordId: string;
      if (opts.last) {
        const open = store.getOpenRecord();
        if (!open) {
          console.error('Error: no open record. Run "iedi start" first.');
          process.exit(1);
        }
        recordId = open.record_id;
      } else {
        recordId = opts.recordId as string;
      }

      let content = opts.text as string | undefined;
      if (!content) {
        if (process.stdin.isTTY) {
          console.error('Error: no text provided. Use --text or pipe content via stdin.');
          process.exit(1);
        }
        content = await readStdin();
        if (!content) {
          console.error('Error: stdin was empty.');
          process.exit(1);
        }
      }

      const record = store.appendEvidence(recordId, { content, source: opts.source as string });
      console.log(`Evidence added to ${record.record_id} (${record.evidence.length} item(s))`);
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
  .option('--insight <text>', 'Retrospective insight for future improvement')
  .addOption(new Option('--status <status>', 'Completion status').choices(['completed', 'failed']).default('completed'))
  .action((opts) => {
    if (!opts.last && !opts.recordId) {
      console.error('Error: specify --last or --record-id <id>');
      process.exit(1);
    }

    const store = new IediStore();
    try {
      let recordId: string;
      if (opts.last) {
        const open = store.getOpenRecord();
        if (!open) {
          console.error('Error: no open record. Run "iedi start" first.');
          process.exit(1);
        }
        recordId = open.record_id;
      } else {
        recordId = opts.recordId as string;
      }

      const record = store.closeRecord({
        record_id: recordId,
        delta: opts.delta as string,
        insight: opts.insight as string | undefined,
        status: opts.status as 'completed' | 'failed',
      });

      console.log(`Record closed: ${record.record_id}`);
      console.log(`  status:  ${record.status}`);
      console.log(`  delta:   ${record.delta}`);
      if (record.insight?.provider) {
        console.log(`  insight: ${record.insight.provider}`);
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

// ---- entry point ---------------------------------------------------------

await program.parseAsync(process.argv);
