// Whole-database dump (DDL + data) to a .sql file, and restore (execute a .sql
// file's statements). Runs in MAIN. The dump reuses the table designer's DDL
// generator for CREATE TABLE and the exporter's SQL-literal escaping for data;
// tables are emitted in FK-dependency order so the file restores cleanly.
import { createWriteStream } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { buildTableDdl } from './ddl'
import { qid, qtable, sqlLiteral } from './exporter'
import { splitSqlStatements } from '@shared/sqlSplit'
import type { DbDriver } from './driver'
import type { DumpRequest, DumpResult, Engine, ExecSqlResult, SqlFilePreview, TableSpec } from '@shared/types'

const BATCH = 1000

/** Order tables so a referenced (parent) table is emitted before its children. */
async function orderedTables(driver: DbDriver, schema: string): Promise<{ name: string; spec: TableSpec }[]> {
  const refs = await driver.listTables(schema)
  const specs = new Map<string, TableSpec>()
  for (const r of refs) specs.set(r.name, await driver.getTableSpec(schema, r.name))
  const names = new Set(refs.map((r) => r.name))
  const visited = new Set<string>()
  const out: { name: string; spec: TableSpec }[] = []
  const visit = (name: string, stack: Set<string>): void => {
    if (visited.has(name) || stack.has(name)) return
    stack.add(name)
    const spec = specs.get(name)
    for (const fk of spec?.foreignKeys ?? []) {
      if (names.has(fk.refTable) && fk.refTable !== name) visit(fk.refTable, stack)
    }
    stack.delete(name)
    visited.add(name)
    if (spec) out.push({ name, spec })
  }
  for (const r of refs) visit(r.name, new Set())
  return out
}

/** Dump a schema's tables (DDL + optional data) to `path`. */
export async function dumpDatabase(
  driver: DbDriver,
  engine: Engine,
  req: DumpRequest,
  path: string,
  onProgress?: (rows: number) => void
): Promise<DumpResult> {
  try {
    const tables = await orderedTables(driver, req.schema)
    const stream = createWriteStream(path, { encoding: 'utf-8' })
    const write = (s: string): Promise<void> =>
      new Promise((resolve, reject) => stream.write(s, (e) => (e ? reject(e) : resolve())))

    await write(`-- DB Tool dump — engine=${engine}, schema=${req.schema}\n-- ${req.includeData ? 'schema + data' : 'schema only'}\n\n`)
    if (engine === 'mysql') await write('SET FOREIGN_KEY_CHECKS=0;\n\n')

    let totalRows = 0
    for (const { name, spec } of tables) {
      await write(`-- ----- Table: ${name} -----\n`)
      const ddl = buildTableDdl(engine, 'create', spec)
      for (const st of ddl.statements) await write(st + ';\n')
      await write('\n')

      if (req.includeData) {
        const t = qtable(engine, req.schema, name)
        let page = 1
        let cols: string[] = []
        for (;;) {
          const res = await driver.getTablePage(req.schema, name, BATCH, page, null, [], null, null)
          if (page === 1) cols = res.columns.map((c) => c.name)
          if (res.rows.length > 0) {
            const colList = cols.map((c) => qid(engine, c)).join(', ')
            for (const row of res.rows) {
              const vals = cols.map((c) => sqlLiteral((row as Record<string, unknown>)[c], engine)).join(', ')
              await write(`INSERT INTO ${t} (${colList}) VALUES (${vals});\n`)
            }
            totalRows += res.rows.length
            onProgress?.(totalRows)
          }
          if (res.rows.length < BATCH) break
          page++
        }
        await write('\n')
      }
    }
    if (engine === 'mysql') await write('SET FOREIGN_KEY_CHECKS=1;\n')
    await new Promise<void>((resolve, reject) => stream.end((e?: Error) => (e ? reject(e) : resolve())))
    return { ok: true, path, tables: tables.length, rows: totalRows }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

/** Preview a .sql file: statement count + first few statements. */
export async function previewSqlFile(filePath: string): Promise<SqlFilePreview> {
  try {
    const text = await readFile(filePath, 'utf-8')
    const stmts = splitSqlStatements(text)
    return {
      ok: true,
      statements: stmts.length,
      bytes: Buffer.byteLength(text, 'utf-8'),
      sample: stmts.slice(0, 6).map((s) => (s.length > 200 ? s.slice(0, 200) + '…' : s))
    }
  } catch (err) {
    return { ok: false, statements: 0, bytes: 0, sample: [], error: (err as Error).message }
  }
}

/** Execute every statement in a .sql file against the connection (restore). */
export async function executeSqlFile(
  driver: DbDriver,
  filePath: string,
  onProgress?: (done: number) => void
): Promise<ExecSqlResult> {
  const text = await readFile(filePath, 'utf-8')
  const statements = splitSqlStatements(text)
  if (statements.length === 0) return { ok: true, executed: 0, total: 0 }
  const res = await driver.execStatements(statements)
  onProgress?.(res.executed ?? statements.length)
  if (!res.ok) {
    return { ok: false, executed: res.executed, total: statements.length, failedAt: res.failedAt, message: res.message }
  }
  return { ok: true, executed: res.executed, total: statements.length }
}
