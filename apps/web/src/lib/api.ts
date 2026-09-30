// Tiny typed fetch wrapper for the Worker API.
//
// Env (baked at `vite build` time, see .env.development/.env.staging/.env.production):
//   VITE_APP_ENV  development | staging | production  (UI badge)
//   VITE_API_BASE /api (local proxy) or https://<worker-host> (Pages)
//   VITE_MOCK     true = placeholder data, no backend needed
import type {
  Candidate,
  Component,
  Item,
  Preference,
  Ticket,
} from "@repair-lab/shared";

export const APP_ENV: string =
  import.meta.env.VITE_APP_ENV ?? "development";

export const MOCK: boolean =
  (import.meta.env.VITE_MOCK ?? "true") !== "false";

const API_BASE: string = import.meta.env.VITE_API_BASE ?? "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return (await res.json()) as T;
}

export const api = {
  items: () => get<Item[]>("/items"),
  item: (id: string) => get<Item>(`/items/${id}`),
  tickets: () => get<Ticket[]>("/tickets"),
  ticket: (id: string) => get<Ticket>(`/tickets/${id}`),
  ticketNotes: (id: string) => get<{ id: string; body: string }[]>(`/tickets/${id}/notes`),
  components: () => get<Component[]>("/components"),
  preferences: () => get<Preference[]>("/preferences"),
  candidates: () => get<Candidate[]>("/candidates"),
  search: (q: string) =>
    get<{ items: Item[]; components: Component[] }>(`/search?q=${encodeURIComponent(q)}`),
};

// --- Dummy fallback data (renders when VITE_MOCK=true or backend is down) ---
export const mockItems: Item[] = [
  {
    id: "item-ps2-parts",
    title: "For Parts PS2 (Dummy)",
    category: "PS2",
    condition: "for_parts",
    status: "purchased",
    serial_number: "DUMMY-SN-PS2-001",
    purchase_price: 25,
    purchase_date: "2026-01-10",
    purchased_from: "dummy flea market",
    sell_price: null,
    sold_date: null,
    location_id: "loc-shelf-1",
    ebay_url: null,
    notes: "Dummy unit, disc read error.",
    created_at: "2026-01-10T00:00:00Z",
    updated_at: "2026-01-10T00:00:00Z",
  },
  {
    id: "item-gba-broken",
    title: "Broken Game Boy Advance (Dummy)",
    category: "Game Boy Advance",
    condition: "for_parts",
    status: "in_repair",
    serial_number: "DUMMY-SN-GBA-001",
    purchase_price: 18.5,
    purchase_date: "2026-02-02",
    purchased_from: "dummy friend",
    sell_price: null,
    sold_date: null,
    location_id: "loc-shelf-1",
    ebay_url: null,
    notes: "Dummy unit, no power.",
    created_at: "2026-02-02T00:00:00Z",
    updated_at: "2026-02-02T00:00:00Z",
  },
];

export const mockTickets: Ticket[] = [
  {
    id: "tkt-ps2-laser",
    item_id: "item-ps2-parts",
    title: "PS2 laser swap (dummy)",
    status: "in_progress",
    priority: 1,
    description: "Dummy ticket: replace laser, clean lens.",
    created_at: "2026-01-11T00:00:00Z",
    updated_at: "2026-01-11T00:00:00Z",
  },
  {
    id: "tkt-gba-screen",
    item_id: "item-gba-broken",
    title: "GBA no-power diagnosis (dummy)",
    status: "open",
    priority: 2,
    description: "Dummy ticket: check fuse F1, power switch.",
    created_at: "2026-02-03T00:00:00Z",
    updated_at: "2026-02-03T00:00:00Z",
  },
];

export const mockPreferences: Preference[] = [
  {
    id: "pref-gba-cheap",
    name: "Broken GBA under $40 (dummy)",
    search_terms: "game boy advance broken for parts",
    category: "Game Boy Advance",
    max_price: 40,
    condition: "for_parts",
    active: 1,
    priority: 10,
    last_run_at: null,
  },
  {
    id: "pref-ps2-parts",
    name: "Cheap PS2 parts (dummy)",
    search_terms: "ps2 for parts broken",
    category: "PS2",
    max_price: 30,
    condition: "for_parts",
    active: 1,
    priority: 5,
    last_run_at: null,
  },
];
