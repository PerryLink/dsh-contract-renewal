/** RFC 4180 field escaping: quote on comma, quote, CR or LF and double embedded quotes. */
const CSV_NEEDS_QUOTES = /[",\r\n]/

export function csvField(value: string): string {
  return CSV_NEEDS_QUOTES.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/** Build a UTF-8 CSV body with a trailing newline; empty input yields an empty string. */
export function toCsv(rows: readonly (readonly string[])[]): string {
  if (rows.length === 0) return ''
  return `${rows.map((row) => row.map(csvField).join(',')).join('\n')}\n`
}

/**
 * Parse RFC 4180 CSV text: quoted fields, doubled quotes, embedded CR/LF and a
 * leading BOM. Blank lines are skipped. Throws on an unterminated quoted field
 * rather than silently swallowing the rest of the file.
 */
export function parseCsv(text: string): string[][] {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  const pushRow = () => {
    if (!(row.length === 1 && row[0] === '')) rows.push(row)
    row = []
    field = ''
  }

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    if (inQuotes) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }
    if (char === '"' && field === '') {
      inQuotes = true
      continue
    }
    if (char === ',') {
      row.push(field)
      field = ''
      continue
    }
    if (char === '\n') {
      row.push(field)
      pushRow()
      continue
    }
    if (char === '\r') continue
    field += char
  }

  if (inQuotes) throw new Error('CSV has an unterminated quoted field')
  if (field !== '' || row.length > 0) {
    row.push(field)
    pushRow()
  }
  return rows
}
