-- Core item being repaired/sold
CREATE TABLE items (
    id              TEXT PRIMARY KEY,           -- nanoid/uuid
    title           TEXT NOT NULL,
    category        TEXT NOT NULL,              -- "PS2", "Game Boy Advance", ...
    condition       TEXT,                       -- "for_parts", "working", ...
    status          TEXT NOT NULL DEFAULT 'sourced'
                    CHECK (status IN ('listed','purchased','in_repair','ready_to_sell','listed','sold')),
    serial_number   TEXT,
    purchase_price  REAL,
    purchase_date   TEXT,                        -- ISO date string
    purchased_from  TEXT,
    sell_price      REAL,
    sold_date       TEXT,
    location_id     TEXT REFERENCES locations(id),
    ebay_url        TEXT,
    notes           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Storage locations (drawers/bins/shelves)
CREATE TABLE locations (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL DEFAULT 'drawer'
                CHECK (type IN ('drawer','bin','shelf','box','other')),
    parent_id   TEXT REFERENCES locations(id),
    sort_order  INTEGER DEFAULT 0
);

-- Repair work items
CREATE TABLE tickets (
    id          TEXT PRIMARY KEY,
    item_id     TEXT REFERENCES items(id),
    title       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'open'
                CHECK (status IN ('open','in_progress','blocked','resolved','closed')),
    priority    INTEGER DEFAULT 0,
    description TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ticket_notes (
    id          TEXT PRIMARY KEY,
    ticket_id   TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    body        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE ticket_photos (
    id          TEXT PRIMARY KEY,
    ticket_id   TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    r2_key      TEXT NOT NULL,                  -- object key in R2
    caption     TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Replacement parts / components in drawers
CREATE TABLE components (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    category      TEXT,                         -- "capacitor","screen","ribbon","shell"
    quantity      INTEGER NOT NULL DEFAULT 0,
    location_id   TEXT REFERENCES locations(id),
    cost_per_unit REAL,
    sku           TEXT
);

-- Components consumed by a repair
CREATE TABLE ticket_components (
    id           TEXT PRIMARY KEY,
    ticket_id    TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    component_id TEXT REFERENCES components(id),
    description  TEXT,                          -- for parts not in inventory
    quantity     INTEGER NOT NULL DEFAULT 1
);

-- Sourcing preferences (drives the agent)
CREATE TABLE preferences (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    search_terms  TEXT NOT NULL,
    category      TEXT,
    max_price     REAL,
    condition     TEXT,                          -- "for_parts","used",...
    active        INTEGER NOT NULL DEFAULT 1,    -- SQLite has no bool
    priority      INTEGER DEFAULT 0,
    last_run_at   TEXT
);

-- Candidates surfaced by the agent for review
CREATE TABLE candidates (
    id            TEXT PRIMARY KEY,
    preference_id TEXT REFERENCES preferences(id),
    ebay_item_id  TEXT,
    title         TEXT NOT NULL,
    price         REAL,
    listing_url   TEXT,
    status        TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','rejected','approved','purchased')),
    discovered_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Full-text search (FTS5) ────────────────────────────────

CREATE VIRTUAL TABLE items_fts USING fts5(
    title, category, notes, serial_number,
    content='items', content_rowid='rowid'
);

CREATE VIRTUAL TABLE components_fts USING fts5(
    name, category, sku,
    content='components', content_rowid='rowid'
);

-- Keep FTS in sync with items
CREATE TRIGGER items_ai AFTER INSERT ON items BEGIN
    INSERT INTO items_fts(rowid, title, category, notes, serial_number)
    VALUES (new.rowid, new.title, new.category, new.notes, new.serial_number);
END;
CREATE TRIGGER items_ad AFTER DELETE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, title, category, notes, serial_number)
    VALUES ('delete', old.rowid, old.title, old.category, old.notes, old.serial_number);
END;
CREATE TRIGGER items_au AFTER UPDATE ON items BEGIN
    INSERT INTO items_fts(items_fts, rowid, title, category, notes, serial_number)
    VALUES ('delete', old.rowid, old.title, old.category, old.notes, old.serial_number);
    INSERT INTO items_fts(rowid, title, category, notes, serial_number)
    VALUES (new.rowid, new.title, new.category, new.notes, new.serial_number);
END;
