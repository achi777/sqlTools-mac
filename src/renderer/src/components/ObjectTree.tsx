import type { IndexInfo, RoutineRef, SequenceRef, TableRef, TriggerRef, ViewRef } from '@shared/types'
import { useStore, type ObjCategory } from '../store'

export function ObjectTree(): JSX.Element {
  const activeTab = useStore((s) => s.getActiveTab())
  const connectedIds = useStore((s) => s.connectedIds)
  const treeByConn = useStore((s) => s.treeByConn)
  const toggleSchema = useStore((s) => s.toggleSchema)
  const toggleCategory = useStore((s) => s.toggleCategory)
  const openTable = useStore((s) => s.openTable)
  const openEditView = useStore((s) => s.openEditView)
  const openEditRoutine = useStore((s) => s.openEditRoutine)
  const openEditSequence = useStore((s) => s.openEditSequence)
  const toggleTableExpand = useStore((s) => s.toggleTableExpand)
  const toggleTableTriggers = useStore((s) => s.toggleTableTriggers)
  const openEditTrigger = useStore((s) => s.openEditTrigger)
  const toggleTableIndexes = useStore((s) => s.toggleTableIndexes)
  const openEditIndex = useStore((s) => s.openEditIndex)
  const refreshCatalog = useStore((s) => s.refreshCatalog)
  const loadSchemas = useStore((s) => s.loadSchemas)
  const engineOf = useStore((s) => s.engineOf)
  const openContextMenu = useStore((s) => s.openContextMenu)

  const connId = activeTab?.connectionId ?? null
  const isConnected = !!connId && connectedIds.includes(connId)
  const tree = connId ? treeByConn[connId] : undefined
  const gridTable = activeTab?.gridTable ?? null
  const engine = engineOf(connId)
  const isSqlite = engine === 'sqlite'
  const isPostgres = engine === 'postgres'

  const catRow = (schema: string, cat: ObjCategory, label: string, count: number): JSX.Element => {
    const key = `${schema}::${cat}`
    const open = tree?.expandedCats.includes(key) ?? false
    return (
      <div
        className="tree-node category"
        onClick={() => connId && void toggleCategory(connId, schema, cat)}
        onContextMenu={(e) => {
          e.preventDefault()
          if (connId) openContextMenu({ x: e.clientX, y: e.clientY, target: { kind: 'schema', connectionId: connId, schema } })
        }}
      >
        {open ? '▾' : '▸'} {label} <span className="tree-count">{count || ''}</span>
      </div>
    )
  }

  return (
    <div className="panel">
      <div className="panel-header" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>Objects</span>
        {isConnected && connId && (
          <span
            className="refresh-link"
            title="Refresh schema (tree + autocomplete)"
            onClick={() => {
              void loadSchemas(connId)
              void refreshCatalog(connId)
            }}
          >
            ⟳
          </span>
        )}
      </div>
      {!isConnected ? (
        <div className="empty">Connect a database (pick one for this tab) to browse objects.</div>
      ) : !tree || tree.schemas.length === 0 ? (
        <div className="empty">No schemas found.</div>
      ) : (
        <div>
          {tree.schemas.map((schema) => {
            const isOpen = tree.expanded.includes(schema)
            const tables: TableRef[] = tree.tablesBySchema[schema] ?? []
            const views: ViewRef[] = tree.viewsBySchema[schema] ?? []
            const functions: RoutineRef[] = tree.functionsBySchema[schema] ?? []
            const procedures: RoutineRef[] = tree.proceduresBySchema[schema] ?? []
            const sequences: SequenceRef[] = tree.sequencesBySchema[schema] ?? []
            const viewsOpen = tree.expandedCats.includes(`${schema}::views`)
            const fnsOpen = tree.expandedCats.includes(`${schema}::functions`)
            const procsOpen = tree.expandedCats.includes(`${schema}::procedures`)
            const seqsOpen = tree.expandedCats.includes(`${schema}::sequences`)
            return (
              <div key={schema}>
                <div
                  className="tree-node schema"
                  onClick={() => connId && void toggleSchema(connId, schema)}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    if (connId) openContextMenu({ x: e.clientX, y: e.clientY, target: { kind: 'schema', connectionId: connId, schema } })
                  }}
                  title={schema}
                >
                  {isOpen ? '▾' : '▸'} {schema}
                </div>
                {isOpen && (
                  <>
                    {tables.map((t) => {
                      const selected = gridTable && gridTable.schema === t.schema && gridTable.table === t.name
                      const tExpanded = tree.expandedTables.includes(`${schema}::${t.name}`)
                      const trigsOpen = tree.expandedCats.includes(`${schema}::${t.name}::triggers`)
                      const triggers: TriggerRef[] = tree.triggersByTable[`${schema}::${t.name}`] ?? []
                      const idxOpen = tree.expandedCats.includes(`${schema}::${t.name}::indexes`)
                      const indexes: IndexInfo[] = tree.indexesByTable[`${schema}::${t.name}`] ?? []
                      return (
                        <div key={'t.' + t.name}>
                          <div
                            className={'tree-node table' + (selected ? ' selected' : '')}
                            onClick={() => void openTable(t)}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              if (connId) openContextMenu({ x: e.clientX, y: e.clientY, target: { kind: 'table', connectionId: connId, schema: t.schema, table: t.name } })
                            }}
                            title={`${t.name} (${t.type})`}
                          >
                            <span
                              className="tree-caret"
                              title="Show triggers"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (connId) toggleTableExpand(connId, schema, t.name)
                              }}
                            >
                              {tExpanded ? '▾' : '▸'}
                            </span>
                            {t.type === 'view' ? '◇' : '▦'} {t.name}
                          </div>
                          {tExpanded && (
                            <>
                              <div
                                className="tree-node category tree-sub"
                                onClick={() => connId && void toggleTableTriggers(connId, schema, t.name)}
                                onContextMenu={(e) => {
                                  e.preventDefault()
                                  if (connId) openContextMenu({ x: e.clientX, y: e.clientY, target: { kind: 'triggersCat', connectionId: connId, schema, table: t.name } })
                                }}
                              >
                                {trigsOpen ? '▾' : '▸'} Triggers <span className="tree-count">{triggers.length || ''}</span>
                              </div>
                              {trigsOpen &&
                                triggers.map((tr) => (
                                  <div
                                    key={'tr.' + tr.name}
                                    className="tree-node object tree-sub2"
                                    onClick={() => connId && void openEditTrigger(connId, schema, t.name, tr.name)}
                                    onContextMenu={(e) => {
                                      e.preventDefault()
                                      if (connId) openContextMenu({ x: e.clientX, y: e.clientY, target: { kind: 'trigger', connectionId: connId, schema, table: t.name, name: tr.name } })
                                    }}
                                    title={`${tr.timing} ${tr.event} on ${t.name}`}
                                  >
                                    ⚡ {tr.name} <span className="tree-sig">{tr.timing} {tr.event}</span>
                                  </div>
                                ))}
                              <div
                                className="tree-node category tree-sub"
                                onClick={() => connId && void toggleTableIndexes(connId, schema, t.name)}
                                onContextMenu={(e) => {
                                  e.preventDefault()
                                  if (connId) openContextMenu({ x: e.clientX, y: e.clientY, target: { kind: 'indexesCat', connectionId: connId, schema, table: t.name } })
                                }}
                              >
                                {idxOpen ? '▾' : '▸'} Indexes <span className="tree-count">{indexes.length || ''}</span>
                              </div>
                              {idxOpen &&
                                indexes.map((ix) => (
                                  <div
                                    key={'ix.' + ix.name}
                                    className={'tree-node object tree-sub2' + (ix.constraintBacked ? ' muted' : '')}
                                    onClick={() => connId && !ix.constraintBacked && openEditIndex(connId, schema, t.name, ix.name)}
                                    onContextMenu={(e) => {
                                      e.preventDefault()
                                      if (connId) openContextMenu({ x: e.clientX, y: e.clientY, target: { kind: 'index', connectionId: connId, schema, table: t.name, name: ix.name, constraintBacked: ix.constraintBacked } })
                                    }}
                                    title={`${ix.constraintBacked ? '(constraint-backed, read-only) ' : ''}${ix.unique ? 'UNIQUE ' : ''}(${ix.columns.join(', ')})`}
                                  >
                                    {ix.constraintBacked ? '🔒' : '⊟'} {ix.name}
                                    <span className="tree-sig">{ix.unique ? 'U ' : ''}({ix.columns.join(', ')})</span>
                                  </div>
                                ))}
                            </>
                          )}
                        </div>
                      )
                    })}

                    {/* Views */}
                    {catRow(schema, 'views', 'Views', views.length)}
                    {viewsOpen &&
                      views.map((v) => (
                        <div
                          key={'v.' + v.name}
                          className="tree-node object"
                          onClick={() => connId && void openEditView(connId, schema, v.name)}
                          onContextMenu={(e) => {
                            e.preventDefault()
                            if (connId) openContextMenu({ x: e.clientX, y: e.clientY, target: { kind: 'view', connectionId: connId, schema, name: v.name } })
                          }}
                          title={`View ${v.name}`}
                        >
                          ◇ {v.name}
                        </div>
                      ))}

                    {/* Functions / Procedures */}
                    {isSqlite ? (
                      <div className="tree-node muted" title="SQLite has no stored routines">
                        Functions / Procedures — n/a (SQLite)
                      </div>
                    ) : (
                      <>
                        {catRow(schema, 'functions', 'Functions', functions.length)}
                        {fnsOpen &&
                          functions.map((f) => (
                            <div
                              key={'f.' + f.name}
                              className="tree-node object"
                              onClick={() => connId && void openEditRoutine(connId, f)}
                              onContextMenu={(e) => {
                                e.preventDefault()
                                if (connId) openContextMenu({ x: e.clientX, y: e.clientY, target: { kind: 'routine', connectionId: connId, schema, name: f.name, routineKind: 'function', signature: f.signature } })
                              }}
                              title={`${f.name}${f.signature ?? ''}`}
                            >
                              ƒ {f.name}
                              <span className="tree-sig">{f.signature}</span>
                            </div>
                          ))}
                        {catRow(schema, 'procedures', 'Procedures', procedures.length)}
                        {procsOpen &&
                          procedures.map((p) => (
                            <div
                              key={'p.' + p.name}
                              className="tree-node object"
                              onClick={() => connId && void openEditRoutine(connId, p)}
                              onContextMenu={(e) => {
                                e.preventDefault()
                                if (connId) openContextMenu({ x: e.clientX, y: e.clientY, target: { kind: 'routine', connectionId: connId, schema, name: p.name, routineKind: 'procedure', signature: p.signature } })
                              }}
                              title={p.name}
                            >
                              ▷ {p.name}
                            </div>
                          ))}
                      </>
                    )}

                    {/* Sequences (PostgreSQL only) */}
                    {isPostgres ? (
                      <>
                        {catRow(schema, 'sequences', 'Sequences', sequences.length)}
                        {seqsOpen &&
                          sequences.map((sq) => (
                            <div
                              key={'sq.' + sq.name}
                              className="tree-node object"
                              onClick={() => connId && void openEditSequence(connId, schema, sq.name)}
                              onContextMenu={(e) => {
                                e.preventDefault()
                                if (connId) openContextMenu({ x: e.clientX, y: e.clientY, target: { kind: 'sequence', connectionId: connId, schema, name: sq.name } })
                              }}
                              title={`Sequence ${sq.name}`}
                            >
                              ⑆ {sq.name}
                            </div>
                          ))}
                      </>
                    ) : (
                      <div
                        className="tree-node muted"
                        title={engine === 'mysql' ? 'MySQL uses AUTO_INCREMENT' : 'SQLite has no standalone sequences'}
                      >
                        Sequences — n/a ({engine === 'mysql' ? 'MySQL AUTO_INCREMENT' : 'SQLite'})
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
