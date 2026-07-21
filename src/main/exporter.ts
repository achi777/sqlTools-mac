// Data export (CSV / JSON / Excel / SQL) — runs in MAIN. Rows are streamed from
// the driver in batches (LIMIT/OFFSET, honoring the active filter) and written
// incrementally so memory stays bounded (Excel is the exception — SheetJS builds
// in memory). SQL literals are escaped per engine; the file is generated text,
// so escaping (not parameterization) is what keeps it safe.
import { createWriteStream } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import type { DbDriver } from './driver'
import type { Engine, ExportRequest, ExportResult, ResultColumn } from '@shared/types'

// SheetJS is CommonJS — load via createRequire so it resolves in the ESM main bundle.
const XLSX = createRequire(import.meta.url)('xlsx') as typeof import('xlsx')

const BATCH = 1000

type Row = Record<string, unknown>

/** Which columns to export (requested subset, else all in table order). */
function pickColumns(all: ResultColumn[], requested: string[]): ResultColumn[] {
  if (!requested.length) return all
  const byName = new Map(all.map((c) => [c.name, c]))
  return requested.map((n) => byName.get(n)).filter((c): c is ResultColumn => !!c)
}

/** Stream all rows matching the request in batches. Calls back per batch. */
async function streamRows(
  driver: DbDriver,
  req: ExportRequest,
  onBatch: (rows: Row[], columns: ResultColumn[]) => Promise<void> | void,
  onProgress?: (done: number) => void
): Promise<{ total: number; columns: ResultColumn[] }> {
  const useFilter = req.scope === 'filter'
  const filters = useFilter ? req.filters ?? [] : []
  const tree = useFilter ? req.tree ?? null : null
  const customWhere = useFilter ? req.customWhere ?? null : null

  let page = 1
  let columns: ResultColumn[] = []
  let done = 0
  for (;;) {
    const res = await driver.getTablePage(req.schema, req.table, BATCH, page, null, filters, tree, customWhere)
    if (page === 1) columns = pickColumns(res.columns, req.columns)
    if (res.rows.length > 0) await onBatch(res.rows as Row[], columns)
    done += res.rows.length
    onProgress?.(done)
    if (res.rows.length < BATCH) break
    page++
  }
  return { total: done, columns }
}

// --- value formatting --------------------------------------------------------

function isNumericType(t: string): boolean {
  return /\b(int|integer|bigint|smallint|serial|numeric|decimal|real|double|float|money)\b/i.test(t)
}

/** Coerce a driver value for JSON/Excel: numbers as numbers where safe, else as-is. */
function typedValue(v: unknown, col: ResultColumn): unknown {
  if (v === null || v === undefined) return null
  if (typeof v === 'number' || typeof v === 'boolean') return v
  if (typeof v === 'string' && isNumericType(col.dataType) && /^-?\d+(\.\d+)?$/.test(v)) {
    const n = Number(v)
    // Keep bigints that exceed JS safe range as strings to avoid precision loss.
    if (Number.isSafeInteger(n) || !/^-?\d+$/.test(v)) return n
  }
  return v
}

function csvField(v: unknown, delimiter: string, nullRepr: string): string {
  if (v === null || v === undefined) return nullRepr
  let s: string
  if (v instanceof Date) s = v.toISOString()
  else if (typeof v === 'object') s = JSON.stringify(v)
  else s = String(v)
  const needsQuote = s.includes(delimiter) || s.includes('"') || s.includes('\n') || s.includes('\r')
  return needsQuote ? '"' + s.replace(/"/g, '""') + '"' : s
}

export function sqlLiteral(v: unknown, engine: Engine): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  if (typeof v === 'boolean') return engine === 'postgres' ? (v ? 'TRUE' : 'FALSE') : v ? '1' : '0'
  let s: string
  if (v instanceof Date) s = v.toISOString()
  else if (typeof v === 'object') s = JSON.stringify(v)
  else s = String(v)
  return "'" + s.replace(/'/g, "''") + "'"
}

export function qid(engine: Engine, id: string): string {
  return engine === 'mysql' ? '`' + id.replace(/`/g, '``') + '`' : '"' + id.replace(/"/g, '""') + '"'
}

export function qtable(engine: Engine, schema: string, table: string): string {
  return engine === 'sqlite' ? qid(engine, table) : `${qid(engine, schema)}.${qid(engine, table)}`
}

// --- per-format exporters ----------------------------------------------------

async function exportCsv(driver: DbDriver, req: ExportRequest, path: string, onProgress?: (n: number) => void): Promise<number> {
  const delim = req.options.csvDelimiter || ','
  const nullRepr = req.options.csvNull === 'slashN' ? '\\N' : ''
  const stream = createWriteStream(path, { encoding: 'utf-8' })
  if (req.options.csvBom) stream.write('﻿')
  const write = (s: string): Promise<void> =>
    new Promise((resolve, reject) => stream.write(s, (e) => (e ? reject(e) : resolve())))

  let headerWritten = false
  const { total } = await streamRows(
    driver,
    req,
    async (rows, columns) => {
      if (!headerWritten) {
        await write(columns.map((c) => csvField(c.name, delim, '')).join(delim) + '\r\n')
        headerWritten = true
      }
      for (const row of rows) {
        await write(columns.map((c) => csvField(row[c.name], delim, nullRepr)).join(delim) + '\r\n')
      }
    },
    onProgress
  )
  await new Promise<void>((resolve, reject) => stream.end((e?: Error) => (e ? reject(e) : resolve())))
  return total
}

async function exportJson(driver: DbDriver, req: ExportRequest, path: string, onProgress?: (n: number) => void): Promise<number> {
  const pretty = !!req.options.jsonPretty
  const stream = createWriteStream(path, { encoding: 'utf-8' })
  const write = (s: string): Promise<void> =>
    new Promise((resolve, reject) => stream.write(s, (e) => (e ? reject(e) : resolve())))
  await write('[')
  let first = true
  const { total } = await streamRows(
    driver,
    req,
    async (rows, columns) => {
      for (const row of rows) {
        const obj: Record<string, unknown> = {}
        for (const c of columns) obj[c.name] = typedValue(row[c.name], c)
        const json = pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj)
        await write((first ? (pretty ? '\n' : '') : ',' + (pretty ? '\n' : '')) + (pretty ? '  ' + json.replace(/\n/g, '\n  ') : json))
        first = false
      }
    },
    onProgress
  )
  await write(pretty ? '\n]\n' : ']\n')
  await new Promise<void>((resolve, reject) => stream.end((e?: Error) => (e ? reject(e) : resolve())))
  return total
}

async function exportSql(
  driver: DbDriver,
  req: ExportRequest,
  path: string,
  engine: Engine,
  onProgress?: (n: number) => void
): Promise<number> {
  const stream = createWriteStream(path, { encoding: 'utf-8' })
  const write = (s: string): Promise<void> =>
    new Promise((resolve, reject) => stream.write(s, (e) => (e ? reject(e) : resolve())))
  const t = qtable(engine, req.schema, req.table)
  const multi = !!req.options.sqlMultiRow

  let headerDone = false
  let colList = ''
  const { total } = await streamRows(
    driver,
    req,
    async (rows, columns) => {
      if (!headerDone) {
        colList = columns.map((c) => qid(engine, c.name)).join(', ')
        if (req.options.sqlCreateTable) {
          const cols = columns.map((c) => `  ${qid(engine, c.name)} ${c.dataType || 'text'}`).join(',\n')
          await write(`CREATE TABLE ${t} (\n${cols}\n);\n\n`)
        }
        headerDone = true
      }
      if (multi) {
        const values = rows.map((row) => '(' + columns.map((c) => sqlLiteral(row[c.name], engine)).join(', ') + ')')
        await write(`INSERT INTO ${t} (${colList}) VALUES\n${values.join(',\n')};\n`)
      } else {
        for (const row of rows) {
          const vals = columns.map((c) => sqlLiteral(row[c.name], engine)).join(', ')
          await write(`INSERT INTO ${t} (${colList}) VALUES (${vals});\n`)
        }
      }
    },
    onProgress
  )
  await new Promise<void>((resolve, reject) => stream.end((e?: Error) => (e ? reject(e) : resolve())))
  return total
}

async function exportXlsx(driver: DbDriver, req: ExportRequest, path: string, onProgress?: (n: number) => void): Promise<number> {
  const aoa: unknown[][] = []
  let cols: ResultColumn[] = []
  const { total, columns } = await streamRows(
    driver,
    req,
    (rows, columns) => {
      if (aoa.length === 0) {
        cols = columns
        aoa.push(columns.map((c) => c.name))
      }
      for (const row of rows) aoa.push(columns.map((c) => typedValue(row[c.name], c)))
    },
    onProgress
  )
  if (aoa.length === 0) aoa.push(columns.map((c) => c.name)) // header-only for empty
  void cols
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  const sheetName = req.table.slice(0, 31).replace(/[\\/?*[\]:]/g, '_') || 'Sheet1'
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  await writeFile(path, buf)
  return total
}

/** Export according to `req`, writing to `path`. Returns the row count. */
export async function runExport(
  driver: DbDriver,
  engine: Engine,
  req: ExportRequest,
  path: string,
  onProgress?: (done: number) => void
): Promise<ExportResult> {
  try {
    let rows = 0
    if (req.format === 'csv') rows = await exportCsv(driver, req, path, onProgress)
    else if (req.format === 'json') rows = await exportJson(driver, req, path, onProgress)
    else if (req.format === 'sql') rows = await exportSql(driver, req, path, engine, onProgress)
    else rows = await exportXlsx(driver, req, path, onProgress)
    return { ok: true, path, rows }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}
