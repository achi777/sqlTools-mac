// Pure trigger DDL generation + definition parsing, shared by renderer (preview)
// and main (execute / round-trip). Engine-aware:
//   - PostgreSQL: a trigger is a FUNCTION (RETURNS trigger) + a CREATE TRIGGER
//     that EXECUTE FUNCTIONs it. Editing has no CREATE OR REPLACE TRIGGER, so
//     we DROP + CREATE the trigger (function uses CREATE OR REPLACE).
//   - MySQL / SQLite: a single CREATE TRIGGER whose body may contain ';'
//     (executed as ONE statement — no DELIMITER needed via the driver). Editing
//     is DROP + CREATE.
import type { DdlPreview, Engine, TriggerSpec } from './types'

function q(engine: Engine, id: string): string {
  return engine === 'mysql' ? '`' + id.replace(/`/g, '``') + '`' : '"' + id.replace(/"/g, '""') + '"'
}

/** Qualified table name (schema.table for PG/MySQL; bare for SQLite). */
function qtable(engine: Engine, schema: string, table: string): string {
  return engine === 'sqlite' ? q(engine, table) : `${q(engine, schema)}.${q(engine, table)}`
}

/** Build the executable statements for creating/altering a trigger. */
export function buildTriggerStatements(engine: Engine, spec: TriggerSpec, mode: 'new' | 'edit'): DdlPreview {
  const statements: string[] = []
  const notes: string[] = []
  const destructiveReasons: string[] = []
  const tbl = qtable(engine, spec.schema, spec.table)
  const origName = spec.originalName ?? spec.name

  if (engine === 'postgres') {
    const fn = spec.functionName?.trim() || `${spec.name}_fn`
    const fnQn = `${q('postgres', spec.schema)}.${q('postgres', fn)}`
    // Function (CREATE OR REPLACE — safe to re-run).
    statements.push(
      `CREATE OR REPLACE FUNCTION ${fnQn}()\nRETURNS trigger\nLANGUAGE plpgsql\nAS $$\n${spec.functionBody.trim()}\n$$;`
    )
    if (mode === 'edit') {
      statements.push(`DROP TRIGGER IF EXISTS ${q('postgres', origName)} ON ${tbl};`)
      destructiveReasons.push(`re-creates trigger "${origName}" (DROP + CREATE)`)
    }
    statements.push(
      `CREATE TRIGGER ${q('postgres', spec.name)} ${spec.timing} ${spec.event} ON ${tbl}\nFOR EACH ${spec.level} EXECUTE FUNCTION ${fnQn}();`
    )
  } else if (engine === 'mysql') {
    const trgName = `${q('mysql', spec.schema)}.${q('mysql', spec.name)}`
    if (mode === 'edit') {
      statements.push(`DROP TRIGGER IF EXISTS ${q('mysql', spec.schema)}.${q('mysql', origName)};`)
      destructiveReasons.push(`re-creates trigger "${origName}" (DROP + CREATE)`)
    }
    statements.push(
      `CREATE TRIGGER ${trgName} ${spec.timing} ${spec.event} ON ${tbl}\nFOR EACH ROW ${spec.body.trim()}`
    )
  } else {
    // sqlite
    if (mode === 'edit') {
      statements.push(`DROP TRIGGER IF EXISTS ${q('sqlite', spec.name)};`)
      statements.push(`DROP TRIGGER IF EXISTS ${q('sqlite', origName)};`)
      destructiveReasons.push(`re-creates trigger "${origName}" (DROP + CREATE)`)
    }
    statements.push(
      `CREATE TRIGGER ${q('sqlite', spec.name)} ${spec.timing} ${spec.event} ON ${q('sqlite', spec.table)}\nFOR EACH ROW ${spec.body.trim()}`
    )
  }

  return {
    sql: statements.join('\n\n'),
    statements,
    destructive: destructiveReasons.length > 0,
    destructiveReasons,
    notes
  }
}

// --- Definition parsing (for the edit round-trip) ----------------------------

/** Extract BEFORE/AFTER/INSTEAD OF from a CREATE TRIGGER string. */
export function parseTiming(def: string): string {
  const m = def.match(/\b(BEFORE|AFTER|INSTEAD\s+OF)\b/i)
  return m ? m[1].toUpperCase().replace(/\s+/g, ' ') : 'BEFORE'
}

/** Extract the first of INSERT/UPDATE/DELETE (may appear as "UPDATE OF ..."). */
export function parseEvent(def: string): string {
  const m = def.match(/\b(INSERT|UPDATE|DELETE)\b/i)
  return m ? m[1].toUpperCase() : 'INSERT'
}

/** Extract FOR EACH ROW|STATEMENT (defaults ROW). */
export function parseLevel(def: string): string {
  const m = def.match(/FOR\s+EACH\s+(ROW|STATEMENT)/i)
  return m ? m[1].toUpperCase() : 'ROW'
}

/** Extract the plpgsql body between the outer $tag$ … $tag$ of a function def. */
export function parseFunctionBody(fnDef: string): string {
  const m = fnDef.match(/AS\s+\$([A-Za-z0-9_]*)\$([\s\S]*?)\$\1\$/)
  return m ? m[2].trim() : ''
}

/**
 * Extract the action body of a MySQL/SQLite CREATE TRIGGER (everything after
 * `FOR EACH ROW` — the BEGIN…END or single statement, incl. any WHEN clause).
 */
export function parseTriggerBody(def: string): string {
  const m = def.match(/FOR\s+EACH\s+ROW\s+([\s\S]+?)\s*;?\s*$/i)
  if (m) return m[1].trim()
  // SQLite may omit FOR EACH ROW: take everything from WHEN/BEGIN onward.
  const m2 = def.match(/\bON\b\s+\S+\s+([\s\S]+)$/i)
  return m2 ? m2[1].trim() : def.trim()
}
