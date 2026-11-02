import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  ContractError,
  DEFAULT_WITHIN_DAYS,
  reportContracts,
  todayIso,
  upcomingContracts,
  type ContractStatus,
  type UpcomingResult,
} from '../core/contract.js'
import { toCsv } from '../core/csv.js'
import { safeExportPath } from '../core/safe-path.js'
import { FileContractStore, ingestContract, type ContractStore } from '../core/store.js'

export interface ToolDeps {
  /** Local write root; the plugin uses `$DSH_HOME/storages/dsh-contract-renewal`. */
  baseDir: string
  /** Optional store override for tests or an embedding host. */
  store?: ContractStore
  /** Optional clock override; defaults to the real clock. */
  now?: () => Date
}

const text = (value: string) => [{ type: 'text' as const, text: value }]
const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')

const STATUS_VALUES: ContractStatus[] = ['expired', 'in_renewal_window', 'expiring_soon', 'later']

const inputProperties = {
  contract_no: { type: 'string' as const, required: true },
  counterparty: { type: 'string' as const, required: true },
  start_date: { type: 'string' as const, required: true },
  end_date: { type: 'string' as const, required: true },
  renewal_window_days: { type: 'number' as const, required: true },
  owner: { type: 'string' as const, required: true },
  amount: { type: 'number' as const, required: true },
} as const

const dueItemSchema = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    ...inputProperties,
    days_left: { type: 'number' as const, required: true },
    status: { type: 'string' as const, required: true, enum: STATUS_VALUES },
  },
} as const

const countsSchema = {
  type: 'object' as const,
  additionalProperties: false,
  properties: {
    total: { type: 'number' as const, required: true },
    expired: { type: 'number' as const, required: true },
    in_renewal_window: { type: 'number' as const, required: true },
    expiring_soon: { type: 'number' as const, required: true },
    later: { type: 'number' as const, required: true },
  },
} as const

const REPORT_HEADER = [
  'contract_no',
  'counterparty',
  'start_date',
  'end_date',
  'renewal_window_days',
  'owner',
  'amount',
  'days_left',
  'status',
] as const

export function createTools(deps: ToolDeps) {
  const store: ContractStore = deps.store ?? new FileContractStore(deps.baseDir)
  const clock = deps.now ?? (() => new Date())

  const ingest = defineTool({
    name: 'contract.ingest',
    description:
      'Register one contract (number, counterparty, start/end dates, renewal window days, owner, amount) in $DSH_HOME/storages/dsh-contract-renewal/contracts.jsonl. Dates are strict ISO YYYY-MM-DD; duplicate contract numbers fail with E_CONTRACT_DUPLICATE.',
    parameters: inputProperties,
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          ...inputProperties,
          total: { type: 'number', required: true },
        },
      },
      render: (_args, value: { contract_no: string; total: number }) =>
        text(`registered ${value.contract_no} (registry total ${value.total})`),
    },
    async execute(args) {
      const { record, total } = await ingestContract(store, args, clock())
      return {
        contract_no: record.contract_no,
        counterparty: record.counterparty,
        start_date: record.start_date,
        end_date: record.end_date,
        renewal_window_days: record.renewal_window_days,
        owner: record.owner,
        amount: record.amount,
        total,
      }
    },
  })

  const upcoming = defineTool({
    name: 'contract.upcoming',
    description:
      'List contracts as of a given ISO date in three mutually exclusive groups: already expired, inside the renewal window, and due within N days but not yet in the window. Returns remaining days per contract. Defaults: as_of = today (UTC), within_days = 90.',
    parameters: {
      as_of: { type: 'string' },
      within_days: { type: 'number' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          as_of: { type: 'string', required: true },
          within_days: { type: 'number', required: true },
          expired: { type: 'array', required: true, items: dueItemSchema },
          in_renewal_window: { type: 'array', required: true, items: dueItemSchema },
          expiring_soon: { type: 'array', required: true, items: dueItemSchema },
          counts: { ...countsSchema, required: true },
        },
      },
      render: (_args, value: UpcomingResult) =>
        text(
          `as of ${value.as_of}: ${value.counts.expired} expired / ${value.counts.in_renewal_window} in renewal window / ${value.counts.expiring_soon} within ${value.within_days}d`,
        ),
    },
    async execute(args) {
      const records = await store.load()
      return upcomingContracts(records, args.as_of ?? todayIso(clock()), args.within_days ?? DEFAULT_WITHIN_DAYS)
    },
  })

  const report = defineTool({
    name: 'contract.report',
    description:
      'Export every registered contract plus its days_left/status at as_of to $DSH_HOME/storages/dsh-contract-renewal/exports/<filename>.csv. Returns path, sha256, row count and bytes. Filenames are single safe components; traversal is rejected with E_CONTRACT_PATH_INVALID.',
    parameters: {
      as_of: { type: 'string' },
      within_days: { type: 'number' },
      filename: { type: 'string' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          path: { type: 'string', required: true },
          filename: { type: 'string', required: true },
          sha256: { type: 'string', required: true },
          rows: { type: 'number', required: true },
          bytes: { type: 'number', required: true },
          as_of: { type: 'string', required: true },
        },
      },
      render: (_args, value: { path: string; rows: number }) => text(`CSV ${value.rows} row(s) -> ${value.path}`),
    },
    async execute(args) {
      const asOf = args.as_of ?? todayIso(clock())
      const withinDays = args.within_days ?? DEFAULT_WITHIN_DAYS
      const records = await store.load()
      const rows = reportContracts(records, asOf, withinDays)
      const csv = toCsv([
        REPORT_HEADER,
        ...rows.map((item) => [
          item.contract_no,
          item.counterparty,
          item.start_date,
          item.end_date,
          String(item.renewal_window_days),
          item.owner,
          item.amount.toFixed(2),
          String(item.days_left),
          item.status,
        ]),
      ])
      const filename = args.filename ?? `contracts-${asOf}.csv`
      let filePath: string
      try {
        filePath = await safeExportPath(path.join(deps.baseDir, 'exports'), filename)
      } catch (error) {
        if (error instanceof ContractError) throw error
        throw new ContractError('E_CONTRACT_EXPORT_FAILED', String(error))
      }
      try {
        await writeFile(filePath, csv, 'utf8')
      } catch (error) {
        throw new ContractError('E_CONTRACT_EXPORT_FAILED', String(error))
      }
      return {
        path: filePath,
        filename: path.basename(filePath),
        sha256: sha256(csv),
        rows: rows.length,
        bytes: Buffer.byteLength(csv, 'utf8'),
        as_of: asOf,
      }
    },
  })

  return [ingest, upcoming, report]
}
