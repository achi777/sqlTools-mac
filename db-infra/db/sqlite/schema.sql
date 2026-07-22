-- SQLite 3 schema for the DB Tool dev environment.
-- Applied by the APP at runtime (the app creates the .sqlite file and runs
-- this script) — NOT by Docker. SQLite is file-based; there is no container.
--
-- Same customers / orders / order_items shape as the PostgreSQL and MySQL
-- seeds, adapted to SQLite's type affinity model.
--
-- Type-affinity notes:
--   * INTEGER PRIMARY KEY AUTOINCREMENT gives a monotonic rowid alias.
--   * SQLite has no native BOOLEAN, JSON, ARRAY, or DECIMAL types. We use:
--       - INTEGER (0/1) for booleans (is_active).
--       - TEXT for JSON blobs (tags stored as a JSON array string, metadata
--         as a JSON object string). Use SQLite's JSON1 functions to query.
--       - NUMERIC affinity (via the DECIMAL declared type) for money; SQLite
--         stores it as REAL/INTEGER but preserves the value.
--       - TEXT (ISO-8601 strings) for timestamps.

PRAGMA foreign_keys = ON;  -- must be set per-connection by the app

CREATE TABLE IF NOT EXISTS customers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT    NOT NULL UNIQUE,
    full_name   TEXT    NOT NULL,
    is_active   INTEGER NOT NULL DEFAULT 1,   -- boolean 0/1
    tags        TEXT    NOT NULL DEFAULT '[]', -- JSON array string
    metadata    TEXT    NOT NULL DEFAULT '{}', -- JSON object string
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id   INTEGER NOT NULL,
    order_no      TEXT    NOT NULL UNIQUE,
    status        TEXT    NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','paid','shipped','cancelled','refunded')),
    total         DECIMAL(10,2) NOT NULL DEFAULT 0,  -- NUMERIC affinity
    notes         TEXT,
    placed_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id    INTEGER NOT NULL,
    sku         TEXT    NOT NULL,
    description TEXT    NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price  DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id  ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
