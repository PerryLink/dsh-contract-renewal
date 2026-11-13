<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/dsh-contract-renewal-hero-en-dark.webp">
  <img src="docs/assets/dsh-contract-renewal-hero-en-light.webp" width="100%" alt="dsh-contract-renewal banner: one renewal-window bar per quickstart contract (width = that contract's renewal_window_days) on a days_left axis, with as_of 2026-12-01 as the vertical line — DEMO-MSA-2026-001 expired 16 days ago (60-day window), DEMO-NDA-2026-002 due today so inside its window, DEMO-SAAS-2026-003 19 days left in a 60-day window, DEMO-LEASE-2026-004 45 days left but its 30-day window already passed so it lands in N days, DEMO-SUPPORT-2026-005 120 days out and only counted (later); counts 1 / 2 / 1 / 1, taken from samples/quickstart/expected/result.json">
</picture>

# dsh-contract-renewal

**Register contracts → see expired / renewal-window / soon-due exposure as of a date → export CSV.**

A local-only contract expiry register for DeepSeek Harness: seven fields per row, three mutually exclusive groups, remaining days at a glance — date and registry arithmetic only, with no contract parsing, no reminders and no network.

[Install](#three-step-setup) · [Configuration](#configuration) · [FAQ](#faq) · [简体中文](README.md) · [English](README.en.md) · [Español](README.es.md) · [Português](README.pt.md) · [हिन्दी](README.hi.md)

[![License](https://img.shields.io/badge/license-Apache--2.0-3366CC?style=flat-square&labelColor=2B3245)](LICENSE)
[![DSH](https://img.shields.io/badge/DSH-%E2%89%A50.2.1%20%3C0.4.0-4B67B4?style=flat-square&labelColor=2B3245)](#compatibility)
[![npm](https://img.shields.io/npm/v/dsh-contract-renewal?style=flat-square&labelColor=2B3245&color=CB3837)](https://www.npmjs.com/package/dsh-contract-renewal)
[![CI](https://img.shields.io/github/actions/workflow/status/PerryLink/dsh-contract-renewal/ci.yml?branch=main&label=CI&style=flat-square&labelColor=2B3245)](https://github.com/PerryLink/dsh-contract-renewal/actions/workflows/ci.yml)
[![Node](https://img.shields.io/badge/node-%E2%89%A524.9%20%3C25-339933?style=flat-square&labelColor=2B3245)](#compatibility)

[![Stars](https://img.shields.io/github/stars/PerryLink/dsh-contract-renewal?style=flat-square&labelColor=2B3245)](https://github.com/PerryLink/dsh-contract-renewal/stargazers)
[![npm downloads](https://img.shields.io/npm/dm/dsh-contract-renewal?style=flat-square&labelColor=2B3245&color=CB3837)](https://www.npmjs.com/package/dsh-contract-renewal)
[![dshfind](https://dshfind.com/api/badge/PerryLink/dsh-contract-renewal?metric=downloads)](https://dshfind.com/plugins/PerryLink/dsh-contract-renewal?ref=badge)
[![Gitee](https://img.shields.io/badge/Gitee-mirror-C71D23?style=flat-square&labelColor=2B3245&logo=gitee)](https://gitee.com/perrylink/dsh-contract-renewal)

```sh
dsh plugin --profile <profile> add dsh-contract-renewal
```

</div>

<sub>Community plugin, not affiliated with DeepSeek. Canonical repository: <https://github.com/PerryLink/dsh-contract-renewal> (Gitee is a mirror); same-name repositories under other accounts are unrelated.</sub>

<sub>Status: alpha / public synthetic / partial / not counted / not GA — no customer data, no customer evidence, and no production-availability claim.</sub>

## What it is

One sentence: keep a local registry of contract metadata (number, counterparty, start/end dates, renewal-window days, owner, amount), project it onto one `as_of` date into three groups — expired, in renewal window, due within N days — with the remaining days, then export CSV.

> It only does date and registry arithmetic. It does **not** parse contract text, judge clauses, send reminders, or replace legal advice.

- **Fit**: a legal, procurement or admin team with a batch of contracts that needs one consistent view of “what already expired and what needs renewal”; a registry and due list to hand to a reviewer; a local CSV to pivot or load elsewhere.
- **Not a fit**: parsing contract PDFs/Word (use `dsh-legal-clause`); receiving and deduplicating email (use `dsh-legal-intake`); automatically sending renewal mail or calling an OA/CLM; a multi-tenant contract system with approvals and per-role permissions; deciding whether a contract should be renewed.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/dsh-contract-renewal-flow-v5-dark.svg">
  <img src="docs/assets/dsh-contract-renewal-flow-v5-light.svg" width="100%" alt="dsh-contract-renewal structure: the write side (contract_ingest) validates the 7 fields of contracts.csv — strict ISO dates, case-insensitive unique numbers, window 0–3650, amount with at most two decimals — and appends to $DSH_HOME/storages/dsh-contract-renewal/contracts.jsonl (R1, append-only); the read side computes days_left = end_date − as_of in UTC day numbers and applies four ordered exclusive tests: days_left < 0 → expired, 0 ≤ days_left ≤ w (renewal_window_days) → in_renewal_window, w < days_left ≤ N (within_days, default 90) → expiring_soon, > N → counts.later only; two exits: contract_upcoming returns the three groups plus counts (R0), contract_report writes all 5 rows as CSV with sha256 / rows / bytes under exports/ (R1)">
</picture>

## Three-step setup

1. **Install** (pick one channel):

   ```sh
   # npm channel (recommended, published releases)
   dsh plugin --profile <profile> add dsh-contract-renewal
   # git channel (latest main; equivalent to git+https://github.com/PerryLink/dsh-contract-renewal.git)
   dsh plugin --profile <profile> add github:PerryLink/dsh-contract-renewal
   # tarball channel: pnpm pack in this repo, then
   dsh plugin --profile <profile> add ./dsh-contract-renewal-<version>.tgz
   ```

2. **Minimal config** (there are no Config keys; `cordis.patch.yml` inserts this one row):

   ```yaml
   - insert:
       - id: dsh-contract-renewal
         name: dsh-contract-renewal
   ```

3. **Verify it mounts**:

   ```sh
   dsh --profile <profile> --dump-config | grep dsh-contract-renewal
   node samples/quickstart/run.mjs --check
   ```

**Uninstall**: `dsh plugin --profile <profile> remove dsh-contract-renewal` (or remove the row from the profile patch).

## Core capabilities

Tool names are a stable API; descriptions stay in English to match runtime output. Names use only ASCII letters, digits and underscores, matching the provider's `^[a-zA-Z0-9_-]+$` check on `tools[].name`.

| Tool | Purpose | Risk |
|---|---|---|
| `contract_ingest` | Register one contract into `contracts.jsonl`; stable codes for bad dates/duplicates | R1 local write |
| `contract_upcoming` | Group by `as_of` with `days_left`; defaults to UTC today and 90 days | R0 |
| `contract_report` | Export a quoted CSV and return path, sha256, rows and bytes | R1 local write |

- **Three exclusive groups, one row per contract** — `expired`, `in_renewal_window`, and `expiring_soon` (due within N days but not yet in the window); everything else is counted only in `counts.later`, so nothing is double-counted.
- **Append-only local registry** — one JSON object per line under `$DSH_HOME/storages/dsh-contract-renewal/contracts.jsonl`; contract files are never read or modified, and a renewal is registered under a new number so history survives.
- **UTC calendar days** — every date becomes a UTC day number before subtraction, so the local time zone, DST and `TZ` cannot shift a result.
- **Verifiable CSV export** — RFC 4180 quoting plus `sha256`, row count and byte count; the filename must be a single safe component, and traversal is rejected.
- **Fail closed** — invalid dates, duplicates, out-of-range windows and unsafe paths all return `<human sentence>（E_CONTRACT_XXX）｜Next: <one action>` instead of failing silently.

### Exact group boundaries

1. `end_date < as_of` → `expired`, `days_left` negative.
2. `0 ≤ days_left ≤ renewal_window_days` → `in_renewal_window`; both 0 (due today) and the window size are inside.
3. Outside the window and `days_left ≤ within_days` → `expiring_soon`; exactly `within_days` is inside, `within_days + 1` is not.
4. Everything else → `later`, counted but not returned.

## Input

- One registry CSV or one `contract_ingest` call per contract. Each row has seven fields:
  `contract_no` (unique), `counterparty`, `start_date`, `end_date` (strict `YYYY-MM-DD`), `renewal_window_days` (integer 0–3650), `owner`, `amount` (non-negative, at most two decimals).
- Dates must be real ISO dates. `2026-02-30`, `2026-13-01` and `2026/12/01` all fail with `E_CONTRACT_DATE_INVALID`.
- Contract numbers are unique case-insensitively inside one registry; a duplicate fails with `E_CONTRACT_DUPLICATE`.
- The registry lives at `$DSH_HOME/storages/dsh-contract-renewal/contracts.jsonl` (one JSON object per line). Contract files are never read or modified.

## Output

- `contract_ingest`: `{ contract_no, counterparty, start_date, end_date, renewal_window_days, owner, amount, total }`, where `total` is the registry row count.
- `contract_upcoming`: `{ as_of, within_days, expired, in_renewal_window, expiring_soon, counts }`; every item carries `days_left` (negative = expired) and `status`.
- `contract_report`: path, filename, `sha256`, row count, bytes and `as_of`; the CSV is written under `$DSH_HOME/storages/dsh-contract-renewal/exports/`.

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

> Register these 5 contracts, then as of 2026-12-01 show which are expired, which are in the renewal window and which are due within 90 days, and export a CSV.

### Tool-surface calls

```sh
# 1) register one contract
#    tool surface: contract_ingest({ contract_no: "DEMO-MSA-2026-001", counterparty: "…",
#                  start_date: "2026-01-01", end_date: "2026-11-15",
#                  renewal_window_days: 60, owner: "王敏", amount: 128000 })

# 2) look at one date
#    tool surface: contract_upcoming({ as_of: "2026-12-01", within_days: 90 })

# 3) export CSV
#    tool surface: contract_report({ as_of: "2026-12-01", filename: "contracts-2026-12-01.csv" })
```

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

`samples/quickstart/expected/result.json` is the real stdout of `node samples/quickstart/run.mjs --json`, not hand-written; the screenshot is the real terminal output of `--check` (raw log in [`docs/assets/quickstart.log`](docs/assets/quickstart.log)).

Two counterparties in the sample deliberately contain a comma and a quote — `Northwind "APAC" Ltd.` and a Chinese company name with an embedded comma — to exercise both CSV escapes; re-registering the first contract returns `E_CONTRACT_DUPLICATE`.

## Configuration

This plugin has **no Config keys** — `cordis.patch.yml` only inserts the row above, and the three tools are usable as soon as it mounts. Everything adjustable lives on the tool call parameters:

| Tool | Parameter | Required | Default | Meaning |
|---|---|---|---|---|
| `contract_ingest` | the seven contract fields | yes | — | number, counterparty, start/end dates, renewal window, owner, amount |
| `contract_upcoming` | `as_of` | no | today (UTC) | grouping date, `YYYY-MM-DD`; pass it explicitly to reproduce “today” |
| `contract_upcoming` | `within_days` | no | `90` | the N of “due within N days”, integer 0–3650 |
| `contract_report` | `as_of` | no | today (UTC) | grouping date used for the export |
| `contract_report` | `within_days` | no | `90` | the N used for the export |
| `contract_report` | `filename` | no | `contracts-<as_of>.csv` | only `[A-Za-z0-9._-]`; no paths |

Profile patch example (no config block, only the identity row):

```yaml
- insert:
    - id: dsh-contract-renewal
      name: dsh-contract-renewal
```

Tests can override the local write root with the `DSH_CONTRACT_HOME` environment variable; the default is exactly `$DSH_HOME/storages/dsh-contract-renewal`.

## FAQ

<details>
<summary>Why are old expired contracts still listed?</summary>

Exposing missed renewals is the point of the `expired` group, so it is not cut off by `within_days`. Items are sorted by `days_left`, most overdue first.

</details>

<details>
<summary>Can a contract appear in both “due within N days” and “renewal window”?</summary>

No. The groups are mutually exclusive: expired first, then renewal window, then the N-day bucket. If `within_days=30` but a contract has a 60-day window, it stays in `in_renewal_window` even at 45 days left.

</details>

<details>
<summary>Can a time zone shift a date by one day?</summary>

No. Dates are converted to UTC day numbers before subtraction; no local-time or DST arithmetic is involved. When `as_of` is omitted it is UTC today. The test suite runs the same fixtures under `TZ=UTC`, `America/Los_Angeles` and `Pacific/Kiritimati` and compares the output byte for byte.

</details>

<details>
<summary>How do I update a renewed contract?</summary>

The registry is append-only. Register a new contract number such as `DEMO-MSA-2026-001-v2` and keep the old row for history. Do not hand-edit `contracts.jsonl`.

</details>

<details>
<summary>Does it read the PDF, send reminders or upload anything?</summary>

No. It only computes dates and amounts from the registry: no contract body parsing, no email/OA calls, no network, no model call. Use `dsh-legal-clause` for clause coverage.

</details>

## Permissions and data

Read: the user-supplied contract registry CSV (sample: `samples/quickstart/input/contracts.csv`); no other directory, no contract body files.  
Write: `$DSH_HOME/storages/dsh-contract-renewal/` (`contracts.jsonl` and `exports/*.csv`); original files are untouched.  
Network: no.  
External systems: none.

`contract_upcoming` is **R0** (read-only); `contract_ingest` and `contract_report` are **R1** (local write, restricted to the directory above). `DSH_CONTRACT_HOME` overrides the local write root for tests; the default is exactly `$DSH_HOME/storages/dsh-contract-renewal`.

## Error codes

| Code | When it appears | Next step |
|---|---|---|
| `E_CONTRACT_DATE_INVALID` | a date is not a real `YYYY-MM-DD` (e.g. `2026-02-30`, `2026/12/01`, an ISO string with a time) | use strict `YYYY-MM-DD` and a date that actually exists |
| `E_CONTRACT_DUPLICATE` | the number already exists in the registry (case-insensitive) | register a new number for the renewal (e.g. `-v2`) and keep history |
| `E_CONTRACT_DATE_RANGE` | the end date is earlier than the start date | check whether `start_date` / `end_date` were swapped |
| `E_CONTRACT_WINDOW_INVALID` | the renewal window or the N-day threshold is not an integer 0–3650 | pass an integer 0–3650, e.g. `renewal_window_days: 60` |
| `E_CONTRACT_AMOUNT_INVALID` | the amount is negative, has more than two decimals, or exceeds 1e12 | use a plain number with at most two decimals; write `0` when unknown |
| `E_CONTRACT_FIELD_REQUIRED` / `E_CONTRACT_FIELD_INVALID` | a required field is empty, or a name has newlines/tabs or is too long | fill the field; counterparty ≤200 chars, owner ≤120 chars |
| `E_CONTRACT_NO_INVALID` | the number does not start with a letter/digit or contains other characters (max 64) | rewrite it, e.g. `DEMO-MSA-2026-001` |
| `E_CONTRACT_STORE_FAILED` | the registry cannot be read or written | make sure `$DSH_HOME/storages/dsh-contract-renewal` is writable |
| `E_CONTRACT_EXPORT_FAILED` / `E_CONTRACT_PATH_INVALID` / `E_CONTRACT_PATH_NOT_ALLOWED` | the CSV write failed, the filename is unsafe, or the path escapes the export dir | pass `[A-Za-z0-9._-]` only for `filename` |

Error text format: `<human sentence>（E_CONTRACT_XXX）｜Next: <one action>`. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for the full triage.

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

## Compatibility

| Dimension | Status |
|---|---|
| Harness | `dsh >=0.2.1-rc.3 <0.4.0` |
| Node | `>=24.9.0 <25` |
| Platforms | All; local files only |
| Data | No network, no model call, no upload |

Current version `0.2.0`, 24 tests passing (`node --test test/*.test.mjs`).

## Ecosystem & quality

- [Gitee mirror](https://gitee.com/perrylink/dsh-contract-renewal) (synced mirror; GitHub is canonical)
- [dshfind plugin page](https://dshfind.com/plugins/PerryLink/dsh-contract-renewal) (installs and ranking)
- **1024 store channel**: run `npm i -g dsh1024`, then `dsh1024 plugin --profile <profile> add dsh-contract-renewal` (counted toward the [deepseek1024.com](https://deepseek1024.com) install ranking)
- [Ecosystem field guide](https://perrylink.github.io/dsh-plugin-guide/): plugin development guide · measured selection data · maintenance trade-offs

## Related work

- [dsh-legal-intake](https://github.com/PerryLink/dsh-legal-intake) — legal email intake, dedupe and classification
- [dsh-legal-clause](https://github.com/PerryLink/dsh-legal-clause) — clause tree and 12-key coverage
- [dsh-contract-pack](https://github.com/PerryLink/dsh-contract-pack) — the three plugins as one end-to-end scenario

## Development

```sh
pnpm install
pnpm build && pnpm lint && pnpm typecheck
node --test test/*.test.mjs
node scripts/gate.mjs
```

README images are generated by [`scripts/gen-readme-assets.py`](scripts/gen-readme-assets.py): the hero draws the five sample contracts as renewal-window lanes with Pillow, the structure figure is hand-written SVG of the four-bucket ladder, and every number is read from the quickstart golden `samples/quickstart/expected/result.json`; light and dark variants can be re-run at any time. `docs/assets/quickstart.png` is a real captured run and is kept together with `docs/assets/quickstart.log`.

Topics: `dsh`, `dsh-plugin`, `deepseek-harness`, `deepseek`, `contract`, `renewal`, `expiry`, `legal`, `csv`, `perrylink`

## Family & thanks

This project is a member of the DeepSeek Harness plugin family maintained by [PerryLink](https://github.com/PerryLink) (all Apache-2.0). If this plugin helps you, **give it a star** — it unlocks nothing, but it makes the plugin easier for the next person to find.

- [@PerryLink](https://github.com/PerryLink) — creator and maintainer: contract registry and UTC date engine, the three exclusive groups, CSV export and path safety, the quickstart golden sample, and the five-language docs.

## License

[LICENSE](LICENSE) (Apache License 2.0) © 2026 dsh-contract-renewal contributors. See also `NOTICE`.

<p align="center"><sub>Apache-2.0 · Community plugin, not affiliated with DeepSeek.</sub></p>
