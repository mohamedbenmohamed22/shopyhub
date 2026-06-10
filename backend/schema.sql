-- ============================================================================
-- Product of the Week — PostgreSQL schema (DDL)
-- Target: PostgreSQL 16
-- Mirrors the domain in src/data/products.ts and src/pages/ProductPage.tsx
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";     -- case-insensitive email/name

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
CREATE TYPE product_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE order_status   AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');
CREATE TYPE payment_method AS ENUM ('cash_on_delivery');
CREATE TYPE sub_status     AS ENUM ('subscribed', 'unsubscribed');
CREATE TYPE admin_role     AS ENUM ('admin', 'staff');

-- ----------------------------------------------------------------------------
-- Reference: categories
-- ----------------------------------------------------------------------------
CREATE TABLE categories (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name        citext NOT NULL UNIQUE,
    slug        text   NOT NULL UNIQUE,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Reference: Tunisian governorates (+ delivery fee per zone)
-- ----------------------------------------------------------------------------
CREATE TABLE governorates (
    id            smallserial PRIMARY KEY,
    name          text    NOT NULL UNIQUE,
    delivery_fee  numeric(8,3) NOT NULL DEFAULT 7.000,   -- TND
    active        boolean NOT NULL DEFAULT true
);

-- ----------------------------------------------------------------------------
-- Products
-- ----------------------------------------------------------------------------
CREATE TABLE products (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug               text NOT NULL UNIQUE,
    name               text NOT NULL,
    tagline            text NOT NULL,
    description        text NOT NULL,
    image_url          text NOT NULL,
    category_id        uuid REFERENCES categories(id) ON DELETE SET NULL,
    link               text,
    price              numeric(10,3),                    -- TND, nullable
    week_number        smallint,
    year               smallint,
    votes_count        integer NOT NULL DEFAULT 0,       -- denormalized
    is_current_winner  boolean NOT NULL DEFAULT false,
    status             product_status NOT NULL DEFAULT 'published',
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT price_non_negative CHECK (price IS NULL OR price >= 0),
    CONSTRAINT votes_non_negative CHECK (votes_count >= 0)
);

-- At most one current winner at any time.
CREATE UNIQUE INDEX uq_one_current_winner
    ON products (is_current_winner)
    WHERE is_current_winner = true;

CREATE INDEX idx_products_status   ON products (status);
CREATE INDEX idx_products_category ON products (category_id);

-- ----------------------------------------------------------------------------
-- Weekly editions ("Product of the Week" rotation)
-- ----------------------------------------------------------------------------
CREATE TABLE weekly_editions (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    week_number        smallint NOT NULL,
    year               smallint NOT NULL,
    winner_product_id  uuid REFERENCES products(id) ON DELETE SET NULL,
    voting_opens_at    timestamptz,
    voting_closes_at   timestamptz,
    created_at         timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_edition_week UNIQUE (year, week_number)
);

-- ----------------------------------------------------------------------------
-- Votes (one per voter per edition)
-- ----------------------------------------------------------------------------
CREATE TABLE votes (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id         uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    edition_id         uuid NOT NULL REFERENCES weekly_editions(id) ON DELETE CASCADE,
    voter_fingerprint  text NOT NULL,                    -- cookie/device hash
    ip_address         inet,
    created_at         timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT uq_one_vote_per_edition UNIQUE (edition_id, voter_fingerprint)
);

CREATE INDEX idx_votes_product ON votes (product_id);

-- ----------------------------------------------------------------------------
-- Orders (cash on delivery — guest checkout, customer snapshot embedded)
-- ----------------------------------------------------------------------------
CREATE TABLE orders (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number    text NOT NULL UNIQUE,                -- e.g. POW-2024-000123
    full_name       text NOT NULL,
    phone           text NOT NULL,                       -- ^(\+216)?[2459]\d{7}$
    governorate_id  smallint NOT NULL REFERENCES governorates(id),
    address         text NOT NULL,
    status          order_status   NOT NULL DEFAULT 'pending',
    payment_method  payment_method NOT NULL DEFAULT 'cash_on_delivery',
    subtotal        numeric(10,3) NOT NULL,
    delivery_fee    numeric(10,3) NOT NULL DEFAULT 0,
    total           numeric(10,3) NOT NULL,
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT phone_tn_format CHECK (phone ~ '^(\+216)?[2459][0-9]{7}$'),
    CONSTRAINT totals_non_negative CHECK (subtotal >= 0 AND delivery_fee >= 0 AND total >= 0)
);

CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_phone  ON orders (phone);
CREATE INDEX idx_orders_created ON orders (created_at DESC);

-- ----------------------------------------------------------------------------
-- Order items (line items with price snapshot)
-- ----------------------------------------------------------------------------
CREATE TABLE order_items (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id      uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id    uuid REFERENCES products(id) ON DELETE SET NULL,
    product_name  text NOT NULL,                         -- snapshot
    quantity      integer NOT NULL,
    unit_price    numeric(10,3) NOT NULL,                -- snapshot, TND
    line_total    numeric(10,3) NOT NULL,

    CONSTRAINT qty_bounds CHECK (quantity BETWEEN 1 AND 10)  -- matches FE 1..10
);

CREATE INDEX idx_order_items_order ON order_items (order_id);

-- ----------------------------------------------------------------------------
-- Newsletter subscribers
-- ----------------------------------------------------------------------------
CREATE TABLE subscribers (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email           citext NOT NULL UNIQUE,
    status          sub_status NOT NULL DEFAULT 'subscribed',
    confirmed       boolean NOT NULL DEFAULT false,
    created_at      timestamptz NOT NULL DEFAULT now(),
    unsubscribed_at timestamptz
);

-- ----------------------------------------------------------------------------
-- Admin users (back-office auth)
-- ----------------------------------------------------------------------------
CREATE TABLE admin_users (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email          citext NOT NULL UNIQUE,
    password_hash  text NOT NULL,                        -- bcrypt/argon2
    role           admin_role NOT NULL DEFAULT 'staff',
    created_at     timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- updated_at trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_orders_updated   BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- Seed: reference data
-- ============================================================================

-- Categories seen in src/data/products.ts
INSERT INTO categories (name, slug) VALUES
    ('AI & Design',     'ai-design'),
    ('Productivity',    'productivity'),
    ('Developer Tools', 'developer-tools'),
    ('Design',          'design'),
    ('AI & Audio',      'ai-audio')
ON CONFLICT DO NOTHING;

-- 24 Tunisian governorates (from ProductPage.tsx). Flat 7 TND default fee.
INSERT INTO governorates (name) VALUES
    ('Tunis'), ('Ariana'), ('Ben Arous'), ('Manouba'), ('Nabeul'), ('Zaghouan'),
    ('Bizerte'), ('Béja'), ('Jendouba'), ('Le Kef'), ('Siliana'), ('Sousse'),
    ('Monastir'), ('Mahdia'), ('Sfax'), ('Kairouan'), ('Kasserine'), ('Sidi Bouzid'),
    ('Gabès'), ('Medenine'), ('Tataouine'), ('Gafsa'), ('Tozeur'), ('Kebili')
ON CONFLICT DO NOTHING;
