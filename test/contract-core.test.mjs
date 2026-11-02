import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ContractError,
  classifyContract,
  daysBetween,
  parseIsoDate,
  upcomingContracts,
  validateContract,
} from '../lib/core/contract.js'

const base = {
  contract_no: 'DEMO-A-001',
  counterparty: 'Acme, Inc.',
  start_date: '2026-01-01',
  end_date: '2026-12-01',
  renewal_window_days: 30,
  owner: '王敏',
  amount: 1000,
}

test('parseIsoDate accepts real ISO dates and rejects impossible or loose ones', () => {
  assert.equal(parseIsoDate('2026-01-01'), Math.floor(Date.UTC(2026, 0, 1) / 86_400_000))
  assert.equal(parseIsoDate('2028-02-29') - parseIsoDate('2028-02-28'), 1)
  for (const bad of ['2026-02-30', '2026-13-01', '2026-00-10', '2026-1-01', '01-01-2026', '', '2026/01/01', '2026-01-01T00:00:00Z']) {
    assert.throws(() => parseIsoDate(bad), (error) => error instanceof ContractError && error.code === 'E_CONTRACT_DATE_INVALID')
  }
})

test('daysBetween is plain UTC calendar arithmetic across DST and leap years', () => {
  // Europe/Berlin springs forward on 2026-03-29; a local-time implementation would return 1.96 days.
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2)
  // Europe/Berlin falls back on 2026-10-25; a local-time implementation would return 2.04 days.
  assert.equal(daysBetween('2026-10-24', '2026-10-26'), 2)
  assert.equal(daysBetween('2028-02-28', '2028-03-01'), 2)
  assert.equal(daysBetween('2026-12-01', '2026-11-15'), -16)
  assert.equal(daysBetween('2026-12-01', '2026-12-01'), 0)
})

test('classifyContract puts each contract in exactly one bucket at the boundaries', () => {
  const record = { end_date: '2026-12-31', renewal_window_days: 30 }
  const asOf = '2026-12-01'
  assert.equal(classifyContract({ end_date: '2026-11-30', renewal_window_days: 30 }, asOf, 90), 'expired')
  assert.equal(classifyContract(record, asOf, 90), 'in_renewal_window') // 30 days = window edge
  assert.equal(classifyContract({ ...record, end_date: '2027-01-01' }, asOf, 90), 'expiring_soon') // 31 days
  assert.equal(classifyContract({ ...record, end_date: '2027-03-01' }, asOf, 90), 'expiring_soon') // 90 days = N edge
  assert.equal(classifyContract({ ...record, end_date: '2027-03-02' }, asOf, 90), 'later') // 91 days
  assert.equal(classifyContract({ ...record, end_date: '2026-12-01', renewal_window_days: 0 }, asOf, 90), 'in_renewal_window')
})

test('validateContract normalises fields and rejects bad ranges, windows and amounts', () => {
  assert.deepEqual(validateContract({ ...base, contract_no: '  DEMO-A-001  ', counterparty: '  Acme, Inc.  ', amount: 1000.5 }), { ...base, amount: 1000.5 })
  assert.throws(() => validateContract({ ...base, end_date: '2025-12-31' }), (error) => error.code === 'E_CONTRACT_DATE_RANGE')
  assert.throws(() => validateContract({ ...base, renewal_window_days: -1 }), (error) => error.code === 'E_CONTRACT_WINDOW_INVALID')
  assert.throws(() => validateContract({ ...base, renewal_window_days: 1.5 }), (error) => error.code === 'E_CONTRACT_WINDOW_INVALID')
  assert.throws(() => validateContract({ ...base, renewal_window_days: 3651 }), (error) => error.code === 'E_CONTRACT_WINDOW_INVALID')
  assert.throws(() => validateContract({ ...base, amount: 1.234 }), (error) => error.code === 'E_CONTRACT_AMOUNT_INVALID')
  assert.throws(() => validateContract({ ...base, amount: -1 }), (error) => error.code === 'E_CONTRACT_AMOUNT_INVALID')
  assert.throws(() => validateContract({ ...base, contract_no: 'DEMO A/001' }), (error) => error.code === 'E_CONTRACT_NO_INVALID')
  assert.throws(() => validateContract({ ...base, owner: '' }), (error) => error.code === 'E_CONTRACT_FIELD_REQUIRED')
  assert.throws(() => validateContract({ ...base, counterparty: 'Acme\u0000Inc' }), (error) => error.code === 'E_CONTRACT_FIELD_INVALID')
})

test('upcomingContracts is mutually exclusive, sorts by days_left and reports counts', () => {
  const records = [
    { ...base, contract_no: 'DEMO-B-002', end_date: '2027-01-15', renewal_window_days: 30, created_at: 'x' },
    { ...base, contract_no: 'DEMO-A-001', end_date: '2026-11-15', renewal_window_days: 60, created_at: 'x' },
    { ...base, contract_no: 'DEMO-C-003', end_date: '2026-12-01', renewal_window_days: 30, created_at: 'x' },
    { ...base, contract_no: 'DEMO-D-004', end_date: '2027-03-31', renewal_window_days: 90, created_at: 'x' },
  ]
  const result = upcomingContracts(records, '2026-12-01', 90)
  assert.deepEqual(result.expired.map((item) => [item.contract_no, item.days_left]), [['DEMO-A-001', -16]])
  assert.deepEqual(result.in_renewal_window.map((item) => [item.contract_no, item.days_left]), [['DEMO-C-003', 0]])
  assert.deepEqual(result.expiring_soon.map((item) => [item.contract_no, item.days_left]), [['DEMO-B-002', 45]])
  assert.deepEqual(result.counts, { total: 4, expired: 1, in_renewal_window: 1, expiring_soon: 1, later: 1 })
})

test('upcomingContracts on an empty registry returns empty groups, not an error', () => {
  const result = upcomingContracts([], '2026-12-01', 90)
  assert.deepEqual(result.expired, [])
  assert.deepEqual(result.in_renewal_window, [])
  assert.deepEqual(result.expiring_soon, [])
  assert.deepEqual(result.counts, { total: 0, expired: 0, in_renewal_window: 0, expiring_soon: 0, later: 0 })
})
