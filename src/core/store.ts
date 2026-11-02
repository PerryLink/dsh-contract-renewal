import { appendFile, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { ContractError, validateContract, validateRecord, type ContractInput, type ContractRecord } from './contract.js'

/** One JSON object per line, under the local write root. */
export const REGISTRY_FILENAME = 'contracts.jsonl'

/** Minimal store contract; the plugin uses {@link FileContractStore}. */
export interface ContractStore {
  readonly file?: string
  load(): Promise<ContractRecord[]>
  append(records: readonly ContractRecord[]): Promise<void>
}

/**
 * Append-only JSONL registry at `<baseDir>/contracts.jsonl`.
 *
 * JSONL keeps every registration on its own line, so a later reader can skip a
 * damaged line without rewriting history. A damaged line is reported as
 * `E_CONTRACT_STORE_FAILED` instead of being silently dropped.
 */
export class FileContractStore implements ContractStore {
  readonly file: string
  readonly baseDir: string

  constructor(baseDir: string) {
    this.baseDir = baseDir
    this.file = path.join(baseDir, REGISTRY_FILENAME)
  }

  async load(): Promise<ContractRecord[]> {
    let raw: string
    try {
      raw = await readFile(this.file, 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw new ContractError('E_CONTRACT_STORE_FAILED', `${this.file}: ${String((error as Error).message)}`)
    }
    const records: ContractRecord[] = []
    for (const [index, line] of raw.split(/\r?\n/).entries()) {
      if (line.trim() === '') continue
      try {
        records.push(validateRecord(JSON.parse(line)))
      } catch (error) {
        throw new ContractError(
          'E_CONTRACT_STORE_FAILED',
          `${this.file}:${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
    return records
  }

  async append(records: readonly ContractRecord[]): Promise<void> {
    if (records.length === 0) return
    const body = `${records.map((record) => JSON.stringify(record)).join('\n')}\n`
    try {
      await mkdir(this.baseDir, { recursive: true })
      await appendFile(this.file, body, 'utf8')
    } catch (error) {
      throw new ContractError('E_CONTRACT_STORE_FAILED', `${this.file}: ${String((error as Error).message)}`)
    }
  }
}

export interface IngestResult {
  record: ContractRecord
  total: number
}

/**
 * Register one contract. Contract numbers are unique case-insensitively, so
 * `demo-001` and `DEMO-001` are the same contract and the second ingest fails
 * with `E_CONTRACT_DUPLICATE`.
 */
export async function ingestContract(
  store: ContractStore,
  input: ContractInput,
  now: Date = new Date(),
): Promise<IngestResult> {
  const contract = validateContract(input)
  const records = await store.load()
  const key = contract.contract_no.toUpperCase()
  if (records.some((record) => record.contract_no.toUpperCase() === key)) {
    throw new ContractError('E_CONTRACT_DUPLICATE', contract.contract_no)
  }
  const record: ContractRecord = { ...contract, created_at: now.toISOString() }
  await store.append([record])
  return { record, total: records.length + 1 }
}
