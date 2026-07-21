import { useStore } from '../store'
import { buildAlterSequence, buildCreateSequence } from '@shared/sequenceDdl'
import type { SequenceSpec } from '@shared/types'

const DATA_TYPES = ['smallint', 'integer', 'bigint']

/** Form-based editor for a PostgreSQL sequence (create / alter incl. RESTART). */
export function SequenceEditor(): JSX.Element {
  const tab = useStore((s) => s.getActiveTab())
  const setSequenceEditor = useStore((s) => s.setSequenceEditor)
  const applySequenceEditor = useStore((s) => s.applySequenceEditor)
  const openObjectOp = useStore((s) => s.openObjectOp)

  if (!tab?.sequenceEditor) return <div className="empty">No sequence open.</div>
  const se = tab.sequenceEditor
  const spec = se.spec
  const isEdit = se.mode === 'edit'

  const patchSpec = (p: Partial<SequenceSpec>): void =>
    setSequenceEditor(tab.id, { spec: { ...spec, ...p }, message: null })

  // Live DDL preview (safe against invalid numeric input).
  let previewSql = ''
  let previewErr: string | null = null
  try {
    const preview = isEdit ? buildAlterSequence(spec, se.original as SequenceSpec) : buildCreateSequence(spec)
    previewSql = preview.sql || '-- no changes'
  } catch (err) {
    previewErr = (err as Error).message
  }

  const num = (label: string, value: string, onChange: (v: string) => void, ph?: string): JSX.Element => (
    <label className="seq-field">
      <span>{label}</span>
      <input value={value} inputMode="numeric" placeholder={ph} onChange={(e) => onChange(e.target.value)} />
    </label>
  )

  return (
    <div className="seq-editor">
      <div className="seq-toolbar">
        <span className="obj-kind">{isEdit ? 'EDIT' : 'NEW'} sequence</span>
        <label className="seq-field">
          <span>name</span>
          <input value={spec.name} onChange={(e) => patchSpec({ name: e.target.value })} />
        </label>
        <span className="spacer" />
        {isEdit && (
          <button
            className="danger-btn"
            onClick={() => void openObjectOp(tab.connectionId as string, { kind: 'dropSequence', schema: spec.schema, name: spec.originalName ?? spec.name })}
            title="Drop this sequence"
          >
            Drop…
          </button>
        )}
        <button className="primary" disabled={se.applying || !!previewErr} onClick={() => void applySequenceEditor(tab.id)}>
          {se.applying ? 'Applying…' : isEdit ? 'Apply changes' : 'Create sequence'}
        </button>
      </div>

      <div className="seq-body">
        <div className="seq-form">
          <label className="seq-field">
            <span>data type</span>
            <select value={spec.dataType} onChange={(e) => patchSpec({ dataType: e.target.value })}>
              {DATA_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          {num('increment', spec.increment, (v) => patchSpec({ increment: v }))}
          {num('start', spec.start, (v) => patchSpec({ start: v }))}
          {num('min value', spec.minValue ?? '', (v) => patchSpec({ minValue: v.trim() === '' ? null : v }), 'NO MINVALUE')}
          {num('max value', spec.maxValue ?? '', (v) => patchSpec({ maxValue: v.trim() === '' ? null : v }), 'NO MAXVALUE')}
          {num('cache', spec.cache, (v) => patchSpec({ cache: v }))}
          <label className="param-check">
            <input type="checkbox" checked={spec.cycle} onChange={(e) => patchSpec({ cycle: e.target.checked })} /> CYCLE
          </label>
          <label className="seq-field">
            <span>owned by (schema.table.column)</span>
            <input
              value={spec.ownedBy ?? ''}
              placeholder="none"
              onChange={(e) => patchSpec({ ownedBy: e.target.value.trim() === '' ? null : e.target.value })}
            />
          </label>
          {isEdit && (
            <label className="seq-field seq-restart">
              <span>RESTART with (optional)</span>
              <input
                value={spec.restart ?? ''}
                inputMode="numeric"
                placeholder="leave blank to keep the counter"
                onChange={(e) => patchSpec({ restart: e.target.value.trim() === '' ? null : e.target.value })}
              />
            </label>
          )}
        </div>

        <div className="seq-side">
          {isEdit && se.details && (
            <div className="seq-details">
              <div className="section-title" style={{ marginTop: 0 }}>Current state</div>
              <div className="seq-detail-row"><span>last value</span><b>{se.details.lastValue ?? '— (unused)'}</b></div>
              <div className="seq-detail-row"><span>owned by</span><b>{se.details.ownedBy ?? '— (none)'}</b></div>
            </div>
          )}
          <div className="section-title">Statements to run</div>
          <pre className="ddl-pre">{previewErr ? `-- ${previewErr}` : previewSql}</pre>
          {previewErr && <div className="ddl-danger">⚠ {previewErr}</div>}
          {se.message && (
            <div className={'msg ' + (se.message.startsWith('❌') ? 'err' : 'ok')}>{se.message}</div>
          )}
        </div>
      </div>
    </div>
  )
}
