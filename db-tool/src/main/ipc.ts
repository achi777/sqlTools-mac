// Typed IPC handlers (MAIN process). Every DB operation the renderer can
// trigger is registered here and validated. Handlers always resolve with an
// IpcResult<T> so the renderer never has to catch a rejected promise.
//
// Passwords are never logged. Errors are stringified messages only.
import { app, dialog, ipcMain, shell } from 'electron'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  IPC,
  DEFAULT_ROW_LIMIT,
  type ConnectionConfig,
  type DdlRequest,
  type ErColumn,
  type ErLayout,
  type ErModel,
  type ErTable,
  type DumpRequest,
  type ExecSqlRequest,
  type ExportRequest,
  type ImportParseOptions,
  type ImportRequest,
  type IpcResult,
  type ObjectOpRequest,
  type PersistedTabs,
  type QueryResult,
  type RowChangeRequest,
  type SchemaCatalog,
  type UpdateCellRequest
} from '@shared/types'
import { createDriver, type DbDriver } from './driver'
import { buildObjectOp, buildTableDdl } from './ddl'
import { runExport } from './exporter'
import { previewImport, runImport } from './importer'
import { dumpDatabase, executeSqlFile, previewSqlFile } from './dumper'
import { reverseParseView } from './viewReverse'
import {
  deleteConnection as removeConnection,
  getConnection,
  loadConnections,
  loadErLayout,
  loadTabs,
  loadUiState,
  saveErLayout,
  saveTabs,
  saveUiState,
  seedMissingDefaults,
  stripSecret,
  upsertConnection
} from './store'
import { clearHistory, closeHistory, listHistory, recordHistory } from './history'

// Live drivers keyed by connection id. A driver is created+connected on
// `connect` and torn down on `disconnect`.
const live = new Map<string, DbDriver>()

// Per-connection schema catalog cache (for autocomplete). Invalidated on
// (dis)connect so a reconnect always re-fetches fresh metadata.
const catalogCache = new Map<string, SchemaCatalog>()

/** Record one executed query into history (best-effort; never throws up). */
function logHistory(driver: DbDriver, sql: string, result: QueryResult, ok: boolean, error?: string): void {
  try {
    recordHistory({
      connectionId: driver.config.id,
      connectionName: driver.config.name,
      engine: driver.config.engine,
      sql,
      ok,
      rowCount: result?.rowCount ?? 0,
      durationMs: result?.durationMs ?? 0,
      error: error ?? null,
      ts: Date.now()
    })
  } catch {
    // History is non-critical; swallow errors so it never breaks a query.
  }
}

function ok<T>(data: T): IpcResult<T> {
  return { ok: true, data }
}
function fail<T>(err: unknown): IpcResult<T> {
  return { ok: false, error: err instanceof Error ? err.message : String(err) }
}

function requireDriver(id: string): DbDriver {
  const d = live.get(id)
  if (!d) throw new Error('Connection is not open. Click Connect first.')
  return d
}

/** Default connections pre-filled to match TASK 01's databases. */
function defaultConnections(): ConnectionConfig[] {
  const sqlitePath = join(app.getPath('userData'), 'dbtool.sqlite')
  return [
    {
      id: 'default-postgres',
      name: 'Local Postgres (dbtool_dev)',
      engine: 'postgres',
      host: 'localhost',
      port: 5432,
      user: 'dbtool',
      password: 'dbtool',
      database: 'dbtool_dev'
    },
    {
      id: 'default-mysql',
      name: 'Local MySQL (dbtool_dev)',
      engine: 'mysql',
      host: 'localhost',
      port: 3306,
      user: 'dbtool',
      password: 'dbtool',
      database: 'dbtool_dev'
    },
    {
      id: 'default-mariadb',
      name: 'Local MariaDB (dbtool_dev)',
      engine: 'mariadb',
      host: 'localhost',
      port: 3308,
      user: 'dbtool',
      password: 'dbtool',
      database: 'dbtool_dev'
    },
    {
      id: 'default-oracle',
      name: 'Local Oracle XE (dbtool)',
      engine: 'oracle',
      host: 'localhost',
      port: 1522,
      user: 'dbtool',
      password: 'dbtool',
      serviceName: 'XEPDB1',
      driverMode: 'thin'
    },
    {
      id: 'default-mssql',
      name: 'Local SQL Server (dbtool_dev)',
      engine: 'mssql',
      host: 'localhost',
      port: 1433,
      user: 'sa',
      password: 'DbTool!Passw0rd',
      database: 'dbtool_dev',
      authType: 'sql',
      encrypt: true,
      trustServerCertificate: true
    },
    {
      id: 'default-sqlite',
      name: 'Local SQLite (dbtool.sqlite)',
      engine: 'sqlite',
      filePath: sqlitePath
    }
  ]
}

export function registerIpc(): void {
  // Make every pre-seeded default a real saved connection so the manager shows
  // the identical action set (connect/edit/delete) for all engines.
  seedMissingDefaults(defaultConnections())

  ipcMain.handle(IPC.getDefaults, () => defaultConnections())

  // App metadata for the About dialog. Display name is the packaged productName
  // ("DB Tool"); version comes from package.json via Electron.
  ipcMain.handle(IPC.getAppInfo, () => ({ name: 'DB Tool', version: app.getVersion() }))

  // Open an external link (website / mailto) in the OS default handler. The
  // renderer must NEVER pass this to the app window — we validate the scheme
  // here and only allow http(s)/mailto, then hand off to the OS shell.
  ipcMain.handle(IPC.openExternal, async (_e, url: unknown) => {
    try {
      if (typeof url !== 'string') return fail(new Error('Invalid URL'))
      let scheme: string
      try {
        scheme = new URL(url).protocol.replace(':', '').toLowerCase()
      } catch {
        return fail(new Error('Malformed URL'))
      }
      if (!['http', 'https', 'mailto'].includes(scheme)) {
        return fail(new Error(`Blocked URL scheme: ${scheme}`))
      }
      await shell.openExternal(url)
      return ok(null)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.listConnections, () => loadConnections().map(stripSecret))

  ipcMain.handle(IPC.saveConnection, (_e, config: ConnectionConfig) => {
    try {
      // The renderer never receives passwords; on edit it sends a blank one and
      // we keep the previously-stored secret (or the built-in default's).
      const incoming = { ...config }
      if (!incoming.password) {
        const existing = getConnection(incoming.id) ?? defaultConnections().find((c) => c.id === incoming.id)
        if (existing?.password) incoming.password = existing.password
      }
      const saved = upsertConnection(incoming)
      return ok(stripSecret(saved))
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.deleteConnection, async (_e, id: string) => {
    try {
      const d = live.get(id)
      if (d) {
        await d.disconnect().catch(() => undefined)
        live.delete(id)
      }
      removeConnection(id)
      catalogCache.delete(id)
      return ok(null)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.testConnection, async (_e, config: ConnectionConfig) => {
    try {
      const driver = await createDriver(config)
      return await driver.testConnection()
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle(IPC.connect, async (_e, id: string) => {
    try {
      if (live.has(id)) return ok(null)
      const config = getConnection(id) ?? defaultConnections().find((c) => c.id === id)
      if (!config) throw new Error(`Unknown connection: ${id}`)
      const driver = await createDriver(config)
      await driver.connect()
      live.set(id, driver)
      catalogCache.delete(id) // fresh catalog on (re)connect
      return ok(null)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.disconnect, async (_e, id: string) => {
    try {
      const d = live.get(id)
      if (d) {
        await d.disconnect()
        live.delete(id)
      }
      catalogCache.delete(id)
      return ok(null)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.listSchemas, async (_e, id: string) => {
    try {
      return ok(await requireDriver(id).listSchemas())
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.listTables, async (_e, id: string, schema: string) => {
    try {
      return ok(await requireDriver(id).listTables(schema))
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.getTableStructure, async (_e, id: string, schema: string, table: string) => {
    try {
      return ok(await requireDriver(id).getTableStructure(schema, table))
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.runQuery, async (_e, id: string, sql: string, params?: unknown[]) => {
    const driver = live.get(id)
    try {
      const result = await requireDriver(id).runQuery(sql, params ?? [])
      if (driver) logHistory(driver, sql, result, true)
      return ok(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (driver) {
        logHistory(driver, sql, { rowCount: 0, durationMs: 0 } as QueryResult, false, message)
      }
      return fail(err)
    }
  })

  ipcMain.handle(
    IPC.getTablePage,
    async (
      _e,
      id: string,
      schema: string,
      table: string,
      pageSize: number,
      page: number,
      sort?: import('@shared/types').SortSpec | null,
      filters?: import('@shared/types').ColumnFilter[] | null,
      tree?: import('@shared/types').FilterGroup | null,
      customWhere?: string | null
    ) => {
      try {
        return ok(await requireDriver(id).getTablePage(schema, table, pageSize, page, sort, filters, tree, customWhere))
      } catch (err) {
        return fail(err)
      }
    }
  )

  ipcMain.handle(
    IPC.getTableRowCount,
    async (
      _e,
      id: string,
      schema: string,
      table: string,
      filters?: import('@shared/types').ColumnFilter[] | null,
      tree?: import('@shared/types').FilterGroup | null,
      customWhere?: string | null
    ) => {
      try {
        return ok(await requireDriver(id).getTableRowCount(schema, table, filters, tree, customWhere))
      } catch (err) {
        return fail(err)
      }
    }
  )

  ipcMain.handle(
    IPC.getTableRows,
    async (_e, id: string, schema: string, table: string, limit?: number) => {
      const driver = live.get(id)
      try {
        const result = await requireDriver(id).getTableRows(
          schema,
          table,
          limit ?? DEFAULT_ROW_LIMIT
        )
        // Record the effective SQL so table-clicks show up in history too.
        if (driver) {
          logHistory(
            driver,
            `SELECT * FROM ${table} LIMIT ${limit ?? DEFAULT_ROW_LIMIT}`,
            result,
            true
          )
        }
        return ok(result)
      } catch (err) {
        return fail(err)
      }
    }
  )

  ipcMain.handle(IPC.getSchemaCatalog, async (_e, id: string, force?: boolean) => {
    try {
      if (!force) {
        const cached = catalogCache.get(id)
        if (cached) return ok(cached)
      }
      const catalog = await requireDriver(id).getSchemaCatalog()
      catalogCache.set(id, catalog)
      return ok(catalog)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(
    IPC.listHistory,
    (_e, connectionId?: string, search?: string, limit?: number) => {
      try {
        return ok(listHistory(connectionId, search, limit))
      } catch (err) {
        return fail(err)
      }
    }
  )

  ipcMain.handle(IPC.clearHistory, (_e, connectionId?: string) => {
    try {
      clearHistory(connectionId)
      return ok(null)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.loadTabs, () => loadTabs())

  ipcMain.handle(IPC.saveTabs, (_e, data: PersistedTabs) => {
    try {
      saveTabs(data)
      return ok(null)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.loadUiState, () => loadUiState())

  ipcMain.handle(IPC.saveUiState, (_e, state: import('@shared/types').UiState) => {
    try {
      saveUiState(state)
      return ok(null)
    } catch (err) {
      return fail(err)
    }
  })

  // --- DDL: table designer + object ops ---
  ipcMain.handle(IPC.getTableSpec, async (_e, id: string, schema: string, table: string) => {
    try {
      return ok(await requireDriver(id).getTableSpec(schema, table))
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.previewDdl, (_e, req: DdlRequest) => {
    try {
      const driver = requireDriver(req.connectionId)
      return ok(buildTableDdl(driver.config.engine, req.mode, req.spec, req.original ?? undefined))
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.applyDdl, async (_e, req: DdlRequest) => {
    try {
      const driver = requireDriver(req.connectionId)
      // Re-generate from the request in MAIN so what runs always matches the
      // preview — the renderer's SQL string is never trusted/executed.
      const preview = buildTableDdl(
        driver.config.engine,
        req.mode,
        req.spec,
        req.original ?? undefined
      )
      const result = await driver.execStatements(preview.statements)
      catalogCache.delete(req.connectionId) // structure changed
      return ok(result)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.applyRowChanges, async (_e, req: RowChangeRequest) => {
    try {
      return ok(await requireDriver(req.connectionId).applyRowChanges(req))
    } catch (err) {
      return fail(err)
    }
  })

  // --- views + routines ---
  ipcMain.handle(IPC.listViews, async (_e, id: string, schema: string) => {
    try {
      return ok(await requireDriver(id).listViews(schema))
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.listRoutines, async (_e, id: string, schema: string) => {
    try {
      return ok(await requireDriver(id).listRoutines(schema))
    } catch (err) {
      return fail(err)
    }
  })

  // --- Packages (Oracle only; other engines return []) ---
  ipcMain.handle(IPC.listPackages, async (_e, id: string, schema: string) => {
    try {
      const driver = requireDriver(id)
      return ok(driver.listPackages ? await driver.listPackages(schema) : [])
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.getObjectDefinition, async (_e, req: import('@shared/types').ObjectDefRequest) => {
    try {
      return ok(await requireDriver(req.connectionId).getObjectDefinition(req))
    } catch (err) {
      return fail(err)
    }
  })

  // Pure string->model reverse parse; no DB needed.
  ipcMain.handle(IPC.parseViewToModel, (_e, engine: import('@shared/types').Engine, sql: string) => {
    try {
      return ok(reverseParseView(engine, sql))
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.applyObjectSql, async (_e, id: string, statements: string[]) => {
    try {
      const result = await requireDriver(id).applyObjectSql(statements)
      catalogCache.delete(id)
      return ok(result)
    } catch (err) {
      return fail(err)
    }
  })

  // --- Sequences (PostgreSQL; MySQL/SQLite report unsupported) ---
  ipcMain.handle(IPC.listSequences, async (_e, id: string, schema: string) => {
    try {
      const driver = requireDriver(id)
      const engine = driver.config.engine
      // PostgreSQL, MariaDB (10.3+), and Oracle have standalone sequences; MySQL/SQLite don't.
      const hasSequences = engine === 'postgres' || engine === 'mariadb' || engine === 'oracle'
      if (!hasSequences) {
        const note =
          engine === 'sqlite'
            ? 'SQLite has no standalone sequences (rowid / AUTOINCREMENT).'
            : 'MySQL uses AUTO_INCREMENT; no standalone sequences.'
        return ok({ supported: false, sequences: [], note })
      }
      return ok({ supported: true, sequences: await driver.listSequences(schema) })
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.getSequenceDetails, async (_e, id: string, schema: string, name: string) => {
    try {
      return ok(await requireDriver(id).getSequenceDetails(schema, name))
    } catch (err) {
      return fail(err)
    }
  })

  // --- Triggers (all engines, per table) ---
  ipcMain.handle(IPC.listTriggers, async (_e, id: string, schema: string, table: string) => {
    try {
      return ok(await requireDriver(id).listTriggers(schema, table))
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.getTriggerDetails, async (_e, id: string, schema: string, table: string, name: string) => {
    try {
      return ok(await requireDriver(id).getTriggerDetails(schema, table, name))
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.listIndexes, async (_e, id: string, schema: string, table: string) => {
    try {
      return ok(await requireDriver(id).listIndexes(schema, table))
    } catch (err) {
      return fail(err)
    }
  })

  // --- Import / Export ---
  ipcMain.handle(IPC.exportData, async (e, req: ExportRequest) => {
    try {
      const driver = requireDriver(req.connectionId)
      const ext = req.format
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export data',
        defaultPath: `${req.table}.${ext}`,
        filters: [{ name: req.format.toUpperCase(), extensions: [ext] }]
      })
      if (canceled || !filePath) return ok({ ok: true, canceled: true })
      const useFilter = req.scope === 'filter'
      let total = 0
      try {
        total = await driver.getTableRowCount(
          req.schema,
          req.table,
          useFilter ? req.filters ?? [] : [],
          useFilter ? req.tree ?? null : null,
          useFilter ? req.customWhere ?? null : null
        )
      } catch {
        // total is best-effort (progress denominator only)
      }
      const res = await runExport(driver, driver.config.engine, req, filePath, (done) =>
        e.sender.send(IPC.ioProgress, { phase: 'export', done, total })
      )
      return ok(res)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.importPickFile, async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Import file',
        properties: ['openFile'],
        filters: [
          { name: 'Data files', extensions: ['csv', 'json', 'xlsx', 'xls'] },
          { name: 'All files', extensions: ['*'] }
        ]
      })
      return ok(canceled || !filePaths[0] ? null : filePaths[0])
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.importPreview, (_e, filePath: string, parse: ImportParseOptions, limit?: number) => {
    try {
      return ok(previewImport(filePath, parse, limit))
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.importExecute, async (_e, req: ImportRequest) => {
    try {
      const driver = requireDriver(req.connectionId)
      const spec = await driver.getTableSpec(req.schema, req.table)
      const columnTypes: Record<string, string> = {}
      for (const c of spec.columns) columnTypes[c.name] = c.type
      return ok(await runImport(driver, { columnTypes, primaryKey: spec.primaryKey }, req))
    } catch (err) {
      return fail(err)
    }
  })

  // --- Database dump / restore (SQL file) ---
  ipcMain.handle(IPC.dumpDatabase, async (e, req: DumpRequest) => {
    try {
      const driver = requireDriver(req.connectionId)
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Dump database to SQL file',
        defaultPath: `${req.schema}_dump.sql`,
        filters: [{ name: 'SQL', extensions: ['sql'] }]
      })
      if (canceled || !filePath) return ok({ ok: true, canceled: true })
      const res = await dumpDatabase(driver, driver.config.engine, req, filePath, (rows) =>
        e.sender.send(IPC.ioProgress, { phase: 'dump', done: rows, total: 0 })
      )
      return ok(res)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.pickSqlFile, async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Execute SQL file',
        properties: ['openFile'],
        filters: [
          { name: 'SQL', extensions: ['sql'] },
          { name: 'All files', extensions: ['*'] }
        ]
      })
      return ok(canceled || !filePaths[0] ? null : filePaths[0])
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.previewSqlFile, async (_e, filePath: string) => {
    try {
      return ok(await previewSqlFile(filePath))
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.executeSqlFile, async (e, req: ExecSqlRequest) => {
    try {
      const driver = requireDriver(req.connectionId)
      const res = await executeSqlFile(driver, req.filePath, (done) =>
        e.sender.send(IPC.ioProgress, { phase: 'restore', done, total: 0 })
      )
      catalogCache.delete(req.connectionId) // structure/data may have changed
      return ok(res)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.previewObjectOp, (_e, req: ObjectOpRequest) => {
    try {
      const driver = requireDriver(req.connectionId)
      return ok(buildObjectOp(driver.config.engine, req.op))
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.applyObjectOp, async (_e, req: ObjectOpRequest) => {
    try {
      const driver = requireDriver(req.connectionId)
      const preview = buildObjectOp(driver.config.engine, req.op)
      if (preview.statements.length === 0) {
        return ok({ ok: true, executed: 0, message: preview.notes.join(' ') })
      }
      const result = await driver.execStatements(preview.statements)
      catalogCache.delete(req.connectionId)
      return ok(result)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.updateCell, async (_e, req: UpdateCellRequest) => {
    try {
      const driver = requireDriver(req.connectionId)
      const affected = await driver.updateCell(
        req.schema,
        req.table,
        req.column,
        req.value,
        req.primaryKey
      )
      return ok({ ok: true, affectedRows: affected })
    } catch (err) {
      return fail(err)
    }
  })

  // --- ER diagram ------------------------------------------------------------

  // Build the ER model by introspecting every base table's full spec (columns,
  // PK, FKs) — reuses getTableSpec so FK metadata is identical to the designer.
  ipcMain.handle(IPC.getErModel, async (_e, id: string, schema: string) => {
    try {
      const driver = requireDriver(id)
      const refs = await driver.listTables(schema)
      const tables: ErTable[] = []
      for (const ref of refs) {
        const spec = await driver.getTableSpec(schema, ref.name)
        // A column is an FK if it appears in any of the table's outgoing FKs.
        const fkCols = new Set<string>()
        for (const fk of spec.foreignKeys) for (const c of fk.columns) fkCols.add(c)
        const pk = new Set(spec.primaryKey)
        const columns: ErColumn[] = spec.columns.map((c) => ({
          name: c.name,
          type: columnTypeLabel(c),
          nullable: c.nullable,
          isPrimaryKey: pk.has(c.name),
          isForeignKey: fkCols.has(c.name)
        }))
        tables.push({
          schema,
          name: ref.name,
          columns,
          primaryKey: spec.primaryKey,
          foreignKeys: spec.foreignKeys
        })
      }
      const model: ErModel = { schema, tables }
      return ok(model)
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.loadErLayout, (_e, id: string, schema: string) => {
    try {
      return ok(loadErLayout(id, schema))
    } catch (err) {
      return fail(err)
    }
  })

  ipcMain.handle(IPC.saveErLayout, (_e, id: string, schema: string, layout: ErLayout) => {
    try {
      saveErLayout(id, schema, layout)
      return ok(null)
    } catch (err) {
      return fail(err)
    }
  })

  // Save an exported diagram image. The renderer produces a PNG/SVG data URL
  // (html-to-image); main decodes it and writes to a user-chosen path.
  ipcMain.handle(IPC.saveDiagramImage, async (_e, dataUrl: string, suggestedName: string) => {
    try {
      const isSvg = dataUrl.startsWith('data:image/svg')
      const ext = isSvg ? 'svg' : 'png'
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Export ER diagram',
        defaultPath: suggestedName,
        filters: [{ name: isSvg ? 'SVG image' : 'PNG image', extensions: [ext] }]
      })
      if (canceled || !filePath) return ok(null)
      const comma = dataUrl.indexOf(',')
      const meta = dataUrl.slice(0, comma)
      const payload = dataUrl.slice(comma + 1)
      if (meta.includes(';base64')) {
        writeFileSync(filePath, Buffer.from(payload, 'base64'))
      } else {
        // SVG data URLs are URI-encoded text, not base64.
        writeFileSync(filePath, decodeURIComponent(payload), 'utf-8')
      }
      return ok(filePath)
    } catch (err) {
      return fail(err)
    }
  })
}

/** A compact type label for an ER column (e.g. VARCHAR(255), NUMERIC(10,2)). */
function columnTypeLabel(c: import('@shared/types').ColumnSpec): string {
  let t = c.type
  if (c.length != null && c.scale != null) t += `(${c.length},${c.scale})`
  else if (c.length != null) t += `(${c.length})`
  if (c.isArray) t += '[]'
  return t
}

/** Tear down all live connections on app quit. */
export async function disposeAll(): Promise<void> {
  await Promise.all(Array.from(live.values()).map((d) => d.disconnect().catch(() => undefined)))
  live.clear()
  catalogCache.clear()
  closeHistory()
}
