/** Stable user-facing failure codes; every one has a human sentence and one next action. */
export type ContractErrorCode =
  | 'E_CONTRACT_FIELD_REQUIRED'
  | 'E_CONTRACT_FIELD_INVALID'
  | 'E_CONTRACT_NO_INVALID'
  | 'E_CONTRACT_DATE_INVALID'
  | 'E_CONTRACT_DATE_RANGE'
  | 'E_CONTRACT_WINDOW_INVALID'
  | 'E_CONTRACT_AMOUNT_INVALID'
  | 'E_CONTRACT_DUPLICATE'
  | 'E_CONTRACT_STORE_FAILED'
  | 'E_CONTRACT_EXPORT_FAILED'
  | 'E_CONTRACT_PATH_INVALID'
  | 'E_CONTRACT_PATH_NOT_ALLOWED'

interface HumanMessage {
  text: string
  next: string
}

const CONTRACT_HUMAN: Record<ContractErrorCode, HumanMessage> = {
  E_CONTRACT_FIELD_REQUIRED: {
    text: '合同字段缺失：编号、对方、起止日、续签窗口、负责人和金额都要填',
    next: '补齐字段后重试；金额写数字，日期写 YYYY-MM-DD',
  },
  E_CONTRACT_FIELD_INVALID: {
    text: '合同字段内容不合法（空值、超长或含控制字符）',
    next: '去掉换行、制表符等控制字符，名称控制在 200 字以内再试',
  },
  E_CONTRACT_NO_INVALID: {
    text: '合同编号格式不对',
    next: '用字母或数字开头，只含字母、数字、点、下划线和连字符，最长 64 位',
  },
  E_CONTRACT_DATE_INVALID: {
    text: '日期不是有效的 ISO 日期（YYYY-MM-DD）',
    next: '改成 2026-12-01 这种格式，并确认日期真实存在（例如 2 月没有 30 日）',
  },
  E_CONTRACT_DATE_RANGE: {
    text: '合同到期日早于起始日',
    next: '检查 start_date 和 end_date 是否写反，修正后重试',
  },
  E_CONTRACT_WINDOW_INVALID: {
    text: '续签窗口或统计天数不是 0–3650 之间的整数',
    next: '传 0 到 3650 的整数，例如 renewal_window_days: 60、within_days: 90',
  },
  E_CONTRACT_AMOUNT_INVALID: {
    text: '金额不是非负数字，或超过两位小数',
    next: '金额写成 128000 或 128000.50，不要带货币符号和千分位',
  },
  E_CONTRACT_DUPLICATE: {
    text: '这个合同编号已经登记过了',
    next: '先查登记表；要更新请换一个合同版本号（例如 -v2），不要重复登记同一份合同',
  },
  E_CONTRACT_STORE_FAILED: {
    text: '本地合同登记表读不出来或写不进去',
    next: '确认 $DSH_HOME/storages/dsh-contract-renewal 可写，contracts.jsonl 没有被手工改坏',
  },
  E_CONTRACT_EXPORT_FAILED: {
    text: 'CSV 没写出去',
    next: '确认 $DSH_HOME/storages/dsh-contract-renewal/exports 可写后重试',
  },
  E_CONTRACT_PATH_INVALID: {
    text: '导出文件名不安全',
    next: '只传一个由 [A-Za-z0-9._-] 组成的文件名，例如 contracts-2026-12-01.csv',
  },
  E_CONTRACT_PATH_NOT_ALLOWED: {
    text: '导出路径越过了导出目录',
    next: '不要带 ../、目录分隔符或符号链接；导出目录固定为 storages/dsh-contract-renewal/exports/',
  },
}

/** `human sentence（E_CODE）｜Next: one action｜detail` — the only text shown to end users. */
export function contractErrorMessage(code: ContractErrorCode, detail?: string): string {
  const human = CONTRACT_HUMAN[code]
  return `${human.text}（${code}）｜下一步：${human.next}${detail ? `｜细节：${detail}` : ''}`
}

export class ContractError extends Error {
  readonly code: ContractErrorCode
  constructor(code: ContractErrorCode, detail?: string) {
    super(contractErrorMessage(code, detail))
    this.name = 'ContractError'
    this.code = code
  }
}

export const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
export const DEFAULT_WITHIN_DAYS = 90
export const MAX_WINDOW_DAYS = 3650
export const MAX_AMOUNT = 1_000_000_000_000

/** Everything the caller must supply to register one contract. */
export interface ContractInput {
  contract_no: string
  counterparty: string
  start_date: string
  end_date: string
  renewal_window_days: number
  owner: string
  amount: number
}

/** A registered contract: the input plus the local registration timestamp. */
export interface ContractRecord extends ContractInput {
  created_at: string
}

export type ContractStatus = 'expired' | 'in_renewal_window' | 'expiring_soon' | 'later'

/** A contract projected onto one `as_of` date. */
export interface ContractDue extends ContractInput {
  days_left: number
  status: ContractStatus
}

export interface UpcomingCounts {
  total: number
  expired: number
  in_renewal_window: number
  expiring_soon: number
  later: number
}

export interface UpcomingResult {
  as_of: string
  within_days: number
  expired: ContractDue[]
  in_renewal_window: ContractDue[]
  expiring_soon: ContractDue[]
  counts: UpcomingCounts
}

const CONTRACT_NO_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/
const NAME_MAX = 200
const OWNER_MAX = 120

/**
 * Parse a strict ISO `YYYY-MM-DD` date into an integer UTC day number.
 *
 * The result is calendar arithmetic only: it never depends on the local time
 * zone, DST, or the process `TZ`. Invalid calendars (2026-02-30) are rejected.
 */
export function parseIsoDate(value: string): number {
  const match = typeof value === 'string' ? ISO_DATE_PATTERN.exec(value) : null
  if (!match) throw new ContractError('E_CONTRACT_DATE_INVALID', String(value).slice(0, 40))
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new ContractError('E_CONTRACT_DATE_INVALID', value)
  }
  const millis = Date.UTC(year, month - 1, day)
  const date = new Date(millis)
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new ContractError('E_CONTRACT_DATE_INVALID', value)
  }
  return Math.round(millis / 86_400_000)
}

/** Whole UTC days from `from` to `to`; negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return parseIsoDate(to) - parseIsoDate(from)
}

/** UTC `today` as `YYYY-MM-DD`; stable regardless of the local time zone. */
export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

function requiredText(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ContractError('E_CONTRACT_FIELD_REQUIRED', field)
  }
  const trimmed = value.trim()
  if (trimmed.length > max || CONTROL_CHARS.test(trimmed)) {
    throw new ContractError('E_CONTRACT_FIELD_INVALID', `${field}: ${JSON.stringify(trimmed.slice(0, 40))}`)
  }
  return trimmed
}

function validateWindowDays(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > MAX_WINDOW_DAYS) {
    throw new ContractError('E_CONTRACT_WINDOW_INVALID', `${field}=${String(value)}`)
  }
  return value
}

/** Validate and normalise one caller-supplied contract. */
export function validateContract(input: unknown): ContractInput {
  const raw = (input ?? {}) as Record<string, unknown>
  const contractNo = requiredText(raw.contract_no, 'contract_no', 64)
  if (!CONTRACT_NO_PATTERN.test(contractNo)) throw new ContractError('E_CONTRACT_NO_INVALID', contractNo)
  const counterparty = requiredText(raw.counterparty, 'counterparty', NAME_MAX)
  const owner = requiredText(raw.owner, 'owner', OWNER_MAX)
  const startDate = requiredText(raw.start_date, 'start_date', 10)
  const endDate = requiredText(raw.end_date, 'end_date', 10)
  parseIsoDate(startDate)
  parseIsoDate(endDate)
  if (parseIsoDate(endDate) < parseIsoDate(startDate)) {
    throw new ContractError('E_CONTRACT_DATE_RANGE', `${startDate} → ${endDate}`)
  }
  const renewalWindow = validateWindowDays(raw.renewal_window_days, 'renewal_window_days')
  const amount = raw.amount
  if (
    typeof amount !== 'number' ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    amount > MAX_AMOUNT ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6
  ) {
    throw new ContractError('E_CONTRACT_AMOUNT_INVALID', String(amount))
  }
  return {
    contract_no: contractNo,
    counterparty,
    start_date: startDate,
    end_date: endDate,
    renewal_window_days: renewalWindow,
    owner,
    amount: Math.round(amount * 100) / 100,
  }
}

/** Validate one stored JSONL record (input fields plus `created_at`). */
export function validateRecord(input: unknown): ContractRecord {
  const raw = (input ?? {}) as Record<string, unknown>
  const contract = validateContract(raw)
  return {
    ...contract,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : '',
  }
}

export function validateWithinDays(value: unknown): number {
  return validateWindowDays(value, 'within_days')
}

/** Whole UTC days from `as_of` to the contract end date; negative means expired. */
export function daysLeft(record: Pick<ContractInput, 'end_date'>, asOf: string): number {
  return parseIsoDate(record.end_date) - parseIsoDate(asOf)
}

/**
 * Mutually exclusive bucket for one contract:
 *
 * 1. `expired` — end date is before `as_of`;
 * 2. `in_renewal_window` — 0 ≤ days_left ≤ renewal_window_days;
 * 3. `expiring_soon` — not in the window, but ≤ within_days;
 * 4. `later` — everything else.
 *
 * Put another way: every contract due within `within_days` appears exactly once,
 * and the renewal window always wins over the "N days" bucket.
 */
export function classifyContract(
  record: Pick<ContractInput, 'end_date' | 'renewal_window_days'>,
  asOf: string,
  withinDays: number,
): ContractStatus {
  const left = daysLeft(record, asOf)
  if (left < 0) return 'expired'
  if (left <= record.renewal_window_days) return 'in_renewal_window'
  if (left <= withinDays) return 'expiring_soon'
  return 'later'
}

function project(record: ContractRecord, asOf: string, withinDays: number): ContractDue {
  return {
    contract_no: record.contract_no,
    counterparty: record.counterparty,
    start_date: record.start_date,
    end_date: record.end_date,
    renewal_window_days: record.renewal_window_days,
    owner: record.owner,
    amount: record.amount,
    days_left: daysLeft(record, asOf),
    status: classifyContract(record, asOf, withinDays),
  }
}

/**
 * Group contracts for one `as_of` date. Groups are mutually exclusive and sorted
 * by remaining days, then contract number. Expired contracts are always listed,
 * however old; `within_days` does not hide them.
 */
export function upcomingContracts(
  records: readonly ContractRecord[],
  asOf: string,
  withinDays: number = DEFAULT_WITHIN_DAYS,
): UpcomingResult {
  parseIsoDate(asOf)
  validateWithinDays(withinDays)
  const due = records
    .map((record) => project(record, asOf, withinDays))
    .sort((left, right) => left.days_left - right.days_left || left.contract_no.localeCompare(right.contract_no))
  const expired = due.filter((item) => item.status === 'expired')
  const inWindow = due.filter((item) => item.status === 'in_renewal_window')
  const soon = due.filter((item) => item.status === 'expiring_soon')
  return {
    as_of: asOf,
    within_days: withinDays,
    expired,
    in_renewal_window: inWindow,
    expiring_soon: soon,
    counts: {
      total: records.length,
      expired: expired.length,
      in_renewal_window: inWindow.length,
      expiring_soon: soon.length,
      later: records.length - expired.length - inWindow.length - soon.length,
    },
  }
}

/** All contracts projected onto `as_of`, sorted by end date for a stable CSV. */
export function reportContracts(
  records: readonly ContractRecord[],
  asOf: string,
  withinDays: number = DEFAULT_WITHIN_DAYS,
): ContractDue[] {
  parseIsoDate(asOf)
  validateWithinDays(withinDays)
  return records
    .map((record) => project(record, asOf, withinDays))
    .sort((left, right) => left.end_date.localeCompare(right.end_date) || left.contract_no.localeCompare(right.contract_no))
}
