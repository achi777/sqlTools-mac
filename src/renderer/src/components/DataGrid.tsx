import { useCallback, useMemo, useState } from 'react'
import {
  DataEditor,
  GridCellKind,
  CompactSelection,
  type GridCell,
  type GridColumn,
  type Item,
  type EditableGridCell,
  type GridSelection
} from '@glideapps/glide-data-grid'
import '@glideapps/glide-data-grid/dist/index.css'
import type { Rectangle } from '@glideapps/glide-data-grid'
import type { ColumnSpec } from '@shared/types'
import { useStore } from '../store'
import { PaginationBar } from './PaginationBar'
import { ColumnFilterPopover, type PopoverAnchor } from './ColumnFilterPopover'
import { FilterBuilder } from './FilterBuilder'
import { CustomWhereBar } from './CustomWhereBar'

function toDisplay(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  return String(value)
}

// Dark theme for the grid so it matches the app AND so the cell/overlay text
// stays LIGHT — otherwise the tinted (green/blue/red) staged cells render dark
// text on a dark background and what you type is invisible.
const GRID_THEME = {
  accentColor: '#7c9cff',
  accentFg: '#12121c',
  accentLight: 'rgba(124,156,255,0.25)',
  textDark: '#e4e4ef',
  textMedium: '#c4c4d6',
  textLight: '#9a9ab0',
  textBubble: '#e4e4ef',
  bgIconHeader: '#9a9ab0',
  fgIconHeader: '#1e1e2e',
  textHeader: '#c4c4d6',
  textHeaderSelected: '#12121c',
  bgCell: '#1e1e2e',
  bgCellMedium: '#242436',
  bgHeader: '#2a2a3c',
  bgHeaderHasFocus: '#33334a',
  bgHeaderHovered: '#30304a',
  bgBubble: '#2a2a3c',
  bgBubbleSelected: '#33334a',
  bgSearchResult: '#4a4522',
  borderColor: '#3a3a4f',
  drilldownBorder: '#3a3a4f',
  linkColor: '#7c9cff'
}

// Tints for staged cells — dark backgrounds paired with LIGHT text so typed
// values remain readable while editing.
const TINT_NEW = { bgCell: '#26332b', textDark: '#e4e4ef' }
const TINT_EDIT = { bgCell: '#2c3350', textDark: '#e4e4ef' }
const TINT_DELETE = { bgCell: '#4a2530', textDark: '#ff9aa2' }

export function DataGrid(): JSX.Element {
  const activeTab = useStore((s) => s.getActiveTab())
  const stageEdit = useStore((s) => s.stageEdit)
  const setNewRowCell = useStore((s) => s.setNewRowCell)
  const toggleDeleteRows = useStore((s) => s.toggleDeleteRows)
  const discardChanges = useStore((s) => s.discardChanges)
  const applyChanges = useStore((s) => s.applyChanges)
  const setSort = useStore((s) => s.setSort)
  const clearAllFilters = useStore((s) => s.clearAllFilters)
  const setFilterMode = useStore((s) => s.setFilterMode)
  const openExport = useStore((s) => s.openExport)
  const openImport = useStore((s) => s.openImport)
  const engineOf = useStore((s) => s.engineOf)

  const [selection, setSelection] = useState<GridSelection>({
    columns: CompactSelection.empty(),
    rows: CompactSelection.empty()
  })
  const [filterAnchor, setFilterAnchor] = useState<PopoverAnchor | null>(null)
  const [builderOpen, setBuilderOpen] = useState(false)

  const result = activeTab?.result ?? null
  const resultError = activeTab?.resultError ?? null
  const gridTable = activeTab?.gridTable ?? null
  const spec = activeTab?.gridSpec ?? null
  const pending = activeTab?.pending ?? { edits: {}, deletes: {}, newRows: [] }
  const crudMessage = activeTab?.crudMessage ?? null

  const colMeta = useMemo(() => {
    const m = new Map<string, ColumnSpec>()
    if (spec) for (const c of spec.columns) m.set(c.name, c)
    return m
  }, [spec])

  const pkCols = spec?.primaryKey ?? []
  const hasPk = pkCols.length > 0
  const isTable = !!gridTable && !!spec

  const dataRows = result?.rows.length ?? 0
  const newRowCount = pending.newRows.length
  // existing rows + pending new rows + one always-empty trailing row (if a table)
  const totalRows = dataRows + newRowCount + (isTable ? 1 : 0)

  const rowKeyOf = useCallback(
    (row: Record<string, unknown>): string => JSON.stringify(pkCols.map((c) => row[c])),
    [pkCols]
  )

  const sort = activeTab?.sort ?? null
  const filters = activeTab?.filters ?? []
  const filterMode = activeTab?.filterMode ?? 'quick'
  const activeHasFilter =
    filterMode === 'quick' ? filters.length > 0 : filterMode === 'builder' ? !!activeTab?.builderTree : !!activeTab?.customWhere?.trim()
  const filteredCols = useMemo(() => new Set(filters.map((f) => f.column)), [filters])
  const columns: GridColumn[] = useMemo(() => {
    if (!result) return []
    return result.columns.map((c) => {
      const meta = colMeta.get(c.name)
      const key = meta?.autoIncrement ? ' ⚿' : pkCols.includes(c.name) ? ' 🔑' : ''
      const sortMark = sort?.column === c.name ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''
      const filterMark = filteredCols.has(c.name) ? ' ⚑' : ''
      return {
        title: c.name + key + sortMark + filterMark,
        id: c.name,
        width: Math.min(280, Math.max(90, c.name.length * 9 + 90)),
        hasMenu: isTable,
        themeOverride: filteredCols.has(c.name)
          ? { bgHeader: '#33406a', bgHeaderHovered: '#3a4a7a' }
          : undefined
      }
    })
  }, [result, colMeta, pkCols, sort, filteredCols, isTable])

  // Header menu (⋯) opens the per-column quick-filter popover.
  const onHeaderMenuClick = useCallback(
    (col: number, bounds: Rectangle): void => {
      const colName = result?.columns[col]?.name
      if (!colName) return
      setFilterAnchor({ column: colName, x: bounds.x, y: bounds.y + bounds.height })
    },
    [result]
  )

  // Server-side sort: clicking a header cycles asc -> desc -> none, refetching
  // from page 1 (never sorts just the current page's slice).
  const onHeaderClicked = useCallback(
    (col: number): void => {
      if (!isTable) return
      const colName = result?.columns[col]?.name
      if (!colName) return
      if (sort?.column === colName) {
        void setSort(sort.dir === 'asc' ? { column: colName, dir: 'desc' } : null)
      } else {
        void setSort({ column: colName, dir: 'asc' })
      }
    },
    [isTable, result, sort, setSort]
  )

  const getCellContent = useCallback(
    (cell: Item): GridCell => {
      const [col, row] = cell
      const colName = result?.columns[col]?.name ?? ''
      const meta = colMeta.get(colName)
      const isPkCol = pkCols.includes(colName)

      // Existing data row.
      if (row < dataRows) {
        const rowObj = result?.rows[row] ?? {}
        const rowKey = rowKeyOf(rowObj)
        const edited = pending.edits[rowKey]?.changes
        const isDeleted = !!pending.deletes[rowKey]
        const hasEdit = edited && colName in edited
        const raw = hasEdit ? edited[colName] : rowObj[colName]
        const display = toDisplay(raw)
        // Editable existing cell: only when the table has a PK and it isn't a PK column.
        const editable = isTable && hasPk && !isPkCol && !isDeleted
        return {
          kind: GridCellKind.Text,
          data: display,
          displayData: display,
          allowOverlay: editable,
          readonly: !editable,
          themeOverride: isDeleted ? TINT_DELETE : hasEdit ? TINT_EDIT : undefined
        }
      }

      // New (pending insert) rows + trailing empty row.
      const newIdx = row - dataRows
      const nr = pending.newRows[newIdx] as Record<string, unknown> | undefined
      const val = nr?.[colName]
      const isAuto = !!meta?.autoIncrement
      const hasDefault = meta?.default != null && meta?.default !== ''
      let display = toDisplay(val)
      let placeholder = ''
      if (val == null || val === '') {
        if (isAuto) placeholder = '(auto)'
        else if (hasDefault) placeholder = '(default)'
        else if (meta && !meta.nullable) placeholder = 'required'
      }
      return {
        kind: GridCellKind.Text,
        data: display,
        displayData: display || placeholder,
        allowOverlay: isTable && !isAuto,
        readonly: !isTable || isAuto,
        themeOverride: TINT_NEW
      }
    },
    [result, colMeta, pkCols, dataRows, pending, rowKeyOf, isTable, hasPk]
  )

  const onCellEdited = useCallback(
    (cell: Item, newValue: EditableGridCell): void => {
      if (!result || newValue.kind !== GridCellKind.Text) return
      const [col, row] = cell
      const colName = result.columns[col]?.name
      if (!colName) return
      const value = newValue.data

      if (row < dataRows) {
        const rowObj = result.rows[row]
        if (!rowObj || !hasPk) return
        const pk: Record<string, unknown> = {}
        for (const c of pkCols) pk[c] = rowObj[c]
        stageEdit(pk, colName, value)
      } else {
        setNewRowCell(row - dataRows, colName, value)
      }
    },
    [result, dataRows, hasPk, pkCols, stageEdit, setNewRowCell]
  )

  const deleteSelectedRows = useCallback(() => {
    const rows: Record<string, unknown>[] = []
    for (const r of selection.rows) {
      if (r < dataRows && result?.rows[r]) rows.push(result.rows[r])
    }
    if (rows.length > 0) {
      toggleDeleteRows(rows)
      setSelection({ columns: CompactSelection.empty(), rows: CompactSelection.empty() })
    }
  }, [selection, dataRows, result, toggleDeleteRows])

  const pendingCount =
    Object.keys(pending.edits).filter((k) => Object.keys(pending.edits[k].changes).length > 0).length +
    Object.keys(pending.deletes).length +
    pending.newRows.filter((r) => Object.values(r).some((v) => v !== '' && v != null)).length

  if (resultError) return <div className="error-banner">{resultError}</div>
  if (!result) return <div className="empty">Run a query or click a table to see rows here.</div>
  if (!result.hasResultSet)
    return (
      <div className="empty">
        Statement executed. {result.rowCount} row(s) affected in {result.durationMs} ms.
      </div>
    )
  if (result.columns.length === 0) return <div className="empty">Query returned no columns.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {isTable && (
        <div className="crud-toolbar">
          <button className="primary" disabled={pendingCount === 0} onClick={() => void applyChanges()}>
            Apply changes{pendingCount ? ` (${pendingCount})` : ''}
          </button>
          <button disabled={pendingCount === 0} onClick={discardChanges}>
            Discard
          </button>
          <button
            className="danger"
            disabled={!hasPk || selection.rows.length === 0}
            onClick={deleteSelectedRows}
          >
            Delete selected ({selection.rows.length})
          </button>
          {/* Filter mode selector — exactly one active; each keeps its own state. */}
          <span className="filter-modes">
            <span className="pg-hint" style={{ marginRight: 2 }}>Filter:</span>
            {(['quick', 'builder', 'custom'] as const).map((m) => {
              const has = m === 'quick' ? filters.length > 0 : m === 'builder' ? !!activeTab?.builderTree : !!activeTab?.customWhere?.trim()
              const label = m === 'quick' ? 'Quick' : m === 'builder' ? 'Builder' : 'Custom WHERE'
              return (
                <button
                  key={m}
                  className={filterMode === m ? 'primary' : ''}
                  onClick={() => void setFilterMode(m)}
                  title={`${label} filter${has ? ' (has a filter)' : ''}`}
                >
                  {label}
                  {has ? ' •' : ''}
                </button>
              )
            })}
          </span>
          {filterMode === 'builder' && (
            <button onClick={() => setBuilderOpen(true)} title="Edit the visual filter builder (nested AND/OR)">
              Edit builder…
            </button>
          )}
          {filterMode === 'quick' && <span className="pg-hint">column ⋯ menu = quick filter</span>}
          {filterMode !== 'custom' && activeHasFilter && (
            <button className="danger" onClick={() => void clearAllFilters()} title="Clear the active filter">
              Clear ⚑
            </button>
          )}
          <span className="spacer" />
          {gridTable && activeTab?.connectionId && (
            <>
              <button
                onClick={() => openExport(activeTab.connectionId as string, gridTable.schema, gridTable.table, true)}
                title="Export this table (or the current filter result) to CSV/JSON/Excel/SQL"
              >
                Export…
              </button>
              <button
                onClick={() => openImport(activeTab.connectionId as string, gridTable.schema, gridTable.table)}
                title="Import CSV/JSON/Excel into this table"
              >
                Import…
              </button>
            </>
          )}
          {!hasPk && <span className="grid-note-inline">no primary key: rows are read-only (insert only)</span>}
          {crudMessage && <span className={crudMessage.startsWith('❌') ? 'crud-err' : 'crud-ok'}>{crudMessage}</span>}
        </div>
      )}
      {isTable && filterMode === 'custom' && <CustomWhereBar />}
      {!isTable && (
        <div className="grid-note">
          Read-only ad-hoc result (not paginated/filtered — this query runs as you wrote it). Click a table in the tree to
          browse, filter, and edit.
        </div>
      )}
      <div className="grid-area">
        <DataEditor
          columns={columns}
          rows={totalRows}
          getCellContent={getCellContent}
          onCellEdited={isTable ? onCellEdited : undefined}
          onHeaderClicked={onHeaderClicked}
          onHeaderMenuClick={isTable ? onHeaderMenuClick : undefined}
          gridSelection={selection}
          onGridSelectionChange={setSelection}
          rowMarkers={isTable && hasPk ? 'checkbox' : 'number'}
          theme={GRID_THEME}
          width="100%"
          height="100%"
          smoothScrollX
          smoothScrollY
          getCellsForSelection={true}
        />
      </div>
      <PaginationBar />
      {filterAnchor && spec && (
        <ColumnFilterPopover
          anchor={filterAnchor}
          engine={engineOf(activeTab?.connectionId) ?? 'postgres'}
          columns={spec.columns}
          onClose={() => setFilterAnchor(null)}
        />
      )}
      {builderOpen && spec && (
        <FilterBuilder
          engine={engineOf(activeTab?.connectionId) ?? 'postgres'}
          columns={spec.columns}
          onClose={() => setBuilderOpen(false)}
        />
      )}
    </div>
  )
}
