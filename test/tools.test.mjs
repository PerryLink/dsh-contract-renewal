import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { safeExportPath } from '../lib/core/safe-path.js'
import { createTools } from '../lib/plugin/tools.js'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const toolsUrl = pathToFileURL(path.join(packageRoot, 'lib', 'plugin', 'tools.js')).href
const call = { callId: 'test' }

function contract(overrides) {
  return {
    contract_no: 'DEMO-TOOL-001',
    counterparty: 'Acme, Inc.',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    renewal_window_days: 30,
    owner: '王敏',
    amount: 1000.5,
    ...overrides,
  }
}

async function setup(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'dsh-contract-tools-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const tools = Object.fromEntries(createTools({ baseDir: dir }).map((tool) => [tool.name, tool]))
  return { dir, tools }
}

test('createTools exposes exactly the three documented contract.* tools', () => {
  const tools = createTools({ baseDir: path.join(os.tmpdir(), 'dsh-contract-smoke') })
  assert.deepEqual(tools.map((tool) => tool.name), ['contract.ingest', 'contract.upcoming', 'contract.report'])
  assert.equal(new Set(tools.map((tool) => tool.name)).size, 3)
  for (const tool of tools) {
    assert.ok(tool.description.length > 0)
    assert.equal(typeof tool.execute, 'function')
    assert.equal(typeof tool.output.render, 'function')
  }
})

test('ingest + upcoming keep the renewal-window boundary at exactly N days', async (t) => {
  const { tools } = await setup(t)
  const fixtures = [
    contract({ contract_no: 'DEMO-EXPIRED-001', end_date: '2026-11-15', renewal_window_days: 60 }),
    contract({ contract_no: 'DEMO-WINDOW-002', end_date: '2026-12-31', renewal_window_days: 30 }),
    contract({ contract_no: 'DEMO-SOON-003', end_date: '2027-01-01', renewal_window_days: 30 }),
  ]
  for (const fixture of fixtures) await tools['contract.ingest'].execute(fixture, call)

  const result = await tools['contract.upcoming'].execute({ as_of: '2026-12-01', within_days: 90 }, call)
  assert.equal(result.as_of, '2026-12-01')
  assert.equal(result.within_days, 90)
  assert.deepEqual(result.expired.map((item) => [item.contract_no, item.days_left]), [['DEMO-EXPIRED-001', -16]])
  assert.deepEqual(result.in_renewal_window.map((item) => [item.contract_no, item.days_left]), [['DEMO-WINDOW-002', 30]])
  assert.deepEqual(result.expiring_soon.map((item) => [item.contract_no, item.days_left]), [['DEMO-SOON-003', 31]])
  assert.deepEqual(result.counts, { total: 3, expired: 1, in_renewal_window: 1, expiring_soon: 1, later: 0 })
})

test('report writes an escaped CSV and matches sha256/byte counts', async (t) => {
  const { tools } = await setup(t)
  await tools['contract.ingest'].execute(contract({ contract_no: 'DEMO-CSV-001', counterparty: '华东合成制造有限公司, 上海分公司' }), call)
  await tools['contract.ingest'].execute(contract({ contract_no: 'DEMO-CSV-002', counterparty: 'Northwind "APAC" Ltd.' }), call)
  const exported = await tools['contract.report'].execute({ as_of: '2026-12-01', within_days: 90 }, call)
  const text = await readFile(exported.path, 'utf8')

  assert.equal(exported.rows, 2)
  assert.equal(exported.bytes, Buffer.byteLength(text, 'utf8'))
  assert.equal(exported.sha256, createHash('sha256').update(text).digest('hex'))
  assert.equal(exported.filename, 'contracts-2026-12-01.csv')
  assert.match(text, /"华东合成制造有限公司, 上海分公司"/)
  assert.match(text, /"Northwind ""APAC"" Ltd\."/)
  assert.match(text, /^contract_no,counterparty,start_date,end_date,renewal_window_days,owner,amount,days_left,status\n/)
  assert.equal(text.trim().split('\n').length, 3)
})

test('report on an empty registry writes only the header', async (t) => {
  const { tools } = await setup(t)
  const exported = await tools['contract.report'].execute({ as_of: '2026-12-01' }, call)
  const text = await readFile(exported.path, 'utf8')
  assert.equal(exported.rows, 0)
  assert.equal(text, 'contract_no,counterparty,start_date,end_date,renewal_window_days,owner,amount,days_left,status\n')
})

test('invalid as_of and within_days are rejected with stable codes', async (t) => {
  const { tools } = await setup(t)
  await assert.rejects(
    () => tools['contract.upcoming'].execute({ as_of: '2026-02-30' }, call),
    (error) => error.code === 'E_CONTRACT_DATE_INVALID',
  )
  await assert.rejects(
    () => tools['contract.report'].execute({ as_of: '2026-13-01' }, call),
    (error) => error.code === 'E_CONTRACT_DATE_INVALID',
  )
  await assert.rejects(
    () => tools['contract.upcoming'].execute({ as_of: '2026-12-01', within_days: -1 }, call),
    (error) => error.code === 'E_CONTRACT_WINDOW_INVALID',
  )
})

test('report filenames cannot traverse out of the exports directory', async (t) => {
  const { dir, tools } = await setup(t)
  for (const filename of ['../evil.csv', '..\\evil.csv', '/tmp/evil.csv', 'sub/evil.csv', 'a'.repeat(121)]) {
    await assert.rejects(
      () => tools['contract.report'].execute({ as_of: '2026-12-01', filename }, call),
      (error) => error.code === 'E_CONTRACT_PATH_INVALID',
      filename,
    )
  }
  const safe = await safeExportPath(path.join(dir, 'exports'), 'contracts-ok.csv')
  assert.equal(safe, path.join(await realpath(dir), 'exports', 'contracts-ok.csv'))
})

test('date math and default as_of are identical under UTC-8 and UTC+14', async (t) => {
  const dirs = []
  t.after(() => Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true }))))
  const fixtures = [
    contract({ contract_no: 'DEMO-TZ-001', end_date: '2026-11-30', renewal_window_days: 30 }),
    contract({ contract_no: 'DEMO-TZ-002', end_date: '2026-12-31', renewal_window_days: 30 }),
  ]
  const script = `
import { readFile } from 'node:fs/promises'
import { createTools } from ${JSON.stringify(toolsUrl)}
const tools = Object.fromEntries(createTools({
  baseDir: process.env.TMP_BASE,
  now: () => new Date('2026-12-01T23:30:00Z'),
}).map((tool) => [tool.name, tool]))
for (const item of JSON.parse(process.env.CONTRACTS)) await tools['contract.ingest'].execute(item, { callId: 'tz' })
const upcoming = await tools['contract.upcoming'].execute({ within_days: 90 }, { callId: 'tz' })
const report = await tools['contract.report'].execute({}, { callId: 'tz' })
const csv = await readFile(report.path, 'utf8')
const groups = [...upcoming.expired, ...upcoming.in_renewal_window, ...upcoming.expiring_soon].map((item) => [item.contract_no, item.days_left, item.status])
console.log(JSON.stringify({ as_of: upcoming.as_of, report_as_of: report.as_of, counts: upcoming.counts, groups, csv }))
`
  const outputs = []
  for (const zone of ['UTC', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'dsh-contract-tz-'))
    dirs.push(dir)
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8',
      env: { ...process.env, TZ: zone, TMP_BASE: dir, CONTRACTS: JSON.stringify(fixtures) },
    })
    assert.equal(child.status, 0, child.stderr || child.stdout)
    outputs.push(JSON.parse(child.stdout))
  }
  assert.deepEqual(outputs[0], outputs[1])
  assert.deepEqual(outputs[0], outputs[2])
  assert.equal(outputs[0].as_of, '2026-12-01')
  assert.equal(outputs[0].report_as_of, '2026-12-01')
})
