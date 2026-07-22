// Persistence for saved connections. Stored as JSON in Electron's userData
// dir — NEVER in the repo. Passwords are stored here in plaintext for THIS
// slice only.
//
// TODO(security): move passwords out of this JSON file into the OS keychain
// (e.g. keytar / safeStorage) before this is anything more than a dev slice.
import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ConnectionConfig, ErLayout, PersistedTabs, SafeConnectionConfig, UiState } from '@shared/types'

function storePath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'connections.json')
}

export function stripSecret(c: ConnectionConfig): SafeConnectionConfig {
  const { password: _password, ...rest } = c
  return rest
}

export function loadConnections(): ConnectionConfig[] {
  const p = storePath()
  if (!existsSync(p)) return []
  try {
    const raw = readFileSync(p, 'utf-8')
    const parsed = JSON.parse(raw) as ConnectionConfig[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveAll(list: ConnectionConfig[]): void {
  writeFileSync(storePath(), JSON.stringify(list, null, 2), 'utf-8')
}

export function upsertConnection(config: ConnectionConfig): ConnectionConfig {
  const list = loadConnections()
  const idx = list.findIndex((c) => c.id === config.id)
  if (idx >= 0) list[idx] = config
  else list.push(config)
  saveAll(list)
  return config
}

export function deleteConnection(id: string): void {
  const list = loadConnections().filter((c) => c.id !== id)
  saveAll(list)
}

/**
 * Persist any pre-seeded default that isn't already saved, so every connection
 * in the manager is a first-class saved entry with the same actions (edit,
 * delete). Existing/edited entries are left untouched. A default the user
 * deletes will re-appear on next launch (built-ins stay "intact").
 */
export function seedMissingDefaults(defaults: ConnectionConfig[]): void {
  const list = loadConnections()
  const ids = new Set(list.map((c) => c.id))
  let changed = false
  for (const d of defaults) {
    if (!ids.has(d.id)) {
      list.push(d)
      changed = true
    }
  }
  if (changed) saveAll(list)
}

export function getConnection(id: string): ConnectionConfig | undefined {
  return loadConnections().find((c) => c.id === id)
}

// --- Editor tab persistence (SQL text + metadata only; never result rows) -----

function tabsPath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'tabs.json')
}

export function loadTabs(): PersistedTabs {
  const p = tabsPath()
  if (!existsSync(p)) return { tabs: [], activeTabId: null }
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf-8')) as PersistedTabs
    if (!parsed || !Array.isArray(parsed.tabs)) return { tabs: [], activeTabId: null }
    return parsed
  } catch {
    return { tabs: [], activeTabId: null }
  }
}

export function saveTabs(data: PersistedTabs): void {
  writeFileSync(tabsPath(), JSON.stringify(data, null, 2), 'utf-8')
}

// --- UI/layout preferences (sidebar collapsed, …) -----------------------------

function uiPath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'ui.json')
}

export function loadUiState(): UiState {
  const p = uiPath()
  const dflt: UiState = { sidebarCollapsed: false, filterSqlCollapsed: false }
  if (!existsSync(p)) return dflt
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf-8')) as Partial<UiState>
    return { sidebarCollapsed: !!parsed?.sidebarCollapsed, filterSqlCollapsed: !!parsed?.filterSqlCollapsed }
  } catch {
    return dflt
  }
}

export function saveUiState(state: UiState): void {
  writeFileSync(uiPath(), JSON.stringify(state, null, 2), 'utf-8')
}

// --- ER diagram layouts (per connection+schema node positions) ----------------

function erLayoutPath(): string {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, 'er-layouts.json')
}

/** All persisted layouts, keyed by `${connectionId}::${schema}`. */
function loadErLayouts(): Record<string, ErLayout> {
  const p = erLayoutPath()
  if (!existsSync(p)) return {}
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf-8')) as Record<string, ErLayout>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function erKey(connectionId: string, schema: string): string {
  return `${connectionId}::${schema}`
}

export function loadErLayout(connectionId: string, schema: string): ErLayout | null {
  return loadErLayouts()[erKey(connectionId, schema)] ?? null
}

export function saveErLayout(connectionId: string, schema: string, layout: ErLayout): void {
  const all = loadErLayouts()
  all[erKey(connectionId, schema)] = layout
  writeFileSync(erLayoutPath(), JSON.stringify(all, null, 2), 'utf-8')
}
