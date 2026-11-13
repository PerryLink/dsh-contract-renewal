#!/usr/bin/env node
/**
 * Acceptance checks over public/synthetic fixtures. Writes ACCEPTANCE.csv and
 * evidence/<run_id>/result.json. No network, no customer data.
 *
 *   node scripts/acceptance.mjs
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createTools } from '../lib/plugin/tools.js'
import { FileContractStore } from '../lib/core/store.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const errors = []
const HEADER = 'contract_no,counterparty,start_date,end_date,renewal_window_days,owner,amount,days_left,status\n'

async function errorCode(promise) {
  try {
    await promise
    return 'NO_ERROR'
  } catch (error) {
    return error?.code ?? error?.name ?? 'UNKNOWN'
  }
}

function contract(overrides) {
  return {
    contract_no: 'ACC-001',
    counterparty: 'Acme, Inc.',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    renewal_window_days: 30,
    owner: '王敏',
    amount: 1000,
    ...overrides,
  }
}

async function main() {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'dsh-contract-renewal-acceptance-'))
  const baseDir = path.join(tempDir, 'store')
  const emptyDir = path.join(tempDir, 'empty')
  try {
    const tools = Object.fromEntries(createTools({ baseDir }).map((tool) => [tool.name, tool]))
    const exec = { callId: 'acceptance' }
    const fixtures = [
      contract({ contract_no: 'ACC-EXPIRED-001', end_date: '2026-11-15', renewal_window_days: 60 }),
      contract({ contract_no: 'ACC-WINDOW-002', end_date: '2026-12-01', renewal_window_days: 30 }),
      contract({ contract_no: 'ACC-WINDOW-003', end_date: '2026-12-31', renewal_window_days: 30 }),
      contract({ contract_no: 'ACC-SOON-004', end_date: '2027-01-01', renewal_window_days: 30 }),
      contract({ contract_no: 'ACC-LATER-005', end_date: '2027-03-31', renewal_window_days: 90, counterparty: 'Northwind "APAC" Ltd.' }),
    ]
    for (const fixture of fixtures) await tools['contract_ingest'].execute(fixture, exec)
    const stored = await new FileContractStore(baseDir).load()
    const duplicateCode = await errorCode(tools['contract_ingest'].execute(fixtures[0], exec))

    const upcoming = await tools['contract_upcoming'].execute({ as_of: '2026-12-01', within_days: 90 }, exec)
    const exported = await tools['contract_report'].execute({ as_of: '2026-12-01', within_days: 90 }, exec)
    const csvText = readFileSync(exported.path, 'utf8')

    const emptyTools = Object.fromEntries(createTools({ baseDir: emptyDir }).map((tool) => [tool.name, tool]))
    const emptyUpcoming = await emptyTools['contract_upcoming'].execute({ as_of: '2026-12-01' }, exec)
    const emptyReport = await emptyTools['contract_report'].execute({ as_of: '2026-12-01' }, exec)
    const emptyText = readFileSync(emptyReport.path, 'utf8')

    const dateCode = await errorCode(tools['contract_upcoming'].execute({ as_of: '2026-02-30' }, exec))
    const pathCode = await errorCode(tools['contract_report'].execute({ as_of: '2026-12-01', filename: '../evil.csv' }, exec))
    const quoted = csvText.includes('"Acme, Inc."') && csvText.includes('"Northwind ""APAC"" Ltd."')
    const hashOk = exported.sha256 === sha256(csvText) && exported.bytes === Buffer.byteLength(csvText, 'utf8')
    const boundaryText = upcoming.expired.map((item) => item.days_left).join('/')
      + '|' + upcoming.in_renewal_window.map((item) => item.days_left).join('/')

    const metrics = [
      { req_id: 'CR-A01', metric: 'registry rows', threshold: '5', actual: String(stored.length), pass: stored.length === 5 },
      { req_id: 'CR-A02', metric: 'duplicate guard', threshold: 'E_CONTRACT_DUPLICATE', actual: duplicateCode, pass: duplicateCode === 'E_CONTRACT_DUPLICATE' },
      { req_id: 'CR-A03', metric: 'upcoming groups', threshold: '1 expired / 2 window / 1 soon / 1 later', actual: `${upcoming.counts.expired}/${upcoming.counts.in_renewal_window}/${upcoming.counts.expiring_soon}/${upcoming.counts.later}`, pass: upcoming.counts.expired === 1 && upcoming.counts.in_renewal_window === 2 && upcoming.counts.expiring_soon === 1 && upcoming.counts.later === 1 },
      { req_id: 'CR-A04', metric: 'window boundary days_left', threshold: '-16|0/30', actual: boundaryText, pass: boundaryText === '-16|0/30' },
      { req_id: 'CR-A05', metric: 'empty registry', threshold: 'total=0 + header only', actual: `total=${emptyUpcoming.counts.total} rows=${emptyReport.rows}`, pass: emptyUpcoming.counts.total === 0 && emptyReport.rows === 0 && emptyText === HEADER },
      { req_id: 'CR-A06', metric: 'invalid ISO date', threshold: 'E_CONTRACT_DATE_INVALID', actual: dateCode, pass: dateCode === 'E_CONTRACT_DATE_INVALID' },
      { req_id: 'CR-A07', metric: 'CSV quoting', threshold: 'comma+quote escaped', actual: quoted ? 'escaped' : 'missing', pass: quoted },
      { req_id: 'CR-A08', metric: 'CSV sha256', threshold: 'matches file', actual: exported.sha256.slice(0, 12), pass: hashOk },
      { req_id: 'CR-A09', metric: 'export path safety', threshold: 'traversal rejected', actual: pathCode, pass: pathCode === 'E_CONTRACT_PATH_INVALID' },
    ]

    let quickstartPass = true
    try {
      execFileSync(process.execPath, ['samples/quickstart/run.mjs', '--check'], { cwd: root, stdio: 'ignore' })
    } catch {
      quickstartPass = false
    }
    const quickstartHash = sha256(readFileSync(path.join(root, 'samples', 'quickstart', 'expected', 'result.json')))
    const quickstart = { req_id: 'CR-QS01', metric: 'quickstart golden', threshold: '1/1', actual: quickstartPass ? '1' : '0', pass: quickstartPass, evidence_sha256: quickstartHash }

    const failures = metrics.filter((item) => !item.pass)
    for (const failure of failures) errors.push(`${failure.req_id} ${failure.metric}: ${failure.actual}`)
    if (!quickstartPass) errors.push('CR-QS01 quickstart golden failed')

    const runId = `contract-renewal-${Date.now()}`
    const evidence = {
      run_id: runId,
      scope: 'CONTRACT-RENEWAL-S1',
      status: failures.length === 0 && quickstartPass ? 'pass' : 'fail',
      counted: false,
      note: 'synthetic contracts only; no customer data, no network',
      metrics,
      pass: failures.length === 0 && quickstartPass,
    }
    const evidenceDir = path.join(root, 'evidence', runId)
    mkdirSync(evidenceDir, { recursive: true })
    const evidenceJson = `${JSON.stringify(evidence, null, 2)}\n`
    writeFileSync(path.join(evidenceDir, 'result.json'), evidenceJson)
    const evidenceHash = sha256(evidenceJson)

    const rows = [
      ...metrics.map((item) => `${item.req_id},${item.metric},${item.threshold},${item.actual},scripts/acceptance.mjs,${evidenceHash},${item.pass},public/synthetic,false`),
      `${quickstart.req_id},${quickstart.metric},${quickstart.threshold},${quickstart.actual},samples/quickstart/run.mjs,${quickstart.evidence_sha256},${quickstart.pass},synthetic/quickstart,true`,
    ]
    writeFileSync(
      path.join(root, 'ACCEPTANCE.csv'),
      `req_id,metric,threshold,actual,script,evidence_sha256,pass,source,counted\n${rows.join('\n')}\n`,
    )

    if (errors.length > 0) {
      for (const error of errors) console.error(`acceptance: ${error}`)
      process.exit(1)
    }
    console.log(`acceptance ok: ${metrics.length + 1} checks`)
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

await main()
