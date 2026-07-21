// Pure DDL generators for PostgreSQL sequences (CREATE / ALTER / DROP /
// RESTART / RENAME). Shared by renderer (preview) and main (execute). No DB
// access here. All numeric inputs are validated (bigint-safe strings) and all
// identifiers are quoted, so the generated SQL is safe to execute.
import type { DdlPreview, SequenceSpec } from './types'

function q(id: string): string {
  return '"' + id.replace(/"/g, '""') + '"'
}

/** Quote a possibly-qualified identifier path like `schema.table.column`. */
function qpath(path: string): string {
  return path
    .split('.')
    .map((p) => q(p.trim()))
    .join('.')
}

function num(label: string, v: string): string {
  const s = String(v).trim()
  if (!/^-?\d+$/.test(s)) throw new Error(`Invalid ${label}: "${v}" (must be an integer)`)
  return s
}

const VALID_TYPES = new Set(['smallint', 'integer', 'bigint'])
function dataType(t: string): string {
  const s = (t || 'bigint').toLowerCase()
  if (!VALID_TYPES.has(s)) throw new Error(`Invalid sequence data type: "${t}"`)
  return s
}

function qualified(spec: { schema: string; name: string }): string {
  return `${q(spec.schema)}.${q(spec.name)}`
}

/** CREATE SEQUENCE from a spec. */
export function buildCreateSequence(spec: SequenceSpec): DdlPreview {
  const lines: string[] = [`CREATE SEQUENCE ${qualified(spec)}`]
  lines.push(`  AS ${dataType(spec.dataType)}`)
  lines.push(`  INCREMENT BY ${num('increment', spec.increment)}`)
  lines.push(spec.minValue != null && spec.minValue !== '' ? `  MINVALUE ${num('minvalue', spec.minValue)}` : '  NO MINVALUE')
  lines.push(spec.maxValue != null && spec.maxValue !== '' ? `  MAXVALUE ${num('maxvalue', spec.maxValue)}` : '  NO MAXVALUE')
  lines.push(`  START WITH ${num('start', spec.start)}`)
  lines.push(`  CACHE ${num('cache', spec.cache)}`)
  lines.push(spec.cycle ? '  CYCLE' : '  NO CYCLE')
  if (spec.ownedBy && spec.ownedBy.trim()) lines.push(`  OWNED BY ${qpath(spec.ownedBy)}`)
  const sql = lines.join('\n') + ';'
  return { sql, statements: [sql], destructive: false, destructiveReasons: [], notes: [] }
}

/** ALTER SEQUENCE — emits only changed properties, plus RESTART and RENAME. */
export function buildAlterSequence(spec: SequenceSpec, original: SequenceSpec): DdlPreview {
  const statements: string[] = []
  const notes: string[] = []
  const cur = `${q(spec.schema)}.${q(original.name)}`

  const props: string[] = []
  if (dataType(spec.dataType) !== dataType(original.dataType)) props.push(`AS ${dataType(spec.dataType)}`)
  if (num('increment', spec.increment) !== num('increment', original.increment)) {
    props.push(`INCREMENT BY ${num('increment', spec.increment)}`)
  }
  const minNow = spec.minValue != null && spec.minValue !== '' ? num('minvalue', spec.minValue) : null
  const minOrig = original.minValue != null && original.minValue !== '' ? original.minValue : null
  if (minNow !== minOrig) props.push(minNow != null ? `MINVALUE ${minNow}` : 'NO MINVALUE')
  const maxNow = spec.maxValue != null && spec.maxValue !== '' ? num('maxvalue', spec.maxValue) : null
  const maxOrig = original.maxValue != null && original.maxValue !== '' ? original.maxValue : null
  if (maxNow !== maxOrig) props.push(maxNow != null ? `MAXVALUE ${maxNow}` : 'NO MAXVALUE')
  if (num('start', spec.start) !== num('start', original.start)) props.push(`START WITH ${num('start', spec.start)}`)
  if (num('cache', spec.cache) !== num('cache', original.cache)) props.push(`CACHE ${num('cache', spec.cache)}`)
  if (spec.cycle !== original.cycle) props.push(spec.cycle ? 'CYCLE' : 'NO CYCLE')
  const ownNow = spec.ownedBy && spec.ownedBy.trim() ? spec.ownedBy.trim() : null
  const ownOrig = original.ownedBy && original.ownedBy.trim() ? original.ownedBy.trim() : null
  if (ownNow !== ownOrig) props.push(ownNow ? `OWNED BY ${qpath(ownNow)}` : 'OWNED BY NONE')
  // RESTART is an explicit action, not a diff of a stored property.
  if (spec.restart != null && String(spec.restart).trim() !== '') {
    props.push(`RESTART WITH ${num('restart', spec.restart)}`)
  }

  if (props.length > 0) statements.push(`ALTER SEQUENCE ${cur}\n  ${props.join('\n  ')};`)

  const renamed = spec.originalName && spec.name !== spec.originalName
  if (renamed) statements.push(`ALTER SEQUENCE ${cur} RENAME TO ${q(spec.name)};`)

  if (statements.length === 0) notes.push('No changes to apply.')
  return { sql: statements.join('\n'), statements, destructive: false, destructiveReasons: [], notes }
}

/** DROP SEQUENCE (destructive; warns if owned by a column). */
export function buildDropSequence(schema: string, name: string, ownedBy?: string | null): DdlPreview {
  const sql = `DROP SEQUENCE ${q(schema)}.${q(name)};`
  const reasons = [`drops sequence "${name}" permanently`]
  if (ownedBy) reasons.push(`sequence is OWNED BY ${ownedBy} — dropping may break that column's default`)
  return { sql, statements: [sql], destructive: true, destructiveReasons: reasons, notes: [] }
}
