import CodeMirror from '@uiw/react-codemirror'
import { sql } from '@codemirror/lang-sql'
import { useStore, buildObjectStatements } from '../store'

/** Editor tab for a VIEW (name + SELECT) or a FUNCTION/PROCEDURE (full CREATE). */
export function ObjectEditor(): JSX.Element {
  const tab = useStore((s) => s.getActiveTab())
  const engineOf = useStore((s) => s.engineOf)
  const setObjectEditor = useStore((s) => s.setObjectEditor)
  const applyObjectEditor = useStore((s) => s.applyObjectEditor)

  if (!tab?.objectEditor) return <div className="empty">No object open.</div>
  const oe = tab.objectEditor
  const engine = engineOf(tab.connectionId) ?? 'postgres'
  const isView = oe.objKind === 'view'
  const { statements, destructive } = buildObjectStatements(engine, oe)
  const canApply = !oe.applying && (!destructive || oe.confirmed)
  const set = (patch: Parameters<typeof setObjectEditor>[1]): void => setObjectEditor(tab.id, patch)

  return (
    <div className="obj-editor">
      <div className="obj-toolbar">
        <span className="obj-kind">{oe.mode === 'new' ? 'NEW' : 'EDIT'} {oe.objKind}</span>
        {isView && (
          <>
            <label className="obj-field">
              name
              <input value={oe.name} onChange={(e) => set({ name: e.target.value })} disabled={oe.mode === 'edit' && engine === 'sqlite' ? false : oe.mode === 'edit'} />
            </label>
            {engine !== 'sqlite' && (
              <label className="param-check">
                <input type="checkbox" checked={oe.orReplace} onChange={(e) => set({ orReplace: e.target.checked })} /> OR REPLACE
              </label>
            )}
          </>
        )}
        <span className="obj-note">
          {isView
            ? 'View body = the SELECT statement'
            : engine === 'mysql'
              ? "Full CREATE. Editing does DROP + CREATE (MySQL routines have no OR REPLACE). Bodies with ';' are sent as one statement."
              : 'Full CREATE OR REPLACE statement.'}
        </span>
        <span className="spacer" />
        <button className="primary" onClick={() => void applyObjectEditor(tab.id)} disabled={!canApply}>
          {oe.applying ? 'Applying…' : 'Apply'}
        </button>
      </div>

      <div className="obj-body">
        <CodeMirror
          value={oe.body}
          theme="dark"
          extensions={[sql()]}
          onChange={(v) => set({ body: v })}
          basicSetup={{ lineNumbers: true, foldGutter: false, autocompletion: true }}
        />
      </div>

      <div className="obj-preview">
        <div className="section-title" style={{ marginTop: 0 }}>Statements to run</div>
        <pre className="ddl-pre">{statements.join(';\n\n') + ';'}</pre>
        {destructive && (
          <label className="param-check ddl-danger" style={{ display: 'flex', gap: 6 }}>
            <input type="checkbox" checked={oe.confirmed} onChange={(e) => set({ confirmed: e.target.checked })} />
            confirm: this DROPs then re-CREATEs the {oe.objKind}
          </label>
        )}
        {oe.message && <div className={'msg ' + (oe.message.startsWith('❌') || oe.message.startsWith('⚠') ? 'err' : 'ok')}>{oe.message}</div>}
      </div>
    </div>
  )
}
