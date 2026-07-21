import { useEffect, useState } from 'react'
import type { ConnectionConfig, Engine, SafeConnectionConfig } from '@shared/types'
import { useStore } from '../store'

const ENGINE_PORTS: Record<Engine, number | undefined> = {
  postgres: 5432,
  mysql: 3306,
  sqlite: undefined
}

function blankForm(): ConnectionConfig {
  return {
    id: '',
    name: '',
    engine: 'postgres',
    host: 'localhost',
    port: 5432,
    user: 'dbtool',
    password: 'dbtool',
    database: 'dbtool_dev'
  }
}

export function ConnectionManager(): JSX.Element {
  const connections = useStore((s) => s.connections)
  const activeTab = useStore((s) => s.getActiveTab())
  const activeId = activeTab?.connectionId ?? null
  const connectedIds = useStore((s) => s.connectedIds)
  const refreshConnections = useStore((s) => s.refreshConnections)
  const connect = useStore((s) => s.useConnectionInActiveTab)
  const disconnect = useStore((s) => s.disconnect)
  const setTabConnection = useStore((s) => s.setTabConnection)
  const saveConnection = useStore((s) => s.saveConnection)
  const deleteConnection = useStore((s) => s.deleteConnection)

  const [showForm, setShowForm] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<ConnectionConfig>(blankForm())
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [confirmDel, setConfirmDel] = useState<SafeConnectionConfig | null>(null)

  useEffect(() => {
    void refreshConnections()
  }, [refreshConnections])

  // Every default is seeded as a real saved connection in main, so the list is
  // simply the saved connections — all with the same action set.
  const shown = connections

  function update<K extends keyof ConnectionConfig>(key: K, value: ConnectionConfig[K]): void {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function onEngineChange(engine: Engine): void {
    setForm((f) => ({ ...f, engine, port: ENGINE_PORTS[engine] ?? f.port }))
  }

  function startAdd(): void {
    setForm({ ...blankForm(), id: `conn-${Date.now()}` })
    setIsEditing(false)
    setTestMsg(null)
    setShowForm(true)
  }

  // Edit an existing connection: prefill everything except the password (which
  // the renderer never receives — blank means "keep the stored one").
  function startEdit(c: SafeConnectionConfig): void {
    setForm({ ...blankForm(), ...c, password: '' })
    setIsEditing(true)
    setTestMsg(null)
    setShowForm(true)
  }

  async function onTest(): Promise<void> {
    setTesting(true)
    setTestMsg(null)
    const res = await window.dbApi.testConnection(form)
    setTesting(false)
    setTestMsg({ ok: res.ok, text: res.message ?? (res.ok ? 'OK' : 'Failed') })
  }

  async function onSave(): Promise<void> {
    if (!form.name.trim()) {
      setTestMsg({ ok: false, text: 'Name is required' })
      return
    }
    const wasConnected = connectedIds.includes(form.id)
    const saved = await saveConnection(form)
    if (!saved) {
      setTestMsg({ ok: false, text: 'Save failed' })
      return
    }
    setShowForm(false)
    if (isEditing) {
      // Apply new settings on the next Connect (disconnect the live session).
      if (wasConnected) await disconnect(saved.id)
    } else if (activeTab) {
      setTabConnection(activeTab.id, saved.id)
    }
    setIsEditing(false)
  }

  async function doDelete(id: string): Promise<void> {
    await deleteConnection(id) // store/main disconnects if live + removes from userData
    setConfirmDel(null)
  }

  async function onRowClick(c: SafeConnectionConfig): Promise<void> {
    if (!connectedIds.includes(c.id)) await connect(c.id)
    else if (activeTab) setTabConnection(activeTab.id, c.id)
  }

  return (
    <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">Connections</div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {shown.map((c) => {
          const isConnected = connectedIds.includes(c.id)
          return (
            <div
              key={c.id}
              className={'conn-item' + (activeId === c.id ? ' active' : '')}
              onClick={() => void onRowClick(c)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={`badge ${c.engine}`}>{c.engine}</span>
                <span className="conn-name">{c.name}</span>
                {isConnected && <span className="badge dot-ok">on</span>}
              </div>
              <div className="conn-meta">
                {c.engine === 'sqlite' ? c.filePath : `${c.host}:${c.port}/${c.database} — ${c.user}`}
              </div>
              {/* Identical actions for every connection, every engine. */}
              <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                {isConnected ? (
                  <button onClick={() => void disconnect(c.id)}>Disconnect</button>
                ) : (
                  <button className="primary" onClick={() => void connect(c.id)}>
                    Connect
                  </button>
                )}
                <button onClick={() => startEdit(c)}>Edit</button>
                <button className="danger" onClick={() => setConfirmDel(c)}>
                  Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ padding: 8, borderTop: '1px solid var(--border)' }}>
        {!showForm ? (
          <button className="primary" style={{ width: '100%' }} onClick={startAdd}>
            + Add connection
          </button>
        ) : (
          <div className="form-wrap" style={{ padding: 0 }}>
            <div className="section-title">{isEditing ? 'Edit connection' : 'New connection'}</div>
            <div className="field">
              <label>Name</label>
              <input value={form.name} onChange={(e) => update('name', e.target.value)} />
            </div>
            <div className="field">
              <label>Engine</label>
              <select value={form.engine} onChange={(e) => onEngineChange(e.target.value as Engine)}>
                <option value="postgres">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="sqlite">SQLite</option>
              </select>
            </div>

            {form.engine === 'sqlite' ? (
              <div className="field">
                <label>File path</label>
                <input
                  value={form.filePath ?? ''}
                  placeholder="C:\\path\\to\\db.sqlite"
                  onChange={(e) => update('filePath', e.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="field">
                  <label>Host</label>
                  <input value={form.host ?? ''} onChange={(e) => update('host', e.target.value)} />
                </div>
                <div className="field">
                  <label>Port</label>
                  <input
                    type="number"
                    value={form.port ?? ''}
                    onChange={(e) => update('port', Number(e.target.value))}
                  />
                </div>
                <div className="field">
                  <label>User</label>
                  <input value={form.user ?? ''} onChange={(e) => update('user', e.target.value)} />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input
                    type="password"
                    value={form.password ?? ''}
                    placeholder={isEditing ? 'leave blank to keep current' : ''}
                    onChange={(e) => update('password', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Database</label>
                  <input value={form.database ?? ''} onChange={(e) => update('database', e.target.value)} />
                </div>
              </>
            )}

            <div className="row-actions">
              <button onClick={() => void onTest()} disabled={testing}>
                {testing ? 'Testing…' : 'Test connection'}
              </button>
              <button className="primary" onClick={() => void onSave()}>
                Save
              </button>
              <button onClick={() => { setShowForm(false); setIsEditing(false) }}>Cancel</button>
            </div>
            {testMsg && <div className={'msg ' + (testMsg.ok ? 'ok' : 'err')}>{testMsg.text}</div>}
          </div>
        )}
      </div>

      {confirmDel && (
        <div className="modal-backdrop" onClick={() => setConfirmDel(null)}>
          <div className="modal" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Delete connection</div>
            <p style={{ fontSize: 12, lineHeight: 1.5 }}>
              Delete saved connection “<b>{confirmDel.name}</b>”? This only removes it from DB&nbsp;Tool and does{' '}
              <b>not</b> affect the database.
            </p>
            <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmDel(null)}>Cancel</button>
              <button className="danger-btn" onClick={() => void doDelete(confirmDel.id)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
