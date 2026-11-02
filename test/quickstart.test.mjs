import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCsv } from '../lib/core/csv.js'

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const samplePath = path.join(packageRoot, 'samples', 'quickstart', 'input', 'contracts.csv')

test('the bundled sample carries exactly five DEMO-* synthetic contracts', async () => {
  const rows = parseCsv(await readFile(samplePath, 'utf8'))
  const header = rows.shift()
  assert.deepEqual(header, ['contract_no', 'counterparty', 'start_date', 'end_date', 'renewal_window_days', 'owner', 'amount'])
  assert.equal(rows.length, 5)
  assert.ok(rows.every((row) => row[0].startsWith('DEMO-')))
  assert.ok(rows.some((row) => row[1].includes(', ')))
  assert.ok(rows.some((row) => row[1].includes('"')))
})

test('quickstart --check reproduces the committed golden result', () => {
  const result = spawnSync(process.execPath, ['samples/quickstart/run.mjs', '--check'], { cwd: packageRoot, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  assert.match(result.stdout, /1 expired \/ 2 in renewal window \/ 1 expiring soon/)
  assert.match(result.stdout, /golden samples\/quickstart\/expected\/result\.json matches/)
  assert.match(result.stdout, /quickstart ok/)
})
