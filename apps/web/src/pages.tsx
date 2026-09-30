import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, MOCK, mockItems, mockTickets, mockPreferences } from "./lib/api";
import type { Item, Preference, Ticket } from "@repair-lab/shared";

export function Dashboard() {
  return (
    <div>
      <h1>Repair Lab (dummy)</h1>
      <div className="card">
        <strong>Summary (placeholder)</strong>
        <p>3 dummy items · 2 open tickets · 2 sourcing preferences.</p>
        <p>
          Backend: <span className="badge">{MOCK ? "MOCK mode" : "/api (live)"}</span>
        </p>
      </div>
    </div>
  );
}

function useFetch<T>(fallback: T, fn: () => Promise<T>): T {
  const [data, setData] = useState<T>(fallback);
  useEffect(() => {
    if (MOCK) return;
    fn().then(setData).catch(() => setData(fallback));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return data;
}

export function Inventory() {
  const items = useFetch<Item[]>(mockItems, api.items);
  return (
    <div>
      <h1>Inventory</h1>
      {items.map((i) => (
        <div className="card" key={i.id}>
          <strong>{i.title}</strong> <span className="badge">{i.status}</span>
          <div>{i.category} · {i.condition ?? "unknown"}</div>
        </div>
      ))}
    </div>
  );
}

export function Tickets() {
  const tickets = useFetch<Ticket[]>(mockTickets, api.tickets);
  return (
    <div>
      <h1>Tickets</h1>
      {tickets.map((t) => (
        <div className="card" key={t.id}>
          <Link to={`/tickets/${t.id}`}><strong>{t.title}</strong></Link>{" "}
          <span className="badge">{t.status}</span>
        </div>
      ))}
    </div>
  );
}

export function Preferences() {
  const prefs = useFetch<Preference[]>(mockPreferences, api.preferences);
  return (
    <div>
      <h1>Preferences</h1>
      {prefs.map((p) => (
        <div className="card" key={p.id}>
          <strong>{p.name}</strong>
          <div>{p.search_terms} · max ${p.max_price ?? "—"}</div>
        </div>
      ))}
    </div>
  );
}
