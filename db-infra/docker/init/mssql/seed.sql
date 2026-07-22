-- Microsoft SQL Server 2022 schema + seed for the DB Tool dev environment
-- (TASK 58). MSSQL's Docker image does NOT auto-run init scripts, so this is
-- applied manually after the container is healthy (see docker/README.md).
--
-- Mirrors the other engines' customers/orders/order_items schema using MSSQL
-- types: IDENTITY(1,1), NVARCHAR, DATETIME2, DECIMAL, BIT, and a JSON-ish
-- NVARCHAR(MAX) column.

IF DB_ID('dbtool_dev') IS NULL
    CREATE DATABASE dbtool_dev;
GO
USE dbtool_dev;
GO

-- Idempotent: drop in FK order so re-running reseeds cleanly.
IF OBJECT_ID('dbo.order_items', 'U') IS NOT NULL DROP TABLE dbo.order_items;
IF OBJECT_ID('dbo.orders', 'U')      IS NOT NULL DROP TABLE dbo.orders;
IF OBJECT_ID('dbo.customers', 'U')   IS NOT NULL DROP TABLE dbo.customers;
GO

CREATE TABLE dbo.customers (
    id          INT            IDENTITY(1,1) PRIMARY KEY,
    email       NVARCHAR(255)  NOT NULL UNIQUE,
    full_name   NVARCHAR(200)  NOT NULL,
    is_active   BIT            NOT NULL CONSTRAINT DF_customers_active DEFAULT (1),
    tags        NVARCHAR(200)  NOT NULL CONSTRAINT DF_customers_tags DEFAULT (''),
    metadata    NVARCHAR(MAX)  NOT NULL CONSTRAINT DF_customers_meta DEFAULT ('{}'),  -- JSON blob
    created_at  DATETIME2      NOT NULL CONSTRAINT DF_customers_created DEFAULT (SYSUTCDATETIME())
);

CREATE TABLE dbo.orders (
    id            BIGINT         IDENTITY(1,1) PRIMARY KEY,
    customer_id   INT            NOT NULL,
    order_no      NVARCHAR(32)   NOT NULL UNIQUE,
    status        NVARCHAR(20)   NOT NULL CONSTRAINT DF_orders_status DEFAULT ('pending'),
    total         DECIMAL(10,2)  NOT NULL CONSTRAINT DF_orders_total DEFAULT (0),
    notes         NVARCHAR(MAX)  NULL,
    placed_at     DATETIME2      NOT NULL CONSTRAINT DF_orders_placed DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_orders_customer FOREIGN KEY (customer_id) REFERENCES dbo.customers(id) ON DELETE CASCADE,
    CONSTRAINT CK_orders_status CHECK (status IN ('pending','paid','shipped','cancelled','refunded'))
);

CREATE TABLE dbo.order_items (
    id          BIGINT         IDENTITY(1,1) PRIMARY KEY,
    order_id    BIGINT         NOT NULL,
    sku         NVARCHAR(64)   NOT NULL,
    description NVARCHAR(200)  NOT NULL,
    quantity    INT            NOT NULL CONSTRAINT DF_items_qty DEFAULT (1),
    unit_price  DECIMAL(10,2)  NOT NULL,
    CONSTRAINT FK_items_order FOREIGN KEY (order_id) REFERENCES dbo.orders(id) ON DELETE CASCADE,
    CONSTRAINT CK_items_qty CHECK (quantity > 0)
);

CREATE INDEX idx_orders_customer_id  ON dbo.orders(customer_id);
CREATE INDEX idx_orders_status       ON dbo.orders(status);
CREATE INDEX idx_order_items_order_id ON dbo.order_items(order_id);
GO

-- customers (20) — inserted in id order so IDENTITY yields 1..20.
INSERT INTO dbo.customers (email, full_name, is_active, tags, metadata, created_at) VALUES
(N'ada.lovelace@example.com',    N'Ada Lovelace',      1, N'vip,early-adopter', N'{"tier":"gold","newsletter":true,"country":"UK"}',   '2024-01-05T09:12:00'),
(N'grace.hopper@example.com',    N'Grace Hopper',      1, N'vip',               N'{"tier":"gold","newsletter":false,"country":"US"}',  '2024-01-11T14:03:00'),
(N'alan.turing@example.com',     N'Alan Turing',       1, N'beta,research',     N'{"tier":"silver","newsletter":true,"country":"UK"}', '2024-01-19T08:45:00'),
(N'katherine.j@example.com',     N'Katherine Johnson', 1, N'vip,loyal',         N'{"tier":"gold","newsletter":true,"country":"US"}',   '2024-02-02T17:22:00'),
(N'linus.t@example.com',         N'Linus Torvalds',    1, N'power-user',        N'{"tier":"silver","newsletter":false,"country":"FI"}','2024-02-14T11:31:00'),
(N'margaret.h@example.com',      N'Margaret Hamilton', 1, N'vip,early-adopter', N'{"tier":"gold","newsletter":true,"country":"US"}',   '2024-02-21T19:08:00'),
(N'donald.k@example.com',        N'Donald Knuth',      1, N'research',          N'{"tier":"silver","newsletter":true,"country":"US"}', '2024-03-03T07:55:00'),
(N'barbara.l@example.com',       N'Barbara Liskov',    1, N'vip',               N'{"tier":"gold","newsletter":false,"country":"US"}',  '2024-03-12T13:40:00'),
(N'tim.bl@example.com',          N'Tim Berners-Lee',   1, N'beta',              N'{"tier":"silver","newsletter":true,"country":"UK"}', '2024-03-25T10:17:00'),
(N'guido.vr@example.com',        N'Guido van Rossum',  1, N'power-user,beta',   N'{"tier":"gold","newsletter":true,"country":"NL"}',   '2024-04-04T16:29:00'),
(N'dennis.r@example.com',        N'Dennis Ritchie',    0, N'legacy',            N'{"tier":"bronze","newsletter":false,"country":"US"}','2024-04-15T09:00:00'),
(N'ken.t@example.com',           N'Ken Thompson',      1, N'power-user',        N'{"tier":"silver","newsletter":false,"country":"US"}','2024-04-27T12:12:00'),
(N'john.mccarthy@example.com',   N'John McCarthy',     1, N'research',          N'{"tier":"bronze","newsletter":true,"country":"US"}', '2024-05-06T18:44:00'),
(N'edsger.d@example.com',        N'Edsger Dijkstra',   1, N'vip,research',      N'{"tier":"gold","newsletter":true,"country":"NL"}',   '2024-05-18T08:33:00'),
(N'claude.s@example.com',        N'Claude Shannon',    1, N'early-adopter',     N'{"tier":"silver","newsletter":true,"country":"US"}', '2024-05-29T15:21:00'),
(N'john.vn@example.com',         N'John von Neumann',  1, N'vip',               N'{"tier":"gold","newsletter":false,"country":"HU"}',  '2024-06-08T11:09:00'),
(N'adele.g@example.com',         N'Adele Goldberg',    1, N'beta,loyal',        N'{"tier":"silver","newsletter":true,"country":"US"}', '2024-06-19T14:50:00'),
(N'frances.a@example.com',       N'Frances Allen',     1, N'research,loyal',    N'{"tier":"bronze","newsletter":true,"country":"US"}', '2024-06-30T09:38:00'),
(N'niklaus.w@example.com',       N'Niklaus Wirth',     0, N'legacy',            N'{"tier":"bronze","newsletter":false,"country":"CH"}','2024-07-09T17:04:00'),
(N'vint.c@example.com',          N'Vint Cerf',         1, N'vip,early-adopter', N'{"tier":"gold","newsletter":true,"country":"US"}',   '2024-07-20T10:26:00');
GO

-- orders (20) — inserted in id order so IDENTITY yields 1..20.
INSERT INTO dbo.orders (customer_id, order_no, status, total, notes, placed_at) VALUES
( 1, N'ORD-1001', N'paid',      129.98, N'Gift wrap requested',   '2024-03-01T10:00:00'),
( 1, N'ORD-1002', N'shipped',    59.99, NULL,                     '2024-04-12T12:30:00'),
( 2, N'ORD-1003', N'paid',      249.50, N'Expedited shipping',    '2024-03-15T09:15:00'),
( 3, N'ORD-1004', N'pending',    19.99, NULL,                     '2024-05-01T14:45:00'),
( 4, N'ORD-1005', N'shipped',   399.00, N'Signature on delivery', '2024-04-02T11:20:00'),
( 5, N'ORD-1006', N'cancelled',  89.90, N'Customer changed mind', '2024-04-20T16:05:00'),
( 6, N'ORD-1007', N'paid',      175.25, NULL,                     '2024-05-10T08:50:00'),
( 7, N'ORD-1008', N'refunded',   45.00, N'Damaged in transit',    '2024-05-22T13:10:00'),
( 8, N'ORD-1009', N'paid',      612.75, N'Bulk order',            '2024-06-01T10:40:00'),
( 9, N'ORD-1010', N'shipped',    32.49, NULL,                     '2024-06-05T15:55:00'),
(10, N'ORD-1011', N'paid',      148.00, NULL,                     '2024-06-11T09:30:00'),
(12, N'ORD-1012', N'pending',    74.99, N'Awaiting payment',      '2024-06-18T12:00:00'),
(14, N'ORD-1013', N'paid',      299.99, N'Corporate account',     '2024-06-24T17:25:00'),
(15, N'ORD-1014', N'shipped',    21.00, NULL,                     '2024-06-28T11:11:00'),
(16, N'ORD-1015', N'paid',      450.00, N'Priority handling',     '2024-07-01T08:00:00'),
(17, N'ORD-1016', N'pending',    64.50, NULL,                     '2024-07-05T14:20:00'),
(18, N'ORD-1017', N'paid',      110.10, NULL,                     '2024-07-08T10:45:00'),
(20, N'ORD-1018', N'shipped',   205.80, N'Fragile',               '2024-07-12T16:30:00'),
( 4, N'ORD-1019', N'paid',       88.88, N'Repeat customer',       '2024-07-15T09:05:00'),
( 6, N'ORD-1020', N'paid',      133.33, NULL,                     '2024-07-18T13:50:00');
GO

INSERT INTO dbo.order_items (order_id, sku, description, quantity, unit_price) VALUES
( 1, N'SKU-KB-01',  N'Mechanical keyboard, brown switches', 1,  89.99),
( 1, N'SKU-MP-01',  N'Desk mouse pad, XL',                  2,  19.99),
( 2, N'SKU-CB-USB', N'USB-C cable, 2m',                     1,  12.99),
( 2, N'SKU-HUB-01', N'USB-C hub, 7-port',                   1,  46.99),
( 3, N'SKU-MON-27', N'27-inch IPS monitor',                 1, 229.50),
( 3, N'SKU-CB-DP',  N'DisplayPort cable, 1.5m',             1,  20.00),
( 4, N'SKU-STK-01', N'Sticker pack, dev-themed',            1,  19.99),
( 5, N'SKU-CHR-01', N'Ergonomic office chair',              1, 379.00),
( 5, N'SKU-CB-USB', N'USB-C cable, 2m',                     1,  12.99),
( 6, N'SKU-LMP-01', N'Desk lamp, LED dimmable',             1,  89.90),
( 7, N'SKU-KB-02',  N'Mechanical keyboard, blue switches',  1,  95.25),
( 7, N'SKU-WR-01',  N'Wrist rest, memory foam',             2,  40.00),
( 8, N'SKU-STK-01', N'Sticker pack, dev-themed',            1,  19.99),
( 8, N'SKU-MUG-01', N'Coffee mug, 350ml',                   1,  25.01),
( 9, N'SKU-DSK-01', N'Standing desk, 140cm',                1, 549.75),
( 9, N'SKU-CB-USB', N'USB-C cable, 2m',                     3,  12.99),
( 9, N'SKU-MP-01',  N'Desk mouse pad, XL',                  1,  19.99),
(10, N'SKU-CB-HD',  N'HDMI cable, 1m',                      1,  10.50),
(10, N'SKU-CB-USB', N'USB-C cable, 2m',                     1,  12.99),
(10, N'SKU-STK-01', N'Sticker pack, dev-themed',            1,   9.00),
(11, N'SKU-WCM-01', N'Webcam, 1080p',                       1,  68.00),
(11, N'SKU-MIC-01', N'USB microphone',                      1,  80.00),
(12, N'SKU-HUB-01', N'USB-C hub, 7-port',                   1,  46.99),
(12, N'SKU-CB-USB', N'USB-C cable, 2m',                     1,  12.99),
(12, N'SKU-STK-01', N'Sticker pack, dev-themed',            1,  15.01),
(13, N'SKU-MON-27', N'27-inch IPS monitor',                 1, 229.99),
(13, N'SKU-STD-01', N'Monitor arm, single',                 1,  70.00),
(15, N'SKU-DSK-01', N'Standing desk, 140cm',                1, 450.00),
(16, N'SKU-WR-01',  N'Wrist rest, memory foam',             1,  20.00),
(16, N'SKU-MP-01',  N'Desk mouse pad, XL',                  1,  44.50),
(17, N'SKU-MUG-01', N'Coffee mug, 350ml',                   2,  25.05),
(17, N'SKU-STK-01', N'Sticker pack, dev-themed',            1,  60.00),
(18, N'SKU-MON-27', N'27-inch IPS monitor',                 1, 205.80);
GO

-- A view, so the tree shows a Views level too.
IF OBJECT_ID('dbo.active_customers', 'V') IS NOT NULL DROP VIEW dbo.active_customers;
GO
CREATE VIEW dbo.active_customers AS
    SELECT id, email, full_name, created_at FROM dbo.customers WHERE is_active = 1;
GO

SELECT 'customers' AS tbl, COUNT(*) AS n FROM dbo.customers
UNION ALL SELECT 'orders', COUNT(*) FROM dbo.orders
UNION ALL SELECT 'order_items', COUNT(*) FROM dbo.order_items;
GO
