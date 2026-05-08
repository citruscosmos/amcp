# Changelog

## [0.1.0] — 2026-05-08

### Added

- `iedi start` — open a new IEDI record with intent, work-domain, and optional tool-called
- `iedi evidence add` — append evidence to an open record via `--last`, `--record-id`, or stdin
- `iedi close` — close a record with delta, insight, and status; computes SHA-256 hash chain
- `iedi query` — list records with optional work-domain filter, limit, and `--json` output
- SQLite-backed storage (`~/.iedi/records.db`) with hash chain integrity (JCS + SHA-256)
- CHECK constraints on `status`, `work_domain`, `mode_used` columns
- 3 indexes on `status`, `closed_at`, `created_at` for query performance
- ULID-based record IDs for stable sort order
- 32-test suite (vitest): unit tests for IediStore + CLI integration tests

### Fixed

- EPIPE crash when piping `iedi query --json` output to `head`, `jq`, etc.
- Concurrent write protection via `db.transaction()` on all write operations
- Non-deterministic hash-chain ordering — `ORDER BY record_id DESC` (ULID tiebreaker)
- Input validation: `--work-domain`, `--status`, `--limit` all validated at CLI layer
