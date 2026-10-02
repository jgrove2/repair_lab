// Shared entity types for Repair Lab.
// DUMMY schema only — IDs are nanoid strings (TEXT PRIMARY KEY).

export type ItemStatus =
  | "sourced"
  | "purchased"
  | "in_repair"
  | "ready_to_sell"
  | "listed"
  | "sold";

export type TicketStatus =
  | "open"
  | "in_progress"
  | "blocked"
  | "resolved"
  | "closed";

export type CandidateStatus = "new" | "rejected" | "approved" | "purchased";

export type LocationType = "drawer" | "bin" | "shelf" | "box" | "other";

export interface Item {
  id: string;
  title: string;
  category: string;
  condition: string | null;
  status: ItemStatus;
  serial_number: string | null;
  purchase_price: number | null;
  purchase_date: string | null;
  purchased_from: string | null;
  sell_price: number | null;
  sold_date: string | null;
  location_id: string | null;
  ebay_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  name: string;
  type: LocationType;
  parent_id: string | null;
  sort_order: number;
}

export interface Ticket {
  id: string;
  item_id: string | null;
  title: string;
  status: TicketStatus;
  priority: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketNote {
  id: string;
  ticket_id: string;
  body: string;
  created_at: string;
}

export interface TicketPhoto {
  id: string;
  ticket_id: string;
  r2_key: string;
  caption: string | null;
  created_at: string;
}

export interface Component {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  location_id: string | null;
  cost_per_unit: number | null;
  sku: string | null;
}

export interface TicketComponent {
  id: string;
  ticket_id: string;
  component_id: string | null;
  description: string | null;
  quantity: number;
}

export interface Preference {
  id: string;
  name: string;
  search_terms: string;
  category: string | null;
  max_price: number | null;
  condition: string | null;
  active: number;
  priority: number;
  last_run_at: string | null;
}

export interface Candidate {
  id: string;
  preference_id: string | null;
  ebay_item_id: string | null;
  title: string;
  price: number | null;
  listing_url: string | null;
  status: CandidateStatus;
  discovered_at: string;
}

// A component joined with its location's display name, as returned by the
// inventory list endpoint.
export interface ComponentListItem extends Component {
  location_name: string | null;
}

// Generic envelope for server-side paginated list endpoints.
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}
