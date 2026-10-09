-- Listings surfaced by the research agent. Each row is one accepted eBay
-- listing, flattened from the agent's per-product JSON output. `product` is the
-- top-level key (e.g. "wii"); `item_id` is the eBay item id and is unique so
-- re-running the agent refreshes rows instead of duplicating them.
CREATE TABLE listings (
    id                  TEXT PRIMARY KEY,
    product             TEXT NOT NULL,
    item_id             TEXT NOT NULL,
    title               TEXT NOT NULL,
    short_description   TEXT,
    price               REAL,
    currency            TEXT,
    url                 TEXT,
    condition           TEXT,
    shipping_cost       REAL,
    shipping_currency   TEXT,
    shipping_cost_type  TEXT,
    total_cost          REAL,
    includes_controllers INTEGER NOT NULL DEFAULT 0,
    includes_games      INTEGER NOT NULL DEFAULT 0,
    includes_cords      INTEGER NOT NULL DEFAULT 0,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX listings_item_id_idx ON listings(item_id);
CREATE INDEX listings_product_idx ON listings(product);
