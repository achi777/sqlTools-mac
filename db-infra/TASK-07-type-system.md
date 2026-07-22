# TASK 07: DB Tool — Complete column type system for the Table Designer (AUTONOMOUS)
# Windows 11 / portable Node in project. Depends on TASK 05 (table designer).

## ROLE & CONTEXT
Fix and complete the column TYPE system in the Table Designer (built in
TASK 05). Right now the type dropdown is incomplete. Replace it with a full,
categorized, per-engine type catalog PLUS type-specific parameter inputs
(length, precision/scale, ENUM/SET values, timezone, unsigned, etc.), so the
generated DDL is always correct for PostgreSQL, MySQL, and SQLite.
Architecture unchanged: DDL generated/executed in main; renderer via typed
contextBridge; designer sends a structured column spec, not raw SQL.

Prereq: TASK 05 table designer exists (columns/PK/FK/indexes + live DDL
preview + destructive-confirm). This task swaps in a proper type system and
regenerates DDL from it.

## ✅ AUTONOMOUS PERMISSIONS
- npm install (project-local), npm run <script>, run app in dev to smoke-test
- Connect to TASK 01 databases to verify generated DDL actually applies
- Create/edit/read files anywhere inside the db-tool project folder

## ⛔ GUARDRAILS (ask user first)
- NO docker prune / down -v; NO deletes outside project; NO rm -rf outside it
- NO host/system config changes (PATH, registry, .wslconfig, WSL, Docker
  Desktop settings, global npm); NO -g global installs
- Verify generated DDL only on DISPOSABLE objects (`_typetest_` tables /
  `dbtool_ddl_test` schema). Never touch seeded customers/orders/order_items.
  Clean up afterward.
- If a destructive/system action seems needed, STOP and ask.

## CORE IDEA: a per-engine TYPE CATALOG with metadata
Define, in a shared module, a data-driven catalog of column types per engine.
Each type entry carries metadata describing what parameters it takes, so the
UI can render the right inputs and the DDL generator can emit correct syntax.

Suggested shape (adapt as needed):
  type ParamKind = 'length' | 'precisionScale' | 'enumValues' | 'setValues'
                 | 'timezone' | 'unsigned' | 'zerofill' | 'none';
  interface TypeDef {
    name: string;              // canonical, e.g. 'VARCHAR', 'NUMERIC'
    category: string;          // 'Numeric' | 'String' | 'Date/Time' | 'Boolean'
                               // | 'JSON' | 'Binary' | 'UUID' | 'Geometric'
                               // | 'Network' | 'Array' | 'Other'
    params: ParamKind[];       // which extra inputs this type needs
    defaults?: {...};          // e.g. VARCHAR default length 255
    aliases?: string[];        // e.g. INT4 -> INTEGER
    notes?: string;            // UI hint
  }

### PostgreSQL types (cover the real set)
- Numeric: SMALLINT, INTEGER, BIGINT, DECIMAL(p,s), NUMERIC(p,s), REAL,
  DOUBLE PRECISION, SMALLSERIAL, SERIAL, BIGSERIAL, MONEY
- String: CHAR(n), VARCHAR(n), TEXT
- Date/Time: DATE, TIME, TIME WITH TIME ZONE, TIMESTAMP,
  TIMESTAMP WITH TIME ZONE, INTERVAL  (timezone param where relevant)
- Boolean: BOOLEAN
- UUID: UUID
- JSON: JSON, JSONB
- Binary: BYTEA
- Network: INET, CIDR, MACADDR
- Geometric: POINT, LINE, LSEG, BOX, PATH, POLYGON, CIRCLE
- Arrays: allow "array of <type>" (append []) as a modifier/checkbox
- Enum: user-defined enums are advanced — at minimum allow a text type name;
  full CREATE TYPE ... AS ENUM management can be noted as later scope.

### MySQL 8 types
- Numeric: TINYINT, SMALLINT, MEDIUMINT, INT, BIGINT (each with UNSIGNED +
  ZEROFILL flags), DECIMAL(p,s), NUMERIC(p,s), FLOAT, DOUBLE, BIT
- String: CHAR(n), VARCHAR(n), TINYTEXT, TEXT, MEDIUMTEXT, LONGTEXT,
  ENUM(values...), SET(values...)
- Date/Time: DATE, TIME, DATETIME, TIMESTAMP, YEAR
- Binary: BINARY(n), VARBINARY(n), TINYBLOB, BLOB, MEDIUMBLOB, LONGBLOB
- JSON: JSON
- Spatial: GEOMETRY, POINT, LINESTRING, POLYGON (basic)
- charset/collation per column is advanced — optional, can be later scope.

### SQLite types
- Honest about type affinity: INTEGER, REAL, TEXT, BLOB, NUMERIC are the
  storage classes. Also offer common declared aliases people use (VARCHAR,
  BOOLEAN, DATETIME, etc.) but show a UI note that SQLite uses type affinity
  and these map to the 5 classes. INTEGER PRIMARY KEY = rowid alias.

## UI REQUIREMENTS (Table Designer)
- Type picker: searchable dropdown, GROUPED BY category, showing the full
  per-engine catalog for the active connection's engine.
- When a type is chosen, render ONLY the relevant parameter inputs:
  - length -> single "length" number (CHAR/VARCHAR/BINARY...)
  - precisionScale -> "precision" + "scale" (DECIMAL/NUMERIC)
  - enumValues / setValues -> an editable list of string values (MySQL
    ENUM/SET)
  - timezone -> a "with time zone" checkbox (PG time/timestamp)
  - unsigned / zerofill -> checkboxes (MySQL integer types)
  - array -> "array []" checkbox (PG)
  - none -> no extra inputs
- Sensible defaults (e.g. VARCHAR length 255) and validation (length > 0,
  scale <= precision, ENUM needs >=1 value, etc.) with inline errors.
- The DDL PREVIEW must reflect the full type with params exactly, e.g.
  `VARCHAR(255)`, `NUMERIC(10,2)`, `TIMESTAMP WITH TIME ZONE`,
  `INT UNSIGNED`, `ENUM('a','b','c')`, `TEXT[]`.

## DDL GENERATOR
- Update the per-driver DDL generators (from TASK 05) to render the full type
  string from the column spec + params, per dialect. Keep it the single
  source of truth for both CREATE and ALTER.
- Round-trip on EDIT: when loading an existing table, parse the DB's reported
  type back into (typeName + params) so the designer shows it correctly
  (e.g. information_schema character_maximum_length -> length; numeric_
  precision/scale -> precision/scale; MySQL COLUMN_TYPE for enum/set/unsigned;
  SQLite declared type string). Where a reported type can't be perfectly
  parsed, fall back to showing the raw type string editable as free text.

## STEPS (autonomous, in order)
1. Build the per-engine type catalog module (data-driven, with metadata).
2. Replace the designer's type dropdown with the categorized searchable
   picker + dynamic param inputs + validation.
3. Update the DDL generators to emit full typed columns from the spec.
4. Implement type round-trip parsing for EDIT mode (all three engines).
5. Verify on DISPOSABLE objects across PG / MySQL / SQLite:
   - Create `_typetest_` tables exercising: VARCHAR(n), NUMERIC(p,s),
     TIMESTAMP WITH TIME ZONE (PG), INT UNSIGNED + ENUM + SET (MySQL),
     TEXT/INTEGER/REAL/BLOB affinity (SQLite), plus JSON/JSONB and (PG) an
     array column. Confirm each CREATE applies cleanly.
   - Re-open each created table in EDIT mode and confirm the designer shows
     the correct type + params (round-trip), then make a small change and
     confirm ALTER applies.
   - Drop the disposable tables; clean up.
6. npm run typecheck + npm run build clean.
7. (Optional, quick) package:dir + SMOKE to confirm no regression.
8. Leave a clean state (dev server stopped, disposable objects removed).

## OUT OF SCOPE (later)
- Full user-defined PG ENUM/domain management via CREATE TYPE, per-column
  charset/collation editors, custom/extension types, generated/computed
  columns. Note them as backlog; don't build now.

## DONE = the Table Designer offers the full per-engine type catalog
(categorized, searchable) with type-specific parameter inputs and validation;
the DDL preview and generated CREATE/ALTER render exact typed columns
(VARCHAR(n), NUMERIC(p,s), WITH TIME ZONE, UNSIGNED, ENUM/SET, arrays, JSON);
EDIT mode round-trips existing types correctly across PG/MySQL/SQLite;
typecheck + build clean; verified on disposable objects that were cleaned up.
