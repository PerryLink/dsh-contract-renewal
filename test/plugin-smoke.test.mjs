import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import * as plugin from '../lib/plugin/index.js'
import { createTools } from '../lib/plugin/tools.js'

test('resolveBaseDir defaults to $DSH_HOME/storages/dsh-contract-renewal and honors the override', () => {
  assert.equal(
    plugin.resolveBaseDir({ DSH_HOME: '/tmp/dsh-home' }),
    path.join('/tmp/dsh-home', 'storages', 'dsh-contract-renewal'),
  )
  assert.equal(
    plugin.resolveBaseDir({ DSH_HOME: '/tmp/dsh-home', DSH_CONTRACT_HOME: '/tmp/contract-home' }),
    '/tmp/contract-home',
  )
  assert.equal(plugin.resolveBaseDir({}), path.join(process.cwd(), 'storages', 'dsh-contract-renewal'))
})

test('apply() registers the three tools and writes below the documented root', async (t) => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'dsh-contract-apply-'))
  const previous = process.env.DSH_CONTRACT_HOME
  process.env.DSH_CONTRACT_HOME = dir
  t.after(async () => {
    if (previous === undefined) delete process.env.DSH_CONTRACT_HOME
    else process.env.DSH_CONTRACT_HOME = previous
    await rm(dir, { recursive: true, force: true })
  })

  const registered = []
  await plugin.apply({ tools: { register(tool) { registered.push(tool) } } })
  assert.equal(plugin.name, 'dsh-contract-renewal')
  assert.deepEqual(plugin.inject, ['tools'])
  assert.equal(registered.length, 3)

  const ingest = registered.find((tool) => tool.name === 'contract.ingest')
  await ingest.execute(
    {
      contract_no: 'DEMO-APPLY-001',
      counterparty: 'Acme, Inc.',
      start_date: '2026-01-01',
      end_date: '2026-12-01',
      renewal_window_days: 30,
      owner: '王敏',
      amount: 1000,
    },
    { callId: 'apply' },
  )
  const stored = await readFile(path.join(dir, 'contracts.jsonl'), 'utf8')
  assert.match(stored, /DEMO-APPLY-001/)
  assert.equal(createTools({ baseDir: dir }).length, 3)
})
