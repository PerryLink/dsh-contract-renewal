import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { FileContractStore, REGISTRY_FILENAME, ingestContract } from '../lib/core/store.js'

const contract = {
  contract_no: 'DEMO-STORE-001',
  counterparty: 'Acme, Inc.',
  start_date: '2026-01-01',
  end_date: '2026-12-01',
  renewal_window_days: 30,
  owner: '王敏',
  amount: 1000,
}

async function tempDir(t) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'dsh-contract-store-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  return dir
}

test('ingestContract appends one JSONL record and returns the running total', async (t) => {
  const dir = await tempDir(t)
  const store = new FileContractStore(dir)
  assert.deepEqual(await store.load(), [])
  const first = await ingestContract(store, contract, new Date('2026-11-02T12:00:00Z'))
  assert.equal(first.total, 1)
  const second = await ingestContract(store, { ...contract, contract_no: 'DEMO-STORE-002' })
  assert.equal(second.total, 2)
  const lines = (await readFile(path.join(dir, REGISTRY_FILENAME), 'utf8')).trim().split('\n')
  assert.equal(lines.length, 2)
  const reloaded = await new FileContractStore(dir).load()
  assert.equal(reloaded.length, 2)
  assert.equal(reloaded[0].created_at, '2026-11-02T12:00:00.000Z')
})

test('duplicate contract numbers are rejected case-insensitively', async (t) => {
  const dir = await tempDir(t)
  const store = new FileContractStore(dir)
  await ingestContract(store, contract)
  await assert.rejects(() => ingestContract(store, contract), (error) => error.code === 'E_CONTRACT_DUPLICATE')
  await assert.rejects(
    () => ingestContract(store, { ...contract, contract_no: contract.contract_no.toLowerCase() }),
    (error) => error.code === 'E_CONTRACT_DUPLICATE',
  )
  assert.equal((await store.load()).length, 1)
})

test('an empty or missing registry loads as an empty list', async (t) => {
  const dir = await tempDir(t)
  assert.deepEqual(await new FileContractStore(dir).load(), [])
  await writeFile(path.join(dir, REGISTRY_FILENAME), '\n\n', 'utf8')
  assert.deepEqual(await new FileContractStore(dir).load(), [])
})

test('a damaged registry line fails closed with E_CONTRACT_STORE_FAILED', async (t) => {
  const dir = await tempDir(t)
  await writeFile(path.join(dir, REGISTRY_FILENAME), `${JSON.stringify({ ...contract, created_at: 'x' })}\n{not json}\n`, 'utf8')
  await assert.rejects(() => new FileContractStore(dir).load(), (error) => error.code === 'E_CONTRACT_STORE_FAILED')
})
