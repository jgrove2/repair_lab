// Seed script — DUMMY data ONLY. No real eBay URLs, no real serials.
//
// Runnable via: `pnpm --filter api seed`
// Idempotent-ish: emits DELETEs before INSERTs on fixed dummy IDs, then
// prints the SQL so you can apply it with:
//   wrangler d1 execute repair-lab-db --local --file ./seed.sql
//   wrangler d1 execute repair-lab-db --remote --file ./seed.sql
//
// For now the script only writes `seed.sql` next to this file and logs
// counts. Wiring a direct D1 client is a future TODO.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = join(here, "seed.sql");

function esc(v: string | null): string {
  if (v === null) return "NULL";
  return `'${v.replace(/'/g, "''")}'`;
}
function num(v: number | null): string {
  return v === null ? "NULL" : String(v);
}

// Fixed dummy IDs so re-seeding overwrites the same rows.
const LOC = ["loc-drawer-a1", "loc-bin-2", "loc-shelf-1", "loc-box-misc"];
const COMP = ["cmp-cap-100uf", "cmp-dslite-screen", "cmp-gba-ribbon", "cmp-shell-gba", "cmp-ps2-laser", "cmp-battery-cr2032", "cmp-screw-kit"];
const ITEM = ["item-ps2-parts", "item-gba-broken", "item-dslite-broken"];
const TICKET = ["tkt-ps2-laser", "tkt-gba-screen"];
const PREF = ["pref-gba-cheap", "pref-ps2-parts"];
const CAND = ["cand-gba-1", "cand-ps2-1"];

const deletes = [
  "DELETE FROM candidates;",
  "DELETE FROM preferences;",
  "DELETE FROM ticket_components;",
  "DELETE FROM ticket_notes;",
  "DELETE FROM ticket_photos;",
  "DELETE FROM tickets;",
  "DELETE FROM items;",
  "DELETE FROM components;",
  "DELETE FROM locations;",
];

const inserts: string[] = [
  // Locations
  `INSERT INTO locations (id, name, type, sort_order) VALUES ('${LOC[0]}', 'Drawer A1', 'drawer', 1);`,
  `INSERT INTO locations (id, name, type, sort_order) VALUES ('${LOC[1]}', 'Component Bin 2', 'bin', 2);`,
  `INSERT INTO locations (id, name, type, sort_order) VALUES ('${LOC[2]}', 'Shelf 1', 'shelf', 3);`,
  `INSERT INTO locations (id, name, type, sort_order) VALUES ('${LOC[3]}', 'Misc Box', 'box', 4);`,

  // Components (dummy parts)
  `INSERT INTO components (id, name, category, quantity, location_id, cost_per_unit, sku) VALUES ('${COMP[0]}', 'Dummy Capacitor 100uF', 'capacitor', 25, '${LOC[1]}', 0.35, 'DUMMY-CAP-100UF');`,
  `INSERT INTO components (id, name, category, quantity, location_id, cost_per_unit, sku) VALUES ('${COMP[1]}', 'Dummy DS Lite Screen', 'screen', 2, '${LOC[0]}', 8.5, 'DUMMY-DSL-SCR');`,
  `INSERT INTO components (id, name, category, quantity, location_id, cost_per_unit, sku) VALUES ('${COMP[2]}', 'Dummy GBA Ribbon Cable', 'ribbon', 5, '${LOC[1]}', 3.0, 'DUMMY-GBA-RIB');`,
  `INSERT INTO components (id, name, category, quantity, location_id, cost_per_unit, sku) VALUES ('${COMP[3]}', 'Dummy GBA Shell (Blue)', 'shell', 3, '${LOC[2]}', 6.0, 'DUMMY-GBA-SHL');`,
  `INSERT INTO components (id, name, category, quantity, location_id, cost_per_unit, sku) VALUES ('${COMP[4]}', 'Dummy PS2 Laser Assembly', 'laser', 1, '${LOC[0]}', 12.0, 'DUMMY-PS2-LSR');`,
  `INSERT INTO components (id, name, category, quantity, location_id, cost_per_unit, sku) VALUES ('${COMP[5]}', 'Dummy CR2032 Battery', 'battery', 10, '${LOC[1]}', 0.5, 'DUMMY-CR2032');`,
  `INSERT INTO components (id, name, category, quantity, location_id, cost_per_unit, sku) VALUES ('${COMP[6]}', 'Dummy Screw Kit', 'hardware', 4, '${LOC[3]}', 2.0, 'DUMMY-SCREW');`,

  // Items (dummy consoles)
  `INSERT INTO items (id, title, category, condition, status, serial_number, purchase_price, purchase_date, purchased_from, location_id, ebay_url, notes) VALUES ('${ITEM[0]}', 'For Parts PS2 (Dummy)', 'PS2', 'for_parts', 'purchased', 'DUMMY-SN-PS2-001', 25.0, '2026-01-10', 'dummy flea market', '${LOC[2]}', ${esc(null)}, 'Dummy unit, disc read error.');`,
  `INSERT INTO items (id, title, category, condition, status, serial_number, purchase_price, purchase_date, purchased_from, location_id, ebay_url, notes) VALUES ('${ITEM[1]}', 'Broken Game Boy Advance (Dummy)', 'Game Boy Advance', 'for_parts', 'in_repair', 'DUMMY-SN-GBA-001', 18.5, '2026-02-02', 'dummy friend', '${LOC[2]}', ${esc(null)}, 'Dummy unit, no power.');`,
  `INSERT INTO items (id, title, category, condition, status, serial_number, purchase_price, purchase_date, purchased_from, location_id, ebay_url, notes) VALUES ('${ITEM[2]}', 'Cracked DS Lite (Dummy)', 'Nintendo DS', 'for_parts', 'listed', 'DUMMY-SN-DSL-001', ${num(null)}, ${esc(null)}, ${esc(null)}, ${esc(null)}, ${esc(null)}, 'Dummy unit, top screen cracked.');`,

  // Tickets
  `INSERT INTO tickets (id, item_id, title, status, priority, description) VALUES ('${TICKET[0]}', '${ITEM[0]}', 'PS2 laser swap (dummy)', 'in_progress', 1, 'Dummy ticket: replace laser, clean lens.');`,
  `INSERT INTO tickets (id, item_id, title, status, priority, description) VALUES ('${TICKET[1]}', '${ITEM[1]}', 'GBA no-power diagnosis (dummy)', 'open', 2, 'Dummy ticket: check fuse F1, power switch.');`,

  // Notes
  `INSERT INTO ticket_notes (id, ticket_id, body) VALUES ('note-ps2-1', '${TICKET[0]}', 'Dummy note: lens cleaned, still DRE. Ordering laser.');`,
  `INSERT INTO ticket_notes (id, ticket_id, body) VALUES ('note-ps2-2', '${TICKET[0]}', 'Dummy note: laser arrived in Bin 2.');`,
  `INSERT INTO ticket_notes (id, ticket_id, body) VALUES ('note-gba-1', '${TICKET[1]}', 'Dummy note: battery contacts corroded, cleaned.');`,

  // Preferences
  `INSERT INTO preferences (id, name, search_terms, category, max_price, condition, active, priority) VALUES ('${PREF[0]}', 'Broken GBA under $40 (dummy)', 'game boy advance broken for parts', 'Game Boy Advance', 40.0, 'for_parts', 1, 10);`,
  `INSERT INTO preferences (id, name, search_terms, category, max_price, condition, active, priority) VALUES ('${PREF[1]}', 'Cheap PS2 parts (dummy)', 'ps2 for parts broken', 'PS2', 30.0, 'for_parts', 1, 5);`,

  // Candidates (fake listings — NOT real eBay URLs)
  `INSERT INTO candidates (id, preference_id, ebay_item_id, title, price, listing_url, status) VALUES ('${CAND[0]}', '${PREF[0]}', 'DUMMY-EBAY-001', 'Dummy GBA lot for parts', 27.99, 'https://example.invalid/dummy-gba-1', 'new');`,
  `INSERT INTO candidates (id, preference_id, ebay_item_id, title, price, listing_url, status) VALUES ('${CAND[1]}', '${PREF[1]}', 'DUMMY-EBAY-002', 'Dummy PS2 console untested', 22.5, 'https://example.invalid/dummy-ps2-1', 'new');`,
];

const sql = [...deletes, ...inserts].join("\n") + "\n";
writeFileSync(outPath, sql);

console.log(`Wrote ${outPath}`);
console.log("Dummy rows: 4 locations, 7 components, 3 items, 2 tickets, 3 notes, 2 preferences, 2 candidates.");
console.log("Apply with: wrangler d1 execute repair-lab-db --local --file ./apps/api/scripts/seed.sql");
