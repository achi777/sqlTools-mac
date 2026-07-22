-- MySQL 8 schema + seed for the DB Tool dev environment.
-- Runs ONCE on first container init (only when the mysqldata volume is empty).
-- To re-run, you must reset the volume (see docker/README.md) — DESTRUCTIVE.
--
-- Same customers / orders / order_items shape as the PostgreSQL seed, but
-- using MySQL 8 types. NOTE: MySQL has no native array type, so `tags` is
-- stored as JSON (a JSON array), and customer metadata is JSON as well.

SET NAMES utf8mb4;

-- ---------------------------------------------------------------------------
-- Schema (InnoDB, utf8mb4)
-- ---------------------------------------------------------------------------

CREATE TABLE customers (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    email       VARCHAR(255) NOT NULL,
    full_name   VARCHAR(255) NOT NULL,
    is_active   TINYINT(1)   NOT NULL DEFAULT 1,          -- boolean
    tags        JSON         NOT NULL,                    -- MySQL has no array type; JSON array
    metadata    JSON         NOT NULL,                    -- flexible profile blob
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_customers_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
    id            BIGINT        NOT NULL AUTO_INCREMENT,
    customer_id   BIGINT        NOT NULL,
    order_no      VARCHAR(32)   NOT NULL,
    status        VARCHAR(20)   NOT NULL DEFAULT 'pending',
    total         DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes         TEXT          NULL,
    placed_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_orders_order_no (order_no),
    KEY idx_orders_customer_id (customer_id),
    KEY idx_orders_status (status),
    CONSTRAINT fk_orders_customer
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT orders_status_chk
        CHECK (status IN ('pending','paid','shipped','cancelled','refunded'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE order_items (
    id          BIGINT        NOT NULL AUTO_INCREMENT,
    order_id    BIGINT        NOT NULL,
    sku         VARCHAR(64)   NOT NULL,
    description VARCHAR(255)  NOT NULL,
    quantity    INT           NOT NULL DEFAULT 1,
    unit_price  DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_order_items_order_id (order_id),
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT order_items_qty_chk CHECK (quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Seed: customers (20)
-- ---------------------------------------------------------------------------

INSERT INTO customers (email, full_name, is_active, tags, metadata, created_at) VALUES
('ada.lovelace@example.com',    'Ada Lovelace',      1, '["vip","early-adopter"]', '{"tier":"gold","newsletter":true,"country":"UK"}',   '2024-01-05 09:12:00'),
('grace.hopper@example.com',    'Grace Hopper',      1, '["vip"]',                 '{"tier":"gold","newsletter":false,"country":"US"}',  '2024-01-11 14:03:00'),
('alan.turing@example.com',     'Alan Turing',       1, '["beta","research"]',     '{"tier":"silver","newsletter":true,"country":"UK"}', '2024-01-19 08:45:00'),
('katherine.j@example.com',     'Katherine Johnson', 1, '["vip","loyal"]',         '{"tier":"gold","newsletter":true,"country":"US"}',   '2024-02-02 17:22:00'),
('linus.t@example.com',         'Linus Torvalds',    1, '["power-user"]',          '{"tier":"silver","newsletter":false,"country":"FI"}','2024-02-14 11:31:00'),
('margaret.h@example.com',      'Margaret Hamilton', 1, '["vip","early-adopter"]', '{"tier":"gold","newsletter":true,"country":"US"}',   '2024-02-21 19:08:00'),
('donald.k@example.com',        'Donald Knuth',      1, '["research"]',            '{"tier":"silver","newsletter":true,"country":"US"}', '2024-03-03 07:55:00'),
('barbara.l@example.com',       'Barbara Liskov',    1, '["vip"]',                 '{"tier":"gold","newsletter":false,"country":"US"}',  '2024-03-12 13:40:00'),
('tim.bl@example.com',          'Tim Berners-Lee',   1, '["beta"]',                '{"tier":"silver","newsletter":true,"country":"UK"}', '2024-03-25 10:17:00'),
('guido.vr@example.com',        'Guido van Rossum',  1, '["power-user","beta"]',   '{"tier":"gold","newsletter":true,"country":"NL"}',   '2024-04-04 16:29:00'),
('dennis.r@example.com',        'Dennis Ritchie',    0, '["legacy"]',              '{"tier":"bronze","newsletter":false,"country":"US"}','2024-04-15 09:00:00'),
('ken.t@example.com',           'Ken Thompson',      1, '["power-user"]',          '{"tier":"silver","newsletter":false,"country":"US"}','2024-04-27 12:12:00'),
('john.mccarthy@example.com',   'John McCarthy',     1, '["research"]',            '{"tier":"bronze","newsletter":true,"country":"US"}', '2024-05-06 18:44:00'),
('edsger.d@example.com',        'Edsger Dijkstra',   1, '["vip","research"]',      '{"tier":"gold","newsletter":true,"country":"NL"}',   '2024-05-18 08:33:00'),
('claude.s@example.com',        'Claude Shannon',    1, '["early-adopter"]',       '{"tier":"silver","newsletter":true,"country":"US"}', '2024-05-29 15:21:00'),
('john.vn@example.com',         'John von Neumann',  1, '["vip"]',                 '{"tier":"gold","newsletter":false,"country":"HU"}',  '2024-06-08 11:09:00'),
('adele.g@example.com',         'Adele Goldberg',    1, '["beta","loyal"]',        '{"tier":"silver","newsletter":true,"country":"US"}', '2024-06-19 14:50:00'),
('frances.a@example.com',       'Frances Allen',     1, '["research","loyal"]',    '{"tier":"bronze","newsletter":true,"country":"US"}', '2024-06-30 09:38:00'),
('niklaus.w@example.com',       'Niklaus Wirth',     0, '["legacy"]',              '{"tier":"bronze","newsletter":false,"country":"CH"}','2024-07-09 17:04:00'),
('vint.c@example.com',          'Vint Cerf',         1, '["vip","early-adopter"]', '{"tier":"gold","newsletter":true,"country":"US"}',   '2024-07-20 10:26:00');

-- ---------------------------------------------------------------------------
-- Seed: orders (20)
-- ---------------------------------------------------------------------------

INSERT INTO orders (customer_id, order_no, status, total, notes, placed_at) VALUES
( 1, 'ORD-1001', 'paid',      129.98, 'Gift wrap requested',   '2024-03-01 10:00:00'),
( 1, 'ORD-1002', 'shipped',    59.99, NULL,                    '2024-04-12 12:30:00'),
( 2, 'ORD-1003', 'paid',      249.50, 'Expedited shipping',    '2024-03-15 09:15:00'),
( 3, 'ORD-1004', 'pending',    19.99, NULL,                    '2024-05-01 14:45:00'),
( 4, 'ORD-1005', 'shipped',   399.00, 'Signature on delivery', '2024-04-02 11:20:00'),
( 5, 'ORD-1006', 'cancelled',  89.90, 'Customer changed mind', '2024-04-20 16:05:00'),
( 6, 'ORD-1007', 'paid',      175.25, NULL,                    '2024-05-10 08:50:00'),
( 7, 'ORD-1008', 'refunded',   45.00, 'Damaged in transit',    '2024-05-22 13:10:00'),
( 8, 'ORD-1009', 'paid',      612.75, 'Bulk order',            '2024-06-01 10:40:00'),
( 9, 'ORD-1010', 'shipped',    32.49, NULL,                    '2024-06-05 15:55:00'),
(10, 'ORD-1011', 'paid',      148.00, NULL,                    '2024-06-11 09:30:00'),
(12, 'ORD-1012', 'pending',    74.99, 'Awaiting payment',      '2024-06-18 12:00:00'),
(14, 'ORD-1013', 'paid',      299.99, 'Corporate account',     '2024-06-24 17:25:00'),
(15, 'ORD-1014', 'shipped',    21.00, NULL,                    '2024-06-28 11:11:00'),
(16, 'ORD-1015', 'paid',      450.00, 'Priority handling',     '2024-07-01 08:00:00'),
(17, 'ORD-1016', 'pending',    64.50, NULL,                    '2024-07-05 14:20:00'),
(18, 'ORD-1017', 'paid',      110.10, NULL,                    '2024-07-08 10:45:00'),
(20, 'ORD-1018', 'shipped',   205.80, 'Fragile',               '2024-07-12 16:30:00'),
( 4, 'ORD-1019', 'paid',       88.88, 'Repeat customer',       '2024-07-15 09:05:00'),
( 6, 'ORD-1020', 'paid',      133.33, NULL,                    '2024-07-18 13:50:00');

-- ---------------------------------------------------------------------------
-- Seed: order_items (~35)
-- ---------------------------------------------------------------------------

INSERT INTO order_items (order_id, sku, description, quantity, unit_price) VALUES
( 1, 'SKU-KB-01',  'Mechanical keyboard, brown switches', 1,  89.99),
( 1, 'SKU-MP-01',  'Desk mouse pad, XL',                  2,  19.99),
( 2, 'SKU-CB-USB', 'USB-C cable, 2m',                     1,  12.99),
( 2, 'SKU-HUB-01', 'USB-C hub, 7-port',                   1,  46.99),
( 3, 'SKU-MON-27', '27-inch IPS monitor',                 1, 229.50),
( 3, 'SKU-CB-DP',  'DisplayPort cable, 1.5m',             1,  20.00),
( 4, 'SKU-STK-01', 'Sticker pack, dev-themed',            1,  19.99),
( 5, 'SKU-CHR-01', 'Ergonomic office chair',              1, 379.00),
( 5, 'SKU-CB-USB', 'USB-C cable, 2m',                     1,  12.99),
( 6, 'SKU-LMP-01', 'Desk lamp, LED dimmable',             1,  89.90),
( 7, 'SKU-KB-02',  'Mechanical keyboard, blue switches',  1,  95.25),
( 7, 'SKU-WR-01',  'Wrist rest, memory foam',             2,  40.00),
( 8, 'SKU-STK-01', 'Sticker pack, dev-themed',            1,  19.99),
( 8, 'SKU-MUG-01', 'Coffee mug, 350ml',                   1,  25.01),
( 9, 'SKU-DSK-01', 'Standing desk, 140cm',                1, 549.75),
( 9, 'SKU-CB-USB', 'USB-C cable, 2m',                     3,  12.99),
( 9, 'SKU-MP-01',  'Desk mouse pad, XL',                  1,  19.99),
(10, 'SKU-CB-HD',  'HDMI cable, 1m',                      1,  10.50),
(10, 'SKU-CB-USB', 'USB-C cable, 2m',                     1,  12.99),
(10, 'SKU-STK-01', 'Sticker pack, dev-themed',            1,   9.00),
(11, 'SKU-WCM-01', 'Webcam, 1080p',                       1,  68.00),
(11, 'SKU-MIC-01', 'USB microphone',                      1,  80.00),
(12, 'SKU-HUB-01', 'USB-C hub, 7-port',                   1,  46.99),
(12, 'SKU-CB-USB', 'USB-C cable, 2m',                     1,  12.99),
(12, 'SKU-STK-01', 'Sticker pack, dev-themed',            1,  15.01),
(13, 'SKU-MON-27', '27-inch IPS monitor',                 1, 229.99),
(13, 'SKU-STD-01', 'Monitor arm, single',                 1,  70.00),
(15, 'SKU-DSK-01', 'Standing desk, 140cm',                1, 450.00),
(16, 'SKU-WR-01',  'Wrist rest, memory foam',             1,  20.00),
(16, 'SKU-MP-01',  'Desk mouse pad, XL',                  1,  44.50),
(17, 'SKU-MUG-01', 'Coffee mug, 350ml',                   2,  25.05),
(17, 'SKU-STK-01', 'Sticker pack, dev-themed',            1,  60.00),
(18, 'SKU-MON-27', '27-inch IPS monitor',                 1, 205.80),
(19, 'SKU-KB-01',  'Mechanical keyboard, brown switches', 1,  88.88),
(20, 'SKU-CHR-01', 'Ergonomic office chair',              1, 133.33);
