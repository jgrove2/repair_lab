-- Manually-entered sold consoles. Independent of the agent's listings table and
-- of inventory `items`: each row is one console you actually sold, with the
-- price and the accessories it included. `product` is the broad product key
-- (e.g. "wii"); `sub_product_code` is an optional finer model code used to
-- narrow averages.
CREATE TABLE sold_records (
    id                  TEXT PRIMARY KEY,
    product             TEXT NOT NULL,
    sub_product_code    TEXT,
    sold_price          REAL NOT NULL,
    sold_date           TEXT NOT NULL DEFAULT (date('now')),
    includes_controllers INTEGER NOT NULL DEFAULT 0,
    includes_games      INTEGER NOT NULL DEFAULT 0,
    includes_cords      INTEGER NOT NULL DEFAULT 0,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX sold_records_product_idx ON sold_records(product);
CREATE INDEX sold_records_sub_product_idx ON sold_records(product, sub_product_code);
CREATE INDEX sold_records_sold_date_idx ON sold_records(sold_date);
