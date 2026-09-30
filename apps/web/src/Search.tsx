import { useState } from "react";
import { api, MOCK } from "./lib/api";
import type { Component, Item } from "@repair-lab/shared";

export function Search() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [components, setComponents] = useState<Component[]>([]);

  async function run() {
    if (MOCK) {
      setItems([
        {
          id: "item-gba-broken",
          title: "Broken Game Boy Advance (Dummy)",
          category: "Game Boy Advance",
          condition: "for_parts",
          status: "in_repair",
          serial_number: null,
          purchase_price: null,
          purchase_date: null,
          purchased_from: null,
          sell_price: null,
          sold_date: null,
          location_id: null,
          ebay_url: null,
          notes: "Dummy match",
          created_at: "",
          updated_at: "",
        },
      ]);
      setComponents([]);
      return;
    }
    const res = await api.search(q).catch(() => ({ items: [], components: [] }));
    setItems(res.items);
    setComponents(res.components);
  }

  return (
    <div>
      <h1>Search</h1>
      <input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dummy search…" />
      <button onClick={run}>Search</button>
      <h2>Items ({items.length})</h2>
      {items.map((i) => (
        <div className="card" key={i.id}>{i.title}</div>
      ))}
      <h2>Components ({components.length})</h2>
      {components.map((c) => (
        <div className="card" key={c.id}>{c.name}</div>
      ))}
    </div>
  );
}
