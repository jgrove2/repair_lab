import { useEffect, useState } from "react"
import { getHealth } from "./lib/api"

export function Dashboard() {
  const [backend, setBackend] = useState<string>("checking...")

  useEffect(() => {
    getHealth()
      .then((h) => setBackend(h.env))
      .catch(() => setBackend("unreachable"))
  }, [])

  return (
    <div>
      <h1>Repair Lab (dummy)</h1>
      <div className="card">
        <strong>Summary (placeholder)</strong>
        <p>3 dummy items · 2 open tickets · 2 sourcing preferences.</p>
        <p>
          Backend: <span className="badge">/api {backend}</span>
        </p>
      </div>
    </div>
  );
}
