import { useEffect } from 'react'
import { ConnectionManager } from './components/ConnectionManager'
import { ObjectTree } from './components/ObjectTree'
import { EditorTabs } from './components/EditorTabs'
import { QueryWorkspace } from './components/QueryWorkspace'
import { TableDesigner } from './components/TableDesigner'
import { ObjectEditor } from './components/ObjectEditor'
import { ViewBuilder } from './components/ViewBuilder'
import { ErDiagram } from './components/ErDiagram'
import { SequenceEditor } from './components/SequenceEditor'
import { TriggerEditor } from './components/TriggerEditor'
import { IndexEditor } from './components/IndexEditor'
import { HistoryPanel } from './components/HistoryPanel'
import { TreeContextMenu } from './components/TreeContextMenu'
import { ObjectOpDialog } from './components/ObjectOpDialog'
import { ExportDialog } from './components/ExportDialog'
import { ImportWizard } from './components/ImportWizard'
import { DbDumpDialog } from './components/DbDumpDialog'
import { RestoreDialog } from './components/RestoreDialog'
import { useStore } from './store'

export default function App(): JSX.Element {
  const init = useStore((s) => s.init)
  const ready = useStore((s) => s.ready)
  const activeTab = useStore((s) => s.getActiveTab())
  const connections = useStore((s) => s.connections)
  const defaults = useStore((s) => s.defaults)

  useEffect(() => {
    void init()
  }, [init])

  const result = activeTab?.result ?? null
  const statusMessage = activeTab?.statusMessage ?? null
  const activeName =
    [...connections, ...defaults].find((c) => c.id === activeTab?.connectionId)?.name ?? '—'
  const isDesigner = activeTab?.kind === 'designer'
  const isObject = activeTab?.kind === 'object'
  const isViewBuilder = activeTab?.kind === 'viewbuilder'
  const isErDiagram = activeTab?.kind === 'erdiagram'
  const isSequence = activeTab?.kind === 'sequence'
  const isTrigger = activeTab?.kind === 'trigger'
  const isIndex = activeTab?.kind === 'index'

  if (!ready) return <div className="empty">Loading…</div>

  return (
    <div className="app">
      <ConnectionManager />
      <ObjectTree />
      <div className="main">
        <EditorTabs />
        {isDesigner ? (
          <TableDesigner />
        ) : isObject ? (
          <ObjectEditor />
        ) : isViewBuilder ? (
          <ViewBuilder />
        ) : isErDiagram ? (
          <ErDiagram />
        ) : isSequence ? (
          <SequenceEditor />
        ) : isTrigger ? (
          <TriggerEditor />
        ) : isIndex ? (
          <IndexEditor />
        ) : (
          <QueryWorkspace />
        )}
      </div>
      <HistoryPanel />
      <TreeContextMenu />
      <ObjectOpDialog />
      <ExportDialog />
      <ImportWizard />
      <DbDumpDialog />
      <RestoreDialog />
      <div className="statusbar">
        <span>Connection: {activeName}</span>
        {!isDesigner && result && result.hasResultSet && (
          <span>
            {result.rowCount} rows · {result.durationMs} ms
          </span>
        )}
        <span className="spacer" />
        {statusMessage && <span>{statusMessage}</span>}
      </div>
    </div>
  )
}
