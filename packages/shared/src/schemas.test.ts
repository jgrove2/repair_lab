import { describe, expect, it } from "vitest";
import {
  candidateCreateSchema,
  candidateSchema,
  candidateStatusSchema,
  componentCreateSchema,
  componentSchema,
  componentUpdateSchema,
  itemCreateSchema,
  itemSchema,
  itemStatusSchema,
  itemUpdateSchema,
  locationCreateSchema,
  locationSchema,
  locationTypeSchema,
  preferenceCreateSchema,
  preferenceSchema,
  preferenceUpdateSchema,
  ticketComponentCreateSchema,
  ticketComponentSchema,
  ticketCreateSchema,
  ticketNoteCreateSchema,
  ticketNoteSchema,
  ticketPhotoCreateSchema,
  ticketPhotoSchema,
  ticketSchema,
  ticketStatusSchema,
  ticketUpdateSchema,
  locationUpdateSchema,
} from "./schemas";

describe("enum schemas", () => {
  it("accepts valid item statuses", () => {
    for (const status of [
      "sourced",
      "purchased",
      "in_repair",
      "ready_to_sell",
      "listed",
      "sold",
    ]) {
      expect(itemStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("rejects invalid item status", () => {
    expect(itemStatusSchema.safeParse("unknown").success).toBe(false);
  });

  it("accepts valid ticket statuses", () => {
    for (const status of ["open", "in_progress", "blocked", "resolved", "closed"]) {
      expect(ticketStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("rejects invalid ticket status", () => {
    expect(ticketStatusSchema.safeParse("nope").success).toBe(false);
  });

  it("accepts valid candidate statuses", () => {
    for (const status of ["new", "rejected", "approved", "purchased"]) {
      expect(candidateStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("rejects invalid candidate status", () => {
    expect(candidateStatusSchema.safeParse("bad").success).toBe(false);
  });

  it("accepts valid location types", () => {
    for (const type of ["drawer", "bin", "shelf", "box", "other"]) {
      expect(locationTypeSchema.safeParse(type).success).toBe(true);
    }
  });

  it("rejects invalid location type", () => {
    expect(locationTypeSchema.safeParse("drawer2").success).toBe(false);
  });
});

describe("itemCreateSchema", () => {
  it("accepts minimal valid payload", () => {
    const result = itemCreateSchema.safeParse({ title: "PS2", category: "Console" });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    expect(itemCreateSchema.safeParse({ title: "", category: "Console" }).success).toBe(false);
  });

  it("rejects empty category", () => {
    expect(itemCreateSchema.safeParse({ title: "PS2", category: "" }).success).toBe(false);
  });

  it("rejects invalid status", () => {
    expect(
      itemCreateSchema.safeParse({ title: "PS2", category: "Console", status: "whatever" })
        .success,
    ).toBe(false);
  });

  it("rejects non-number purchase_price", () => {
    expect(
      itemCreateSchema.safeParse({ title: "PS2", category: "Console", purchase_price: "10" })
        .success,
    ).toBe(false);
  });
});

describe("itemUpdateSchema", () => {
  it("accepts empty object", () => {
    expect(itemUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("strips unknown keys", () => {
    const result = itemUpdateSchema.parse({ title: "Game Boy", bogus: true });
    expect(result).toEqual({ title: "Game Boy" });
    expect("bogus" in result).toBe(false);
  });
});

describe("locationCreateSchema", () => {
  it("accepts minimal valid payload", () => {
    expect(locationCreateSchema.safeParse({ name: "Drawer A" }).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(locationCreateSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects invalid type", () => {
    expect(
      locationCreateSchema.safeParse({ name: "Drawer A", type: "garage" }).success,
    ).toBe(false);
  });
});

describe("locationUpdateSchema", () => {
  it("accepts empty object", () => {
    expect(locationUpdateSchema.safeParse({}).success).toBe(true);
  });
});

describe("ticketCreateSchema", () => {
  it("accepts minimal valid payload", () => {
    expect(ticketCreateSchema.safeParse({ title: "Fix screen" }).success).toBe(true);
  });

  it("rejects empty title", () => {
    expect(ticketCreateSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("rejects invalid status", () => {
    expect(ticketCreateSchema.safeParse({ title: "Fix", status: "broken" }).success).toBe(false);
  });

  it("rejects non-number priority", () => {
    expect(ticketCreateSchema.safeParse({ title: "Fix", priority: "high" }).success).toBe(false);
  });
});

describe("ticketUpdateSchema", () => {
  it("accepts empty object", () => {
    expect(ticketUpdateSchema.safeParse({}).success).toBe(true);
  });
});

describe("ticketNoteCreateSchema", () => {
  it("accepts valid body", () => {
    expect(ticketNoteCreateSchema.safeParse({ body: "note" }).success).toBe(true);
  });

  it("rejects empty body", () => {
    expect(ticketNoteCreateSchema.safeParse({ body: "" }).success).toBe(false);
  });
});

describe("ticketPhotoCreateSchema", () => {
  it("accepts valid r2_key", () => {
    expect(ticketPhotoCreateSchema.safeParse({ r2_key: "photos/1.jpg" }).success).toBe(true);
  });

  it("rejects empty r2_key", () => {
    expect(ticketPhotoCreateSchema.safeParse({ r2_key: "" }).success).toBe(false);
  });
});

describe("componentCreateSchema", () => {
  it("accepts minimal valid payload", () => {
    expect(componentCreateSchema.safeParse({ name: "Capacitor" }).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(componentCreateSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects non-integer quantity", () => {
    expect(componentCreateSchema.safeParse({ name: "Cap", quantity: 1.5 }).success).toBe(false);
  });
});

describe("componentUpdateSchema", () => {
  it("accepts empty object", () => {
    expect(componentUpdateSchema.safeParse({}).success).toBe(true);
  });
});

describe("ticketComponentCreateSchema", () => {
  it("accepts minimal valid payload", () => {
    expect(ticketComponentCreateSchema.safeParse({ description: "part" }).success).toBe(true);
  });

  it("rejects quantity less than 1", () => {
    expect(
      ticketComponentCreateSchema.safeParse({ quantity: 0 }).success,
    ).toBe(false);
  });

  it("rejects non-integer quantity", () => {
    expect(
      ticketComponentCreateSchema.safeParse({ quantity: 1.5 }).success,
    ).toBe(false);
  });
});

describe("preferenceCreateSchema", () => {
  const valid = { name: "PS2 lots", search_terms: "playstation 2" };

  it("accepts minimal valid payload", () => {
    expect(preferenceCreateSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(preferenceCreateSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rejects empty search_terms", () => {
    expect(preferenceCreateSchema.safeParse({ ...valid, search_terms: "" }).success).toBe(false);
  });

  it("rejects active outside 0..1", () => {
    expect(preferenceCreateSchema.safeParse({ ...valid, active: 2 }).success).toBe(false);
    expect(preferenceCreateSchema.safeParse({ ...valid, active: -1 }).success).toBe(false);
  });

  it("rejects non-integer priority", () => {
    expect(preferenceCreateSchema.safeParse({ ...valid, priority: 1.5 }).success).toBe(false);
  });
});

describe("preferenceUpdateSchema", () => {
  it("accepts empty object", () => {
    expect(preferenceUpdateSchema.safeParse({}).success).toBe(true);
  });
});

describe("candidateCreateSchema", () => {
  it("accepts minimal valid payload", () => {
    expect(candidateCreateSchema.safeParse({ title: "PS2 console" }).success).toBe(true);
  });

  it("rejects empty title", () => {
    expect(candidateCreateSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("rejects invalid status", () => {
    expect(candidateCreateSchema.safeParse({ title: "x", status: "bad" }).success).toBe(false);
  });
});

describe("full-object schemas", () => {
  const fullItem = {
    id: "1",
    title: "PS2",
    category: "Console",
    condition: null,
    status: "sourced",
    serial_number: null,
    purchase_price: null,
    purchase_date: null,
    purchased_from: null,
    sell_price: null,
    sold_date: null,
    location_id: null,
    ebay_url: null,
    notes: null,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  };

  it("parses a full item", () => {
    expect(itemSchema.safeParse(fullItem).success).toBe(true);
  });

  it("rejects item missing required key", () => {
    const { id, ...rest } = fullItem;
    expect(itemSchema.safeParse(rest).success).toBe(false);
  });

  it("parses a full location", () => {
    expect(
      locationSchema.safeParse({
        id: "1",
        name: "Drawer",
        type: "drawer",
        parent_id: null,
        sort_order: 0,
      }).success,
    ).toBe(true);
  });

  it("parses a full ticket", () => {
    expect(
      ticketSchema.safeParse({
        id: "1",
        item_id: null,
        title: "Fix",
        status: "open",
        priority: 0,
        description: null,
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      }).success,
    ).toBe(true);
  });

  it("parses a full ticket note", () => {
    expect(
      ticketNoteSchema.safeParse({
        id: "1",
        ticket_id: "2",
        body: "hi",
        created_at: "2026-01-01",
      }).success,
    ).toBe(true);
  });

  it("parses a full ticket photo", () => {
    expect(
      ticketPhotoSchema.safeParse({
        id: "1",
        ticket_id: "2",
        r2_key: "k",
        caption: null,
        created_at: "2026-01-01",
      }).success,
    ).toBe(true);
  });

  it("parses a full component", () => {
    expect(
      componentSchema.safeParse({
        id: "1",
        name: "Cap",
        category: null,
        quantity: 0,
        location_id: null,
        cost_per_unit: null,
        sku: null,
      }).success,
    ).toBe(true);
  });

  it("parses a full ticket component", () => {
    expect(
      ticketComponentSchema.safeParse({
        id: "1",
        ticket_id: "2",
        component_id: null,
        description: null,
        quantity: 1,
      }).success,
    ).toBe(true);
  });

  it("parses a full preference", () => {
    expect(
      preferenceSchema.safeParse({
        id: "1",
        name: "PS2",
        search_terms: "ps2",
        category: null,
        max_price: null,
        condition: null,
        active: 1,
        priority: 0,
        last_run_at: null,
      }).success,
    ).toBe(true);
  });

  it("parses a full candidate", () => {
    expect(
      candidateSchema.safeParse({
        id: "1",
        preference_id: null,
        ebay_item_id: null,
        title: "PS2",
        price: null,
        listing_url: null,
        status: "new",
        discovered_at: "2026-01-01",
      }).success,
    ).toBe(true);
  });
});