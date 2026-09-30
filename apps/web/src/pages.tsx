import { MOCK } from "./lib/api";

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
