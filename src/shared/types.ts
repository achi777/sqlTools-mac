// Shared TypeScript types for IPC payloads between the Electron main process
// and the renderer. This module is imported by BOTH sides, so it must contain
// ONLY types/constants — never any driver code or Node built-ins.

export type Engine = 'postgres' | 'mysql' | 'sqlite'

/** A saved connection. For sqlite, only `name`, `engine`, `filePath` matter. */
export interface ConnectionConfig {
  id: string
  name: string
  engine: Engine
  host?: string
  port?: number
  user?: string
  password?: string
  database?: string
  /** sqlite only: path to the .sqlite file */
  filePath?: string
}

/** Connection config with the secret stripped — safe to render/log. */
export type SafeConnectionConfig = Omit<ConnectionConfig, 'password'>

export interface TestConnectionResult {
  ok: boolean
  message?: string
}

/** A table (or view) reference within a schema. */
export interface TableRef {
  schema: string
  name: string
  type: 'table' | 'view'
}

/** One column of a table's structure. */
export interface ColumnDef {
  name: string
  dataType: string
  nullable: boolean
  isPrimaryKey: boolean
  defaultValue?: string | null
}

/** Column metadata attached to a query result. */
export interface ResultColumn {
  name: string
  /** Best-effort type label (engine-specific), for the grid header. */
  dataType: string
}

/** Server-side sort for table browsing. */
export interface SortSpec {
  column: string
  dir: 'asc' | 'desc'
}

/** Quick-filter operators (a sensible subset is offered per column type). */
export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'notIn'
  | 'between'
  | 'isNull'
  | 'isNotNull'

/** One column's quick filter. Multiple filters AND-combine (Navicat default). */
export interface ColumnFilter {
  column: string
  operator: FilterOperator
  /** Single value for eq/ne/lt/…/contains/startsWith/endsWith/between (lower). */
  value?: string | null
  /** Upper bound for BETWEEN. */
  value2?: string | null
  /** Values for IN / NOT IN. */
  values?: string[] | null
}

// --- Visual filter builder (nested AND/OR tree) ------------------------------

export type Combiner = 'AND' | 'OR'

/** A single leaf condition in the filter tree. */
export interface FilterCondition {
  kind: 'condition'
  column: string
  operator: FilterOperator
  value?: string | null
  value2?: string | null
  values?: string[] | null
}

/** A group of nodes combined with AND/OR, optionally negated (NOT (...)). */
export interface FilterGroup {
  kind: 'group'
  combiner: Combiner
  negated?: boolean
  children: FilterNode[]
}

export type FilterNode = FilterGroup | FilterCondition

/** A normalized query result. Rows are objects keyed by column name. */
export interface QueryResult {
  columns: ResultColumn[]
  rows: Record<string, unknown>[]
  rowCount: number
  durationMs: number
  /** True if the statement returned a row set (SELECT-like). */
  hasResultSet: boolean
}

/** Request to update a single cell by primary key. */
export interface UpdateCellRequest {
  connectionId: string
  schema: string
  table: string
  /** Column being changed. */
  column: string
  /** New value for that column. */
  value: unknown
  /** PK column -> value map identifying exactly one row. */
  primaryKey: Record<string, unknown>
}

export interface UpdateCellResult {
  ok: boolean
  affectedRows: number
  message?: string
}

/** Generic wrapper so IPC always resolves (never rejects) with a typed error. */
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string }

// --- Schema catalog (for schema-aware autocomplete) ---------------------------

export interface CatalogColumn {
  name: string
  type: string
}

export interface CatalogTable {
  schema: string
  name: string
  columns: CatalogColumn[]
}

/** A per-connection catalog used to power editor autocomplete. */
export interface SchemaCatalog {
  tables: CatalogTable[]
}

// --- Query history ------------------------------------------------------------

export interface HistoryEntry {
  id: number
  connectionId: string
  connectionName: string
  engine: Engine
  sql: string
  ok: boolean
  rowCount: number
  durationMs: number
  error: string | null
  /** Epoch milliseconds. */
  ts: number
}

// --- Persisted editor tabs ----------------------------------------------------

/** The persisted shape of a query tab (SQL text + metadata only; NO rows). */
export interface PersistedTab {
  id: string
  title: string
  connectionId: string | null
  sql: string
}

export interface PersistedTabs {
  tabs: PersistedTab[]
  activeTabId: string | null
}

// --- DDL: visual table designer spec + change sets ---------------------------

export type FkAction = 'NO ACTION' | 'RESTRICT' | 'CASCADE' | 'SET NULL' | 'SET DEFAULT'

/** One column in a table design. */
export interface ColumnSpec {
  name: string
  /** Canonical base type name, e.g. 'VARCHAR', 'NUMERIC', 'TIMESTAMP', 'ENUM'. */
  type: string
  /** Length (CHAR/VARCHAR/BINARY) or precision (DECIMAL/NUMERIC). */
  length?: number | null
  /** Scale for DECIMAL/NUMERIC(p,s). */
  scale?: number | null
  /** Values for MySQL ENUM/SET. */
  enumValues?: string[] | null
  /** PG TIME/TIMESTAMP "WITH TIME ZONE". */
  withTimeZone?: boolean | null
  /** MySQL numeric UNSIGNED flag. */
  unsigned?: boolean | null
  /** MySQL numeric ZEROFILL flag. */
  zerofill?: boolean | null
  /** PG array modifier -> appends `[]`. */
  isArray?: boolean | null
  nullable: boolean
  /** Raw default expression as typed (e.g. '0', "'pending'", 'now()'); no quoting applied. */
  default?: string | null
  /** Auto-increment / serial / identity. */
  autoIncrement?: boolean
  comment?: string | null
  /**
   * For EDIT mode: the column's original name, so a rename is detectable.
   * Undefined for newly added columns.
   */
  originalName?: string | null
}

export interface ForeignKeySpec {
  name?: string | null
  columns: string[]
  refSchema?: string | null
  refTable: string
  refColumns: string[]
  onDelete?: FkAction | null
  onUpdate?: FkAction | null
}

export interface IndexSpec {
  name?: string | null
  columns: string[]
  unique: boolean
}

/** A full table design (used for both CREATE and the target of an ALTER). */
export interface TableSpec {
  schema: string
  name: string
  /** For EDIT mode: original table name so a table rename is detectable. */
  originalName?: string | null
  columns: ColumnSpec[]
  primaryKey: string[]
  foreignKeys: ForeignKeySpec[]
  indexes: IndexSpec[]
  comment?: string | null
}

export type DdlMode = 'create' | 'alter'

export interface DdlRequest {
  connectionId: string
  mode: DdlMode
  spec: TableSpec
  /** Required for mode 'alter': the current structure to diff against. */
  original?: TableSpec | null
}

/** A generated DDL preview: statements + destructive analysis. */
export interface DdlPreview {
  /** Statements joined for display. */
  sql: string
  /** Individual statements, executed in order on apply. */
  statements: string[]
  destructive: boolean
  destructiveReasons: string[]
  /** Notes (e.g. SQLite rebuild, MySQL non-transactional DDL). */
  notes: string[]
}

export interface DdlApplyResult {
  ok: boolean
  /** Number of statements executed successfully. */
  executed: number
  /** If it failed, the 0-based index of the failing statement. */
  failedAt?: number
  message?: string
}

/** Object-level operations (schema/db and whole-table ops). */
export type ObjectOp =
  | { kind: 'createSchema'; name: string }
  | { kind: 'dropSchema'; name: string }
  | { kind: 'renameSchema'; name: string; newName: string }
  | { kind: 'dropTable'; schema: string; table: string }
  | { kind: 'truncateTable'; schema: string; table: string }
  | { kind: 'renameTable'; schema: string; table: string; newName: string }
  | { kind: 'dropView'; schema: string; name: string }
  | { kind: 'dropRoutine'; routineKind: RoutineKind; schema: string; name: string; signature?: string | null }
  | { kind: 'dropSequence'; schema: string; name: string }
  | { kind: 'dropTrigger'; schema: string; table: string; name: string }
  | { kind: 'dropIndex'; schema: string; table: string; name: string }

// --- Views + routines (functions / procedures) -------------------------------

export type RoutineKind = 'function' | 'procedure'

export interface ViewRef {
  schema: string
  name: string
}

export interface RoutineRef {
  schema: string
  name: string
  kind: RoutineKind
  /** Identity arg signature (e.g. '(integer, text)') — for display + PG drop. */
  signature?: string | null
  returns?: string | null
}

/** Which object's definition to fetch. `kind` 'view' returns the SELECT body. */
export interface ObjectDefRequest {
  connectionId: string
  kind: 'view' | RoutineKind
  schema: string
  name: string
  signature?: string | null
}

// --- Sequences (PostgreSQL only) ---------------------------------------------

export interface SequenceRef {
  schema: string
  name: string
}

/**
 * Full properties of a sequence. Numeric fields are STRINGS so bigint bounds
 * (up to 9223372036854775807) survive without precision loss.
 */
export interface SequenceInfo {
  schema: string
  name: string
  dataType: string
  start: string
  increment: string
  minValue: string
  maxValue: string
  cache: string
  cycle: boolean
  /** 'schema.table.column' when OWNED BY a column (e.g. a SERIAL), else null. */
  ownedBy: string | null
  /** pg_sequences.last_value — null until the sequence is first used. */
  lastValue: string | null
}

/** Create/alter spec for a sequence. Numeric fields are bigint-safe strings. */
export interface SequenceSpec {
  schema: string
  name: string
  /** EDIT mode: original name, so a rename (ALTER … RENAME TO) is detectable. */
  originalName?: string | null
  dataType: string
  increment: string
  /** null => NO MINVALUE (engine default). */
  minValue: string | null
  /** null => NO MAXVALUE (engine default). */
  maxValue: string | null
  start: string
  cache: string
  cycle: boolean
  /** 'schema.table.column' to OWN BY that column, or null => OWNED BY NONE. */
  ownedBy: string | null
  /** ALTER-only: RESTART the counter to this value (empty/null => no restart). */
  restart?: string | null
}

/** listSequences result: PG returns the list; MySQL/SQLite are unsupported. */
export interface SequenceList {
  supported: boolean
  sequences: SequenceRef[]
  /** Shown in the tree when unsupported (MySQL/SQLite). */
  note?: string
}

// --- Triggers (all engines) --------------------------------------------------

export type TriggerTiming = 'BEFORE' | 'AFTER' | 'INSTEAD OF'
export type TriggerEvent = 'INSERT' | 'UPDATE' | 'DELETE'
export type TriggerLevel = 'ROW' | 'STATEMENT'

export interface TriggerRef {
  schema: string
  table: string
  name: string
  /** For display in the tree (parsed from the definition). */
  timing: string
  event: string
}

/** Full trigger details (parsed in main) used to populate the edit form. */
export interface TriggerDetails {
  schema: string
  table: string
  name: string
  timing: string
  event: string
  level: string
  /** MySQL/SQLite: the trigger action body (BEGIN…END or single statement). */
  body: string
  /** PostgreSQL: the trigger function's name (unqualified). */
  functionName: string | null
  /** PostgreSQL: the trigger function's plpgsql body (between $$ … $$). */
  functionBody: string | null
  /** Raw full CREATE statement, for reference. */
  definition: string
}

// --- Indexes (all engines) — standalone per-table management -----------------

export interface IndexInfo {
  schema: string
  table: string
  name: string
  columns: string[]
  unique: boolean
  /**
   * True when the index backs a PK/UNIQUE/FK constraint (PG/MySQL) or is an
   * auto-index (SQLite) — such indexes are READ-ONLY here (drop the constraint
   * via the Table Designer instead).
   */
  constraintBacked: boolean
}

/** Create/edit spec for a standalone index. */
export interface IndexCreateSpec {
  schema: string
  table: string
  name: string
  /** EDIT: original name, so the existing index is dropped/renamed on apply. */
  originalName?: string | null
  columns: string[]
  unique: boolean
}

/** Create/edit spec for a trigger (engine-aware DDL generated from it). */
export interface TriggerSpec {
  schema: string
  table: string
  name: string
  /** EDIT: original name, so an existing trigger is dropped before recreate. */
  originalName?: string | null
  timing: TriggerTiming
  event: TriggerEvent
  level: TriggerLevel
  /** MySQL/SQLite: the action body. */
  body: string
  /** PostgreSQL: trigger function name (unqualified) — created/replaced inline. */
  functionName: string
  /** PostgreSQL: the function's plpgsql body (full BEGIN…END … RETURN block). */
  functionBody: string
}

// --- Visual view builder model -----------------------------------------------

export type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS'
export type VbAggregate = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX'

/** A table instance on the canvas (multiple instances allowed for self-joins). */
export interface VbTable {
  id: string
  schema: string
  table: string
  alias: string
}

export interface VbJoinCond {
  leftCol: string
  rightCol: string
}

export interface VbJoin {
  id: string
  type: JoinType
  leftId: string
  rightId: string
  conds: VbJoinCond[]
}

export interface VbOutput {
  id: string
  tableId: string
  column: string
  alias?: string | null
  aggregate?: VbAggregate | null
}

export interface VbGroup {
  tableId: string
  column: string
}

export interface VbOrder {
  tableId: string
  column: string
  dir: 'ASC' | 'DESC'
}

export interface ViewModel {
  tables: VbTable[]
  joins: VbJoin[]
  outputs: VbOutput[]
  distinct: boolean
  /** WHERE as a TASK 10 filter tree; condition columns are `alias.column`. */
  where: FilterGroup | null
  groupBy: VbGroup[]
  /** HAVING tree; condition columns are the aggregate expressions. */
  having: FilterGroup | null
  orderBy: VbOrder[]
}

/**
 * Result of reverse-parsing a view's SELECT into the builder model. `supported`
 * is false when the SELECT uses constructs the visual builder can't represent
 * (subquery, CTE, UNION, window fn, complex expression, …) — the caller then
 * falls back to the SQL editor and shows `reason`. When supported, `model`'s
 * table schemas are left empty for the renderer to resolve against the catalog.
 */
export type ParseViewResult =
  | { supported: true; model: ViewModel }
  | { supported: false; reason: string }

export interface ObjectOpRequest {
  connectionId: string
  op: ObjectOp
}

// --- ER diagram (auto-render + layout persistence) ---------------------------

/** One column as shown in an ER table node. */
export interface ErColumn {
  name: string
  type: string
  nullable: boolean
  isPrimaryKey: boolean
  /** True if this column participates in any outgoing foreign key. */
  isForeignKey: boolean
}

/** A table node in the ER model: columns + PK + its outgoing foreign keys. */
export interface ErTable {
  schema: string
  name: string
  columns: ErColumn[]
  primaryKey: string[]
  foreignKeys: ForeignKeySpec[]
}

/** The full ER model for one connection+schema. */
export interface ErModel {
  schema: string
  tables: ErTable[]
}

/** Persisted manual layout for a connection+schema diagram. */
export interface ErLayout {
  /** Node id (table name) -> canvas position. */
  positions: Record<string, { x: number; y: number }>
  /** Node ids whose column list is collapsed. */
  collapsed: string[]
}

// --- Grid CRUD: batched row changes ------------------------------------------

export interface RowUpdate {
  /** PK column -> value identifying exactly one row. */
  primaryKey: Record<string, unknown>
  /** Column -> new value. */
  changes: Record<string, unknown>
}

/** A batch of row changes to apply in one transaction. */
export interface RowChangeRequest {
  connectionId: string
  schema: string
  table: string
  /** PK column names (empty => table has no PK; updates/deletes not allowed). */
  primaryKey: string[]
  /** Column name -> SQL type, used for value coercion (e.g. '' -> NULL for non-text). */
  columnTypes: Record<string, string>
  /** Each insert: column -> value (only user-provided columns; rest use defaults). */
  inserts: Record<string, unknown>[]
  updates: RowUpdate[]
  /** Each delete: PK column -> value. */
  deletes: Record<string, unknown>[]
}

export interface RowChangeResult {
  ok: boolean
  inserted: number
  updated: number
  deleted: number
  /** Full inserted rows (with DB-assigned ids) where the engine can return them. */
  insertedRows: Record<string, unknown>[]
  /** On failure: which phase/row failed and why (transaction rolled back). */
  failure?: { phase: 'insert' | 'update' | 'delete'; index: number; message: string }
}

// --- Import / Export ---------------------------------------------------------

export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'sql'

export interface ExportOptions {
  /** CSV field delimiter (default ','). */
  csvDelimiter?: string
  /** How NULL is written in CSV: '' (empty) or '\N'. Default empty. */
  csvNull?: 'empty' | 'slashN'
  /** Prepend a UTF-8 BOM (Excel-friendly). */
  csvBom?: boolean
  /** JSON: pretty-print vs compact. */
  jsonPretty?: boolean
  /** SQL: emit multi-row INSERT batches. */
  sqlMultiRow?: boolean
  /** SQL: prepend a basic CREATE TABLE. */
  sqlCreateTable?: boolean
}

export interface ExportRequest {
  connectionId: string
  schema: string
  table: string
  format: ExportFormat
  /** 'filter' = rows matching the active filter; 'all' = whole table. */
  scope: 'filter' | 'all'
  /** Columns to include (empty => all, in table order). */
  columns: string[]
  /** Active filter payloads (only used when scope='filter'). */
  filters?: ColumnFilter[] | null
  tree?: FilterGroup | null
  customWhere?: string | null
  options: ExportOptions
}

export interface ExportResult {
  ok: boolean
  path?: string
  rows?: number
  canceled?: boolean
  error?: string
}

export type ImportFormat = 'csv' | 'json' | 'xlsx'

export interface ImportParseOptions {
  format: ImportFormat
  /** CSV delimiter (auto-detected if omitted). */
  delimiter?: string
  /** CSV: first row is a header (default true). */
  hasHeader?: boolean
  /** Excel: which sheet to read. */
  sheet?: string
}

export interface ImportPreview {
  ok: boolean
  /** Source column names (header or generated col1..colN / JSON keys). */
  columns: string[]
  /** First N rows for the preview, aligned to `columns`. */
  rows: unknown[][]
  /** Total data rows detected. */
  totalRows: number
  /** Excel: available sheet names. */
  sheets?: string[]
  /** CSV: the delimiter that was used/detected. */
  delimiter?: string
  error?: string
}

export interface ImportRequest {
  connectionId: string
  schema: string
  table: string
  filePath: string
  parse: ImportParseOptions
  /** Source column -> target column ('' or missing => ignore that source column). */
  mapping: Record<string, string>
  /** 'abort' = one transaction, rollback on first error; 'skip' = collect errors. */
  mode: 'abort' | 'skip'
  batchSize?: number
}

export interface ImportResult {
  ok: boolean
  inserted: number
  skipped: number
  /** Per-row errors (1-based data row index). */
  errors: { row: number; message: string }[]
  /** A fatal parse/setup error (distinct from per-row errors). */
  error?: string
}

/** Progress event payload (channel IPC.ioProgress). */
export interface IoProgress {
  phase: 'export' | 'import' | 'dump' | 'restore'
  done: number
  total: number
}

// --- Database dump / restore (SQL file) --------------------------------------

export interface DumpRequest {
  connectionId: string
  schema: string
  /** Include INSERT data (else schema-only). */
  includeData: boolean
}

export interface DumpResult {
  ok: boolean
  path?: string
  tables?: number
  rows?: number
  canceled?: boolean
  error?: string
}

export interface ExecSqlRequest {
  connectionId: string
  filePath: string
}

export interface ExecSqlResult {
  ok: boolean
  /** Statements executed successfully. */
  executed: number
  /** Total statements parsed from the file. */
  total: number
  /** 0-based index of the failing statement, if any. */
  failedAt?: number
  message?: string
}

/** Lightweight preview of a .sql file before executing it (restore). */
export interface SqlFilePreview {
  ok: boolean
  statements: number
  bytes: number
  /** First few statements (truncated) for display. */
  sample: string[]
  error?: string
}

/** The whitelisted API surface exposed on window via the preload bridge. */
export interface DbApi {
  // Connection persistence (stored in userData, never in the repo)
  listConnections(): Promise<SafeConnectionConfig[]>
  saveConnection(config: ConnectionConfig): Promise<IpcResult<SafeConnectionConfig>>
  deleteConnection(id: string): Promise<IpcResult<null>>
  getDefaults(): Promise<ConnectionConfig[]>

  // Live database operations (all run in main; drivers never touch renderer)
  testConnection(config: ConnectionConfig): Promise<TestConnectionResult>
  connect(id: string): Promise<IpcResult<null>>
  disconnect(id: string): Promise<IpcResult<null>>
  listSchemas(id: string): Promise<IpcResult<string[]>>
  listTables(id: string, schema: string): Promise<IpcResult<TableRef[]>>
  getTableStructure(id: string, schema: string, table: string): Promise<IpcResult<ColumnDef[]>>
  runQuery(id: string, sql: string, params?: unknown[]): Promise<IpcResult<QueryResult>>
  getTableRows(id: string, schema: string, table: string, limit?: number): Promise<IpcResult<QueryResult>>
  // Server-side pagination for table browsing.
  getTablePage(
    id: string,
    schema: string,
    table: string,
    pageSize: number,
    page: number,
    sort?: SortSpec | null,
    filters?: ColumnFilter[] | null,
    tree?: FilterGroup | null,
    customWhere?: string | null
  ): Promise<IpcResult<QueryResult>>
  getTableRowCount(
    id: string,
    schema: string,
    table: string,
    filters?: ColumnFilter[] | null,
    tree?: FilterGroup | null,
    customWhere?: string | null
  ): Promise<IpcResult<number>>
  updateCell(req: UpdateCellRequest): Promise<IpcResult<UpdateCellResult>>

  // Schema-aware autocomplete
  getSchemaCatalog(id: string, force?: boolean): Promise<IpcResult<SchemaCatalog>>

  // Query history (metadata only — never result rows)
  listHistory(connectionId?: string, search?: string, limit?: number): Promise<IpcResult<HistoryEntry[]>>
  clearHistory(connectionId?: string): Promise<IpcResult<null>>

  // Editor tab persistence (SQL text + metadata only)
  loadTabs(): Promise<PersistedTabs>
  saveTabs(tabs: PersistedTabs): Promise<IpcResult<null>>

  // DDL — table designer & object ops (generated + executed in MAIN)
  getTableSpec(id: string, schema: string, table: string): Promise<IpcResult<TableSpec>>
  previewDdl(req: DdlRequest): Promise<IpcResult<DdlPreview>>
  applyDdl(req: DdlRequest): Promise<IpcResult<DdlApplyResult>>
  previewObjectOp(req: ObjectOpRequest): Promise<IpcResult<DdlPreview>>
  applyObjectOp(req: ObjectOpRequest): Promise<IpcResult<DdlApplyResult>>

  // Grid CRUD — batched parameterized row changes (INSERT/UPDATE/DELETE)
  applyRowChanges(req: RowChangeRequest): Promise<IpcResult<RowChangeResult>>

  // Views + routines (functions / procedures)
  listViews(id: string, schema: string): Promise<IpcResult<ViewRef[]>>
  listRoutines(id: string, schema: string): Promise<IpcResult<RoutineRef[]>>
  getObjectDefinition(req: ObjectDefRequest): Promise<IpcResult<string>>
  /** Reverse-parse a view SELECT into a builder model (or a fallback reason). */
  parseViewToModel(engine: Engine, sql: string): Promise<IpcResult<ParseViewResult>>
  /** Execute programmable-object DDL (CREATE/DROP …) via the driver. */
  applyObjectSql(id: string, statements: string[]): Promise<IpcResult<DdlApplyResult>>

  // Sequences (PostgreSQL). MySQL/SQLite return { supported:false, note }.
  listSequences(id: string, schema: string): Promise<IpcResult<SequenceList>>
  getSequenceDetails(id: string, schema: string, name: string): Promise<IpcResult<SequenceInfo>>

  // Triggers (all engines) — listed per table
  listTriggers(id: string, schema: string, table: string): Promise<IpcResult<TriggerRef[]>>
  getTriggerDetails(id: string, schema: string, table: string, name: string): Promise<IpcResult<TriggerDetails>>

  // Indexes (all engines) — listed per table
  listIndexes(id: string, schema: string, table: string): Promise<IpcResult<IndexInfo[]>>

  // Import / Export (data)
  /** Export a table / active-filter result to a file (opens a save dialog). */
  exportData(req: ExportRequest): Promise<IpcResult<ExportResult>>
  /** Pick a file to import (open dialog); returns the path or null if cancelled. */
  importPickFile(): Promise<IpcResult<string | null>>
  /** Parse a file for preview (columns + first rows + sheets). */
  importPreview(filePath: string, parse: ImportParseOptions, limit?: number): Promise<IpcResult<ImportPreview>>
  /** Execute an import (parameterized batched inserts). */
  importExecute(req: ImportRequest): Promise<IpcResult<ImportResult>>
  /** Subscribe to export/import progress; returns an unsubscribe function. */
  onIoProgress(cb: (p: IoProgress) => void): () => void

  // Database dump / restore (whole-DB SQL file)
  /** Dump a database/schema (DDL + optional data) to a .sql file (save dialog). */
  dumpDatabase(req: DumpRequest): Promise<IpcResult<DumpResult>>
  /** Pick a .sql file to execute (open dialog); returns the path or null. */
  pickSqlFile(): Promise<IpcResult<string | null>>
  /** Preview a .sql file (statement count + sample) before executing. */
  previewSqlFile(filePath: string): Promise<IpcResult<SqlFilePreview>>
  /** Execute every statement in a .sql file against a connection (restore). */
  executeSqlFile(req: ExecSqlRequest): Promise<IpcResult<ExecSqlResult>>

  // ER diagram — auto-render model + persisted layout + image export
  /** All tables (columns/PK/FK) for a schema, for the ER diagram. */
  getErModel(id: string, schema: string): Promise<IpcResult<ErModel>>
  /** Load a saved manual layout for a connection+schema (null if none). */
  loadErLayout(id: string, schema: string): Promise<IpcResult<ErLayout | null>>
  /** Persist the manual layout for a connection+schema. */
  saveErLayout(id: string, schema: string, layout: ErLayout): Promise<IpcResult<null>>
  /** Save an exported diagram image (PNG/SVG data URL) via a save dialog; returns the path (null if cancelled). */
  saveDiagramImage(dataUrl: string, suggestedName: string): Promise<IpcResult<string | null>>
}

/** IPC channel names — single source of truth for both sides. */
export const IPC = {
  listConnections: 'db:listConnections',
  saveConnection: 'db:saveConnection',
  deleteConnection: 'db:deleteConnection',
  getDefaults: 'db:getDefaults',
  testConnection: 'db:testConnection',
  connect: 'db:connect',
  disconnect: 'db:disconnect',
  listSchemas: 'db:listSchemas',
  listTables: 'db:listTables',
  getTableStructure: 'db:getTableStructure',
  runQuery: 'db:runQuery',
  getTableRows: 'db:getTableRows',
  getTablePage: 'db:getTablePage',
  getTableRowCount: 'db:getTableRowCount',
  updateCell: 'db:updateCell',
  getSchemaCatalog: 'db:getSchemaCatalog',
  listHistory: 'db:listHistory',
  clearHistory: 'db:clearHistory',
  loadTabs: 'db:loadTabs',
  saveTabs: 'db:saveTabs',
  getTableSpec: 'db:getTableSpec',
  previewDdl: 'db:previewDdl',
  applyDdl: 'db:applyDdl',
  previewObjectOp: 'db:previewObjectOp',
  applyObjectOp: 'db:applyObjectOp',
  applyRowChanges: 'db:applyRowChanges',
  listViews: 'db:listViews',
  listRoutines: 'db:listRoutines',
  getObjectDefinition: 'db:getObjectDefinition',
  parseViewToModel: 'db:parseViewToModel',
  applyObjectSql: 'db:applyObjectSql',
  listSequences: 'db:listSequences',
  getSequenceDetails: 'db:getSequenceDetails',
  listTriggers: 'db:listTriggers',
  getTriggerDetails: 'db:getTriggerDetails',
  listIndexes: 'db:listIndexes',
  exportData: 'db:exportData',
  importPickFile: 'db:importPickFile',
  importPreview: 'db:importPreview',
  importExecute: 'db:importExecute',
  ioProgress: 'db:ioProgress',
  dumpDatabase: 'db:dumpDatabase',
  pickSqlFile: 'db:pickSqlFile',
  previewSqlFile: 'db:previewSqlFile',
  executeSqlFile: 'db:executeSqlFile',
  getErModel: 'db:getErModel',
  loadErLayout: 'db:loadErLayout',
  saveErLayout: 'db:saveErLayout',
  saveDiagramImage: 'db:saveDiagramImage'
} as const

/** Default row cap for table browsing / SELECT preview in this slice. */
export const DEFAULT_ROW_LIMIT = 200

/** Pagination defaults for table browsing. */
export const PAGE_SIZE_DEFAULT = 100
export const PAGE_SIZES = [25, 50, 100, 200, 500]

/** Max history rows kept per connection. */
export const HISTORY_CAP_PER_CONNECTION = 500
