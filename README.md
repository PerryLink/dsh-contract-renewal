<div align="center">

# dsh-contract-renewal

> **Official repository.** The only official repository for this package, maintained by PerryLink. Apache-2.0.

[![npm](https://img.shields.io/npm/v/dsh-contract-renewal)](https://www.npmjs.com/package/dsh-contract-renewal)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)

**Register contracts → list expired / renewal-window / soon-due exposure as of a date → export CSV.**

> **Status: alpha / public synthetic / partial / not counted / not GA.** No customer data, no customer evidence, no production-availability claim.

[English](README.md) · [简体中文](README-zh.md)

```sh
dsh plugin --profile <profile> add dsh-contract-renewal
```

</div>

## One-liner

Keep a local registry of contract metadata (number, counterparty, start/end dates, renewal-window days, owner, amount), project it onto one `as_of` date into three mutually exclusive groups — expired, in renewal window, due within N days — with the remaining days, then export CSV.

> It only does date/registry arithmetic. It does **not** parse contract text, judge clauses, send reminders, or replace legal advice.

## Fit / not a fit

- **Fit**: a legal, procurement or admin team with a batch of contracts that needs one consistent view of “what already expired and what needs renewal”; a registry and due list to hand to a reviewer; a local CSV to pivot or load elsewhere.
- **Not a fit**: parsing contract PDFs/Word (use `dsh-legal-clause`); receiving and deduplicating email (use `dsh-legal-intake`); automatically sending renewal mail or calling an OA/CLM; a multi-tenant contract system with approvals and per-role permissions; deciding whether a contract should be renewed.

## Input

- One registry CSV or one `contract.ingest` call per contract. Each row has seven fields:
  `contract_no` (unique), `counterparty`, `start_date`, `end_date` (strict `YYYY-MM-DD`), `renewal_window_days` (integer 0–3650), `owner`, `amount` (non-negative, at most two decimals).
- Dates must be real ISO dates. `2026-02-30`, `2026-13-01` and `2026/12/01` all fail with `E_CONTRACT_DATE_INVALID`.
- Contract numbers are unique case-insensitively inside one registry; a duplicate fails with `E_CONTRACT_DUPLICATE`.
- The registry lives at `$DSH_HOME/storages/dsh-contract-renewal/contracts.jsonl` (one JSON object per line). Contract files are never read or modified.

## Output

- `contract.ingest`: `{ contract_no, counterparty, start_date, end_date, renewal_window_days, owner, amount, total }`, where `total` is the registry row count.
- `contract.upcoming`: `{ as_of, within_days, expired, in_renewal_window, expiring_soon, counts }`; every item carries `days_left` (negative = expired) and `status`.
- `contract.report`: path, filename, `sha256`, row count, bytes and `as_of`; the CSV is written under `$DSH_HOME/storages/dsh-contract-renewal/exports/`.

The three groups are **mutually exclusive** — one contract appears at most once for a given `as_of`:

| Group | Rule | Note |
|---|---|---|
| `expired` | `days_left < 0` | Always listed, however long ago it expired |
| `in_renewal_window` | `0 ≤ days_left ≤ renewal_window_days` | The renewal window wins over the “N days” bucket |
| `expiring_soon` | not in the window and `days_left ≤ within_days` | Due within N days but not yet in the window |
| not returned | everything else | Counted only in `counts.later` |

`as_of` defaults to **today (UTC)**; `within_days` defaults to 90. All date math uses UTC calendar days, so the local time zone, DST and `TZ` cannot shift a result.

## Example

Copy this sentence:

> 把这 5 份合同登记进来，按 2026-12-01 看哪些已过期、哪些进了续签窗口、90 天内到期，再导出一份 CSV。

Re-run the bundled sample and verify the golden file:

```sh
node samples/quickstart/run.mjs --check
```

![dsh-contract-renewal quickstart terminal output](docs/assets/quickstart.png)

The sample is five synthetic `DEMO-*` contracts with `as_of=2026-12-01` and `within_days=90`:

```text
expired: DEMO-MSA-2026-001 2026-11-15 (-16 days)
window:  DEMO-NDA-2026-002 2026-12-01 (0 days, window 30)
window:  DEMO-SAAS-2026-003 2026-12-20 (19 days, window 60)
soon:    DEMO-LEASE-2026-004 2027-01-15 (45 days, window 30)
later:   DEMO-SUPPORT-2026-005 2027-03-31 (120 days) — later only
```

`samples/quickstart/expected/result.json` is the real stdout of `node samples/quickstart/run.mjs --json`, not hand-written. Counterparties deliberately contain a comma and a quote (`华东合成制造有限公司, 上海分公司`, `Northwind "APAC" Ltd.`) to exercise both CSV escapes; re-registering the first contract returns `E_CONTRACT_DUPLICATE`.

## Permissions

Read: the user-supplied contract registry CSV (sample: `samples/quickstart/input/contracts.csv`); no other directory, no contract body files.
Write: `$DSH_HOME/storages/dsh-contract-renewal/` (`contracts.jsonl` and `exports/*.csv`); original files are untouched.
Network: no.
External systems: none.

`contract.upcoming` is **R0** (read-only); `contract.ingest` and `contract.report` are **R1** (local write, restricted to the directory above). `DSH_CONTRACT_HOME` overrides the local write root for tests; the default is exactly `$DSH_HOME/storages/dsh-contract-renewal`.

## FAQ

### 1. Why are old expired contracts still listed?

Exposing missed renewals is the point of the `expired` group, so it is not cut off by `within_days`. Items are sorted by `days_left`, most overdue first.

### 2. Can a contract appear in both “due within N days” and “renewal window”?

No. The groups are mutually exclusive: expired first, then renewal window, then the N-day bucket. If `within_days=30` but a contract has a 60-day window, it stays in `in_renewal_window` even at 45 days left.

### 3. Can a time zone shift a date by one day?

No. Dates are converted to UTC day numbers before subtraction; no local-time or DST arithmetic is involved. When `as_of` is omitted it is UTC today. The test suite runs the same fixtures under `TZ=UTC`, `America/Los_Angeles` and `Pacific/Kiritimati` and compares the output byte for byte.

### 4. How do I update a renewed contract?

The registry is append-only. Register a new contract number such as `DEMO-MSA-2026-001-v2` and keep the old row for history. Do not hand-edit `contracts.jsonl`.

### 5. Does it read the PDF, send reminders or upload anything?

No. It only computes dates and amounts from the registry: no contract body parsing, no email/OA calls, no network, no model call. Use `dsh-legal-clause` for clause coverage.

## Version

`0.1.0` · 23 tests passing (`node --test test/*.test.mjs`).

## Install

```sh
dsh plugin --profile <profile> add dsh-contract-renewal
dsh --profile <profile> --dump-config | grep dsh-contract-renewal
```

Uninstall:

```sh
dsh plugin --profile <profile> remove dsh-contract-renewal
```

### Install channels

- **npm (recommended):** `dsh plugin --profile <profile> add dsh-contract-renewal`
- **git:** `dsh plugin --profile <profile> add github:PerryLink/dsh-contract-renewal`
- **tarball:** `pnpm pack`, then `dsh plugin --profile <profile> add ./dsh-contract-renewal-<version>.tgz`

## Tools

Tool names are a stable API; descriptions stay in English to match runtime output.

| Tool | Purpose | Risk |
|---|---|---|
| `contract.ingest` | Register one contract into `contracts.jsonl`; stable codes for bad dates/duplicates | R1 local write |
| `contract.upcoming` | Group by `as_of` with `days_left`; defaults to UTC today and 90 days | R0 |
| `contract.report` | Export a quoted CSV and return path, sha256, rows and bytes | R1 local write |

### Exact group boundaries

1. `end_date < as_of` → `expired`, `days_left` negative.
2. `0 ≤ days_left ≤ renewal_window_days` → `in_renewal_window`; both 0 (due today) and the window size are inside.
3. Outside the window and `days_left ≤ within_days` → `expiring_soon`; exactly `within_days` is inside, `within_days + 1` is not.
4. Everything else → `later`, counted but not returned.

## Quick start

```sh
# 1) register one contract
#    tool surface: contract.ingest({ contract_no: "DEMO-MSA-2026-001", counterparty: "…",
#                  start_date: "2026-01-01", end_date: "2026-11-15",
#                  renewal_window_days: 60, owner: "王敏", amount: 128000 })

# 2) look at one date
#    tool surface: contract.upcoming({ as_of: "2026-12-01", within_days: 90 })

# 3) export CSV
#    tool surface: contract.report({ as_of: "2026-12-01", filename: "contracts-2026-12-01.csv" })
```

Run the sample:

```sh
node samples/quickstart/run.mjs --check
```

## Acceptance evidence

Public/synthetic fixtures live in `samples/quickstart/`; `ACCEPTANCE.csv` records the checks (everything except the quickstart row is `counted=false`).

| req_id | metric | threshold | actual | pass | source | counted |
|---|---|---|---|---|---|---|
| CR-A03 | upcoming groups | 1 expired / 2 window / 1 soon / 1 later | 1/2/1/1 | true | public/synthetic | false |
| CR-A04 | window boundary days_left | -16\|0/30 | -16\|0/30 | true | public/synthetic | false |
| CR-A07 | CSV quoting | comma+quote escaped | escaped | true | public/synthetic | false |
| CR-QS01 | quickstart golden | 1/1 | 1 | true | synthetic/quickstart | true |

*Fixture-backed acceptance rows, not a customer run; no output is invented.*

## Limits and known limitations

- Registry and date arithmetic only; no contract body parsing, clause review or legal judgement.
- No automatic renewal notice; no email, OA, CLM, e-signature or external system.
- Append-only JSONL: no in-place update/delete. Register a new number for a renewal.
- Uniqueness is case-insensitive (`toUpperCase()`); add a suffix if your numbering is case-sensitive.
- Amount validation is non-negative, ≤ 2 decimals and ≤ 1e12; no FX, tax or currency conversion.
- Dates are limited to years 1000–9999; windows and `within_days` are integers 0–3650.
- CSV is RFC 4180 only; formula prefixes are not stripped. Do not open untrusted CSV in Excel.
- Public/synthetic samples only; alpha/partial, not counted, not a GA or production claim.

## Development

```sh
pnpm install
pnpm build && pnpm lint && pnpm typecheck
node --test test/*.test.mjs
node scripts/gate.mjs
```

## Compatibility

| Dimension | Status |
|---|---|
| Harness | `dsh >=0.2.1-rc.3 <0.4.0` |
| Node | `>=24.9.0 <25` |
| Platforms | All; local files only |
| Data | No network, no model call, no upload |

## Related work

- [dsh-legal-intake](https://github.com/PerryLink/dsh-legal-intake) — legal email intake, dedupe and classification
- [dsh-legal-clause](https://github.com/PerryLink/dsh-legal-clause) — clause tree and 12-key coverage
- [dsh-contract-pack](../dsh-contract-pack/README.md) — the three plugins as one end-to-end scenario

## License

Apache-2.0. See `LICENSE`, `NOTICE`.
