// Split a SQL script into individual statements on top-level semicolons, while
// respecting quoted strings ('...', "...", `...`), PostgreSQL dollar-quotes
// ($$…$$ / $tag$…$tag$), and comments (-- line, /* block */). Good enough for
// dumps this tool generates and typical hand-written .sql files. It does NOT
// interpret client-only DELIMITER directives (drivers run each statement
// directly, so routine/trigger bodies must arrive as one statement — which they
// do when produced by this tool).
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = []
  let cur = ''
  let i = 0
  const n = sql.length

  while (i < n) {
    const ch = sql[i]

    // line comment
    if (ch === '-' && sql[i + 1] === '-') {
      const nl = sql.indexOf('\n', i)
      const end = nl === -1 ? n : nl
      cur += sql.slice(i, end)
      i = end
      continue
    }
    // block comment
    if (ch === '/' && sql[i + 1] === '*') {
      const close = sql.indexOf('*/', i + 2)
      const end = close === -1 ? n : close + 2
      cur += sql.slice(i, end)
      i = end
      continue
    }
    // single / double quote / backtick string
    if (ch === "'" || ch === '"' || ch === '`') {
      const q = ch
      let j = i + 1
      cur += ch
      while (j < n) {
        if (sql[j] === q) {
          // doubled quote = escaped quote (stays inside the string)
          if (sql[j + 1] === q) {
            cur += q + q
            j += 2
            continue
          }
          cur += q
          j++
          break
        }
        if (sql[j] === '\\' && q !== '`') {
          // backslash escape (MySQL/PG non-standard) — keep next char literal
          cur += sql[j] + (sql[j + 1] ?? '')
          j += 2
          continue
        }
        cur += sql[j]
        j++
      }
      i = j
      continue
    }
    // dollar-quoted string ($$ or $tag$)
    if (ch === '$') {
      const m = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i))
      if (m) {
        const tag = m[0]
        const close = sql.indexOf(tag, i + tag.length)
        const end = close === -1 ? n : close + tag.length
        cur += sql.slice(i, end)
        i = end
        continue
      }
    }
    // statement terminator
    if (ch === ';') {
      const trimmed = cur.trim()
      if (trimmed) statements.push(trimmed)
      cur = ''
      i++
      continue
    }
    cur += ch
    i++
  }
  const last = cur.trim()
  if (last) statements.push(last)
  return statements
}
