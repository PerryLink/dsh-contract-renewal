#!/usr/bin/env node
/**
 * dsh-contract-renewal quickstart — registers the five bundled synthetic
 * contracts (DEMO-*), projects them onto 2026-12-01 and exports a CSV.
 *
 *   node samples/quickstart/run.mjs            # human-readable summary
 *   node samples/quickstart/run.mjs --json     # the golden result on stdout
 *   node samples/quickstart/run.mjs --check    # recompute and diff against the golden file
 *
 * The golden file `expected/result.json` is the stdout of `--json`; it is a real
 * run over the committed CSV, not hand-written output. No real party or amount.
 */
import assert from 'node:assert/strict'
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCsv } from '../../lib/core/csv.js'
import { createTools } from '../../lib/plugin/tools.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const samplePath = path.join(here, 'input', 'contracts.csv')
const expectedPath = path.join(here, 'expected', 'result.json')
const mode = process.argv.includes('--check') ? 'check' : process.argv.includes('--json') ? 'json' : 'summary'

const AS_OF = '2026-12-01'
const WITHIN_DAYS = 90

function readContracts(text) {
  const rows = parseCsv(text)
  const header = rows.shift() ?? []
  const index = Object.fromEntries(header.map((name, position) => [name, position]))
  for (const column of ['contract_no', 'counterparty', 'start_date', 'end_date', 'renewal_window_days', 'owner', 'amount']) {
    if (!(column in index)) throw new Error(`sample CSV is missing the ${column} column`)
  }
  return rows.map((row) => ({
    contract_no: row[index.contract_no],
    counterparty: row[index.counterparty],
    start_date: row[index.start_date],
    end_date: row[index.end_date],
    renewal_window_days: Number(row[index.renewal_window_days]),
    owner: row[index.owner],
    amount: Number(row[index.amount]),
  }))
}

async function run() {
  const contracts = readContracts(await readFile(samplePath, 'utf8'))
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'dsh-contract-renewal-quickstart-'))
  const realTemp = await realpath(tempDir)
  try {
    const tools = Object.fromEntries(createTools({ baseDir: tempDir }).map((tool) => [tool.name, tool]))
    const exec = { callId: 'quickstart' }

    for (const contract of contracts) await tools['contract_ingest'].execute(contract, exec)

    let duplicate = null
    try {
      await tools['contract_ingest'].execute(contracts[0], exec)
    } catch (error) {
      duplicate = error?.code ?? 'UNKNOWN'
    }

    const upcoming = await tools['contract_upcoming'].execute({ as_of: AS_OF, within_days: WITHIN_DAYS }, exec)
    const exported = await tools['contract_report'].execute({ as_of: AS_OF, within_days: WITHIN_DAYS }, exec)
    const csvText = await readFile(exported.path, 'utf8')

    return {
      sample: 'samples/quickstart/input/contracts.csv',
      as_of: AS_OF,
      within_days: WITHIN_DAYS,
      ingested: contracts.map((contract) => contract.contract_no),
      registry_total: contracts.length,
      duplicate_check: duplicate,
      upcoming: {
        counts: upcoming.counts,
        expired: upcoming.expired,
        in_renewal_window: upcoming.in_renewal_window,
        expiring_soon: upcoming.expiring_soon,
      },
      report: {
        path: path.relative(realTemp, exported.path).split(path.sep).join('/'),
        filename: exported.filename,
        sha256: exported.sha256,
        bytes: exported.bytes,
        rows: exported.rows,
        text: csvText,
      },
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

function printSummary(result) {
  const counts = result.upcoming.counts
  console.log('dsh-contract-renewal quickstart - 5 synthetic contracts (not customer data)')
  console.log(`as of ${result.as_of}, within ${result.within_days} days: ${counts.expired} expired / ${counts.in_renewal_window} in renewal window / ${counts.expiring_soon} expiring soon / ${counts.later} later`)
  for (const item of result.upcoming.expired) {
    console.log(`expired: ${item.contract_no} ${item.end_date} (${item.days_left} days)`)
  }
  for (const item of result.upcoming.in_renewal_window) {
    console.log(`window: ${item.contract_no} ${item.end_date} (${item.days_left} days, window ${item.renewal_window_days})`)
  }
  for (const item of result.upcoming.expiring_soon) {
    console.log(`soon: ${item.contract_no} ${item.end_date} (${item.days_left} days, window ${item.renewal_window_days})`)
  }
  console.log(`CSV ${result.report.path}: ${result.report.rows} rows, ${result.report.bytes} bytes, sha256 ${result.report.sha256.slice(0, 12)}...`)
  console.log(`duplicate guard: ${result.duplicate_check}`)
  console.log('CSV escaping: counterparty with comma -> quoted; quote -> doubled')
}

const result = await run()

if (mode === 'json') {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
} else if (mode === 'check') {
  const expected = JSON.parse(await readFile(expectedPath, 'utf8'))
  assert.deepEqual(result, expected)
  printSummary(result)
  console.log('golden samples/quickstart/expected/result.json matches')
  console.log('quickstart ok')
} else {
  printSummary(result)
  console.log('run with --check to compare against expected/result.json')
}
