import test from 'node:test'
import assert from 'node:assert/strict'
import { csvField, parseCsv, toCsv } from '../lib/core/csv.js'

test('toCsv quotes commas, quotes, CR and LF and round-trips through parseCsv', () => {
  const rows = [
    ['contract_no', 'counterparty', 'note'],
    ['DEMO-001', 'Acme, Inc.', 'line 1\nline "2"'],
    ['DEMO-002', 'Northwind "APAC" Ltd.', 'plain'],
  ]
  const text = toCsv(rows)
  assert.equal(text.split('\n')[0], 'contract_no,counterparty,note')
  assert.match(text, /"Acme, Inc."/)
  assert.match(text, /"line 1\nline ""2"""/)
  assert.deepEqual(parseCsv(text), rows)
  assert.equal(csvField('a,b'), '"a,b"')
  assert.equal(toCsv([]), '')
})

test('parseCsv handles CRLF, a BOM and trailing empty lines without inventing rows', () => {
  const text = '\uFEFFa,b\r\n1,"x,y"\r\n\r\n'
  assert.deepEqual(parseCsv(text), [
    ['a', 'b'],
    ['1', 'x,y'],
  ])
  assert.throws(() => parseCsv('a,"unterminated'), /unterminated quoted field/)
})
