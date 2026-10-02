import { z } from "zod";

export const itemStatusSchema = z.enum([
  "sourced",
  "purchased",
  "in_repair",
  "ready_to_sell",
  "listed",
  "sold",
]);

export const ticketStatusSchema = z.enum([
  "open",
  "in_progress",
  "blocked",
  "resolved",
  "closed",
]);

export const candidateStatusSchema = z.enum([
  "new",
  "rejected",
  "approved",
  "purchased",
]);

export const locationTypeSchema = z.enum([
  "drawer",
  "bin",
  "shelf",
  "box",
  "other",
]);

export const itemSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string(),
  condition: z.string().nullable(),
  status: itemStatusSchema,
  serial_number: z.string().nullable(),
  purchase_price: z.number().nullable(),
  purchase_date: z.string().nullable(),
  purchased_from: z.string().nullable(),
  sell_price: z.number().nullable(),
  sold_date: z.string().nullable(),
  location_id: z.string().nullable(),
  ebay_url: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const itemCreateSchema = z.object({
  title: z.string().min(1),
  category: z.string().min(1),
  condition: z.string().optional(),
  status: itemStatusSchema.optional(),
  serial_number: z.string().optional(),
  purchase_price: z.number().optional(),
  purchase_date: z.string().optional(),
  purchased_from: z.string().optional(),
  sell_price: z.number().optional(),
  sold_date: z.string().optional(),
  location_id: z.string().optional(),
  ebay_url: z.string().optional(),
  notes: z.string().optional(),
});

export const itemUpdateSchema = itemCreateSchema.partial();

export const locationSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: locationTypeSchema,
  parent_id: z.string().nullable(),
  sort_order: z.number(),
});

export const locationCreateSchema = z.object({
  name: z.string().min(1),
  type: locationTypeSchema.optional(),
  parent_id: z.string().optional(),
  sort_order: z.number().optional(),
});

export const locationUpdateSchema = locationCreateSchema.partial();

export const ticketSchema = z.object({
  id: z.string(),
  item_id: z.string().nullable(),
  title: z.string(),
  status: ticketStatusSchema,
  priority: z.number(),
  description: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ticketCreateSchema = z.object({
  item_id: z.string().optional(),
  title: z.string().min(1),
  status: ticketStatusSchema.optional(),
  priority: z.number().optional(),
  description: z.string().optional(),
});

export const ticketUpdateSchema = ticketCreateSchema.partial();

export const ticketNoteSchema = z.object({
  id: z.string(),
  ticket_id: z.string(),
  body: z.string(),
  created_at: z.string(),
});

export const ticketNoteCreateSchema = z.object({
  body: z.string().min(1),
});

export const ticketPhotoSchema = z.object({
  id: z.string(),
  ticket_id: z.string(),
  r2_key: z.string(),
  caption: z.string().nullable(),
  created_at: z.string(),
});

export const ticketPhotoCreateSchema = z.object({
  r2_key: z.string().min(1),
  caption: z.string().optional(),
});

export const componentSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().nullable(),
  quantity: z.number(),
  location_id: z.string().nullable(),
  cost_per_unit: z.number().nullable(),
  sku: z.string().nullable(),
});

export const componentCreateSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  quantity: z.number().int().optional(),
  location_id: z.string().optional(),
  cost_per_unit: z.number().optional(),
  sku: z.string().optional(),
});

export const componentUpdateSchema = componentCreateSchema.partial();

// Payload for the inventory "add component" flow. Resolves (and optionally
// creates) a location by name, then increments the matching component or
// inserts a new one. `name` identifies the component; `quantity` is the amount
// to add.
export const componentUpsertSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().min(1).optional(),
  location_id: z.string().min(1).optional(),
  location_name: z.string().min(1).optional(),
  location_type: locationTypeSchema.optional(),
});

export const ticketComponentSchema = z.object({
  id: z.string(),
  ticket_id: z.string(),
  component_id: z.string().nullable(),
  description: z.string().nullable(),
  quantity: z.number(),
});

export const ticketComponentCreateSchema = z.object({
  component_id: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().int().min(1).optional(),
});

export const preferenceSchema = z.object({
  id: z.string(),
  name: z.string(),
  search_terms: z.string(),
  category: z.string().nullable(),
  max_price: z.number().nullable(),
  condition: z.string().nullable(),
  active: z.number(),
  priority: z.number(),
  last_run_at: z.string().nullable(),
});

export const preferenceCreateSchema = z.object({
  name: z.string().min(1),
  search_terms: z.string().min(1),
  category: z.string().optional(),
  max_price: z.number().optional(),
  condition: z.string().optional(),
  active: z.number().int().min(0).max(1).optional(),
  priority: z.number().int().optional(),
  last_run_at: z.string().optional(),
});

export const preferenceUpdateSchema = preferenceCreateSchema.partial();

export const candidateSchema = z.object({
  id: z.string(),
  preference_id: z.string().nullable(),
  ebay_item_id: z.string().nullable(),
  title: z.string(),
  price: z.number().nullable(),
  listing_url: z.string().nullable(),
  status: candidateStatusSchema,
  discovered_at: z.string(),
});

export const candidateCreateSchema = z.object({
  preference_id: z.string().optional(),
  ebay_item_id: z.string().optional(),
  title: z.string().min(1),
  price: z.number().optional(),
  listing_url: z.string().optional(),
  status: candidateStatusSchema.optional(),
});

export const candidateUpdateSchema = candidateCreateSchema.partial();

// Inferred TS types from zod (complements src/types.ts)
export type ItemInput = z.infer<typeof itemCreateSchema>;
export type TicketInput = z.infer<typeof ticketCreateSchema>;
export type PreferenceInput = z.infer<typeof preferenceCreateSchema>;
export type LocationInput = z.infer<typeof locationCreateSchema>;
export type ComponentInput = z.infer<typeof componentCreateSchema>;
export type ComponentUpsertInput = z.infer<typeof componentUpsertSchema>;
export type CandidateInput = z.infer<typeof candidateCreateSchema>;
