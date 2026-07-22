import { useEffect } from 'react'
import { useStore } from '../store'

/** Right-click menu for the object tree (create/design/drop entry points). */
export function TreeContextMenu(): JSX.Element | null {
  const menu = useStore((s) => s.contextMenu)
  const close = useStore((s) => s.closeContextMenu)
  const openNewTable = useStore((s) => s.openNewTableDesigner)
  const openEditTable = useStore((s) => s.openEditTableDesigner)
  const openObjectOp = useStore((s) => s.openObjectOp)
  const openNewView = useStore((s) => s.openNewView)
  const openViewBuilder = useStore((s) => s.openViewBuilder)
  const openErDiagram = useStore((s) => s.openErDiagram)
  const openNewSequence = useStore((s) => s.openNewSequence)
  const openEditSequence = useStore((s) => s.openEditSequence)
  const openNewTrigger = useStore((s) => s.openNewTrigger)
  const openEditTrigger = useStore((s) => s.openEditTrigger)
  const setTriggerEnabled = useStore((s) => s.setTriggerEnabled)
  const openNewIndex = useStore((s) => s.openNewIndex)
  const openEditIndex = useStore((s) => s.openEditIndex)
  const openExport = useStore((s) => s.openExport)
  const openImport = useStore((s) => s.openImport)
  const openDbDump = useStore((s) => s.openDbDump)
  const openRestore = useStore((s) => s.openRestore)
  const openViewInBuilder = useStore((s) => s.openViewInBuilder)
  const openEditView = useStore((s) => s.openEditView)
  const openNewRoutine = useStore((s) => s.openNewRoutine)
  const openEditRoutine = useStore((s) => s.openEditRoutine)
  const openNewPackage = useStore((s) => s.openNewPackage)
  const openEditPackagePart = useStore((s) => s.openEditPackagePart)
  const openViewData = useStore((s) => s.openViewData)
  const engineOf = useStore((s) => s.engineOf)

  useEffect(() => {
    if (!menu) return
    const onClick = (): void => close()
    window.addEventListener('click', onClick)
    return () => window.removeEventListener('click', onClick)
  }, [menu, close])

  if (!menu) return null
  const { target } = menu

  const items: { label: string; danger?: boolean; divider?: boolean; run: () => void }[] = []
  if (target.kind === 'schema') {
    const isSqlite = engineOf(target.connectionId) === 'sqlite'
    items.push({ label: 'New table…', run: () => openNewTable(target.connectionId, target.schema) })
    items.push({ label: 'New view…', run: () => openNewView(target.connectionId, target.schema) })
    items.push({ label: 'New view (visual builder)…', run: () => openViewBuilder(target.connectionId, target.schema) })
    items.push({ label: 'ER Diagram…', run: () => openErDiagram(target.connectionId, target.schema) })
    if (!isSqlite) {
      items.push({ label: 'New function…', run: () => openNewRoutine(target.connectionId, target.schema, 'function') })
      items.push({ label: 'New procedure…', run: () => openNewRoutine(target.connectionId, target.schema, 'procedure') })
    }
    if (engineOf(target.connectionId) === 'oracle') {
      items.push({ label: 'New package…', run: () => openNewPackage(target.connectionId, target.schema) })
    }
    if (engineOf(target.connectionId) === 'postgres') {
      items.push({ label: 'New sequence…', run: () => openNewSequence(target.connectionId, target.schema) })
    }
    items.push({ label: 'Import / Export', divider: true, run: () => {} })
    items.push({ label: 'Dump database to SQL file…', run: () => openDbDump(target.connectionId, target.schema) })
    items.push({ label: 'Execute SQL file… (restore)', run: () => openRestore(target.connectionId, target.schema) })
  }
  if (target.kind === 'connection' || target.kind === 'schema') {
    items.push({
      label: 'New database / schema…',
      run: () => void openObjectOp(target.connectionId, { kind: 'createSchema', name: '' })
    })
  }
  if (target.kind === 'schema') {
    items.push({
      label: 'Drop schema / database…',
      danger: true,
      run: () => void openObjectOp(target.connectionId, { kind: 'dropSchema', name: target.schema })
    })
  }
  if (target.kind === 'view') {
    items.push({ label: 'Open in Visual Builder…', run: () => void openViewInBuilder(target.connectionId, target.schema, target.name) })
    items.push({ label: 'Edit view…', run: () => void openEditView(target.connectionId, target.schema, target.name) })
    items.push({ label: 'Open view data', run: () => void openViewData(target.connectionId, target.schema, target.name) })
    items.push({
      label: 'Drop view…',
      danger: true,
      run: () => void openObjectOp(target.connectionId, { kind: 'dropView', schema: target.schema, name: target.name })
    })
  }
  if (target.kind === 'routine') {
    items.push({ label: `Edit ${target.routineKind}…`, run: () => void openEditRoutine(target.connectionId, { schema: target.schema, name: target.name, kind: target.routineKind, signature: target.signature }) })
    items.push({
      label: `Drop ${target.routineKind}…`,
      danger: true,
      run: () =>
        void openObjectOp(target.connectionId, {
          kind: 'dropRoutine',
          routineKind: target.routineKind,
          schema: target.schema,
          name: target.name,
          signature: target.signature
        })
    })
  }
  if (target.kind === 'package') {
    items.push({ label: 'Edit spec…', run: () => void openEditPackagePart(target.connectionId, target.schema, target.name, 'packageSpec') })
    items.push({ label: target.hasBody ? 'Edit body…' : 'Create body…', run: () => void openEditPackagePart(target.connectionId, target.schema, target.name, 'packageBody') })
    if (target.hasBody) {
      items.push({
        label: 'Drop body…',
        danger: true,
        run: () => void openObjectOp(target.connectionId, { kind: 'dropPackageBody', schema: target.schema, name: target.name })
      })
    }
    items.push({
      label: 'Drop package…',
      danger: true,
      run: () => void openObjectOp(target.connectionId, { kind: 'dropPackage', schema: target.schema, name: target.name })
    })
  }
  if (target.kind === 'sequence') {
    items.push({ label: 'Edit sequence…', run: () => void openEditSequence(target.connectionId, target.schema, target.name) })
    items.push({
      label: 'Drop sequence…',
      danger: true,
      run: () => void openObjectOp(target.connectionId, { kind: 'dropSequence', schema: target.schema, name: target.name })
    })
  }
  if (target.kind === 'triggersCat') {
    items.push({ label: 'New trigger…', run: () => openNewTrigger(target.connectionId, target.schema, target.table) })
  }
  if (target.kind === 'trigger') {
    items.push({ label: 'Edit trigger…', run: () => void openEditTrigger(target.connectionId, target.schema, target.table, target.name) })
    // Oracle + SQL Server: enable/disable is a real feature these engines have.
    if ((engineOf(target.connectionId) === 'oracle' || engineOf(target.connectionId) === 'mssql') && target.enabled !== undefined) {
      items.push({
        label: target.enabled ? 'Disable trigger' : 'Enable trigger',
        run: () => void setTriggerEnabled(target.connectionId, target.schema, target.table, target.name, !target.enabled)
      })
    }
    items.push({
      label: 'Drop trigger…',
      danger: true,
      run: () => void openObjectOp(target.connectionId, { kind: 'dropTrigger', schema: target.schema, table: target.table, name: target.name })
    })
  }
  if (target.kind === 'indexesCat') {
    items.push({ label: 'New index…', run: () => openNewIndex(target.connectionId, target.schema, target.table) })
  }
  if (target.kind === 'index') {
    if (target.constraintBacked) {
      items.push({ label: 'Read-only (constraint-backed / auto index)', run: () => {} })
      items.push({ label: 'Drop the constraint via the Table Designer', run: () => {} })
    } else {
      items.push({ label: 'Edit index…', run: () => openEditIndex(target.connectionId, target.schema, target.table, target.name) })
      items.push({
        label: 'Drop index…',
        danger: true,
        run: () => void openObjectOp(target.connectionId, { kind: 'dropIndex', schema: target.schema, table: target.table, name: target.name })
      })
    }
  }
  if (target.kind === 'table') {
    items.push({ label: 'Design table…', run: () => void openEditTable(target.connectionId, target.schema, target.table) })
    items.push({ label: 'Export…', run: () => openExport(target.connectionId, target.schema, target.table, false) })
    items.push({ label: 'Dump table to SQL…', run: () => openExport(target.connectionId, target.schema, target.table, false, 'sql') })
    items.push({ label: 'Import…', run: () => openImport(target.connectionId, target.schema, target.table) })
    items.push({ label: 'New index…', run: () => openNewIndex(target.connectionId, target.schema, target.table) })
    items.push({ label: 'New trigger…', run: () => openNewTrigger(target.connectionId, target.schema, target.table) })
    items.push({
      label: 'Rename table…',
      run: () =>
        void openObjectOp(target.connectionId, {
          kind: 'renameTable',
          schema: target.schema,
          table: target.table,
          newName: target.table
        })
    })
    items.push({
      label: 'Truncate…',
      danger: true,
      run: () =>
        void openObjectOp(target.connectionId, { kind: 'truncateTable', schema: target.schema, table: target.table })
    })
    items.push({
      label: 'Drop table…',
      danger: true,
      run: () => void openObjectOp(target.connectionId, { kind: 'dropTable', schema: target.schema, table: target.table })
    })
  }

  return (
    <div className="context-menu" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
      {items.map((it, i) =>
        it.divider ? (
          <div key={i} className="context-divider">{it.label}</div>
        ) : (
          <div
            key={i}
            className={'context-item' + (it.danger ? ' danger' : '')}
            onClick={() => {
              it.run()
              close()
            }}
          >
            {it.label}
          </div>
        )
      )}
    </div>
  )
}
