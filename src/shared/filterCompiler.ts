// Pure filter compiler shared by MAIN (execution) and the RENDERER (preview).
// Turns quick filters (flat AND) + a visual builder tree (nested AND/OR/NOT)
// into a single WHERE. For EXECUTION every value is a BOUND PARAMETER; for
// PREVIEW the same logic inlines readable literals. Identifiers are quoted and
// (on execution) validated against the table's real columns.
import type { ColumnFilter, Engine, FilterGroup, FilterNode } from './types'
import { guardRawWhere } from './rawWhere'

/** Structural shape shared by ColumnFilter and FilterCondition. */
interface Cond {
  column: string
  operator: ColumnFilter['operator']
  value?: string | null
  value2?: string | null
  values?: string[] | null
}

/** Escape LIKE wildcards so the user's %/_ are treated literally. */
function escapeLike(v: string): string {
  return v.replace(/[\\%_]/g, (c) => '\\' + c)
}

/** `add` binds a value and returns its placeholder (exec) or a literal (preview). */
export type AddParam = (v: unknown) => string

/** A param-binding adder ($1.. for PG, ? otherwise) with its collected params. */
export function paramAdder(engine: Engine): { params: unknown[]; add: AddParam } {
  const params: unknown[] = []
  const add: AddParam = (v) => {
    params.push(v)
    return engine === 'postgres' ? `$${params.length}` : '?'
  }
  return { params, add }
}

/** An inline literal adder (numbers as-is, strings single-quoted + escaped). */
export function inlineAdder(): AddParam {
  return (v) => {
    const s = String(v)
    return /^-?\d+(\.\d+)?$/.test(s) ? s : `'${s.replace(/'/g, "''")}'`
  }
}

function likeParts(engine: Engine): { op: string; esc: string } {
  return {
    op: engine === 'postgres' ? 'ILIKE' : 'LIKE',
    // MySQL processes backslashes in string literals, so '\\' == one backslash.
    esc: engine === 'mysql' ? "ESCAPE '\\\\'" : "ESCAPE '\\'"
  }
}

/** Compile one condition to SQL, or null if it's empty/incomplete. */
function buildCondition(
  engine: Engine,
  cond: Cond,
  validColumns: Set<string> | null,
  qid: (id: string) => string,
  add: AddParam
): string | null {
  if (validColumns && !validColumns.has(cond.column)) {
    throw new Error(`Unknown filter column: ${cond.column}`)
  }
  const col = qid(cond.column)
  const v = cond.value
  const hasVal = v != null && v !== ''
  const { op: likeOp, esc } = likeParts(engine)

  switch (cond.operator) {
    case 'isNull':
      return `${col} IS NULL`
    case 'isNotNull':
      return `${col} IS NOT NULL`
    case 'eq':
      return hasVal ? `${col} = ${add(v)}` : null
    case 'ne':
      return hasVal ? `${col} <> ${add(v)}` : null
    case 'lt':
      return hasVal ? `${col} < ${add(v)}` : null
    case 'lte':
      return hasVal ? `${col} <= ${add(v)}` : null
    case 'gt':
      return hasVal ? `${col} > ${add(v)}` : null
    case 'gte':
      return hasVal ? `${col} >= ${add(v)}` : null
    case 'contains':
      return hasVal ? `${col} ${likeOp} ${add('%' + escapeLike(v) + '%')} ${esc}` : null
    case 'startsWith':
      return hasVal ? `${col} ${likeOp} ${add(escapeLike(v) + '%')} ${esc}` : null
    case 'endsWith':
      return hasVal ? `${col} ${likeOp} ${add('%' + escapeLike(v))} ${esc}` : null
    case 'in':
    case 'notIn': {
      const vals = (cond.values ?? []).map((x) => x.trim()).filter((x) => x !== '')
      if (vals.length === 0) return null
      const list = vals.map((x) => add(x)).join(', ')
      return `${col} ${cond.operator === 'notIn' ? 'NOT IN' : 'IN'} (${list})`
    }
    case 'between':
      return hasVal && cond.value2 != null && cond.value2 !== ''
        ? `${col} BETWEEN ${add(v)} AND ${add(cond.value2)}`
        : null
    default:
      return null
  }
}

/** Recursively compile a builder node; null if it contributes nothing. */
export function compileNode(
  engine: Engine,
  node: FilterNode,
  validColumns: Set<string> | null,
  qid: (id: string) => string,
  add: AddParam
): string | null {
  if (node.kind === 'condition') {
    return buildCondition(engine, node, validColumns, qid, add)
  }
  const parts = node.children
    .map((ch) => compileNode(engine, ch, validColumns, qid, add))
    .filter((p): p is string => !!p)
  if (parts.length === 0) return null
  const joined = parts.join(` ${node.combiner} `)
  if (node.negated) return `NOT (${joined})`
  return parts.length > 1 ? `(${joined})` : joined
}

/**
 * Compile quick filters + a builder tree into ONE parameterized WHERE.
 * Effective filter = (quick filters AND-combined) AND (builder tree).
 * A single shared param counter keeps PG's $1.. numbering correct.
 *
 * `rawWhere` (the "Custom WHERE" mode) takes precedence: when present it is the
 * ONLY predicate. It can't be parameterized, so it's run through `guardRawWhere`
 * (rejects ';'/comments/DDL-DML) and wrapped in parens. Throws on a rejected
 * predicate — the caller surfaces the message to the user.
 */
export function compileFilter(
  engine: Engine,
  quickFilters: ColumnFilter[],
  tree: FilterGroup | null,
  validColumns: Set<string>,
  qid: (id: string) => string,
  rawWhere?: string | null
): { sql: string; params: unknown[] } {
  if (rawWhere && rawWhere.trim()) {
    const g = guardRawWhere(rawWhere)
    if (!g.ok) throw new Error(g.reason)
    return { sql: `WHERE (${g.where})`, params: [] }
  }
  const params: unknown[] = []
  const add: AddParam = (v) => {
    params.push(v)
    return engine === 'postgres' ? `$${params.length}` : '?'
  }
  const parts: string[] = []
  for (const f of quickFilters) {
    const c = buildCondition(engine, f, validColumns, qid, add)
    if (c) parts.push(c)
  }
  if (tree) {
    const t = compileNode(engine, tree, validColumns, qid, add)
    if (t) parts.push(t)
  }
  return { sql: parts.length ? `WHERE ${parts.join(' AND ')}` : '', params }
}

/** Human-readable WHERE with values inlined — for the builder's live preview. */
export function previewWhere(
  engine: Engine,
  quickFilters: ColumnFilter[],
  tree: FilterGroup | null
): string {
  const qid = engine === 'mysql' ? (s: string) => '`' + s + '`' : (s: string) => '"' + s + '"'
  const add: AddParam = (v) => {
    const s = String(v)
    return /^-?\d+(\.\d+)?$/.test(s) ? s : `'${s.replace(/'/g, "''")}'`
  }
  const parts: string[] = []
  for (const f of quickFilters) {
    const c = buildCondition(engine, f, null, qid, add)
    if (c) parts.push(c)
  }
  if (tree) {
    const t = compileNode(engine, tree, null, qid, add)
    if (t) parts.push(t)
  }
  return parts.length ? 'WHERE ' + parts.join(' AND ') : '(no filter — all rows)'
}
