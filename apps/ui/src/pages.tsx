import { useCallback, useEffect, useState } from "react"
import { useLogto } from "@logto/react"
import { getAuthedHealth, getHealth, type AuthedHealth } from "./lib/api"
import { API_RESOURCE } from "./lib/logto"

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
      <SignedInCheck />
    </div>
  );
}

// Renders the result of an authenticated API call so we can see that login and
// API token verification agree. Session state comes from the SDK; the only
// local state here is the in-flight request.
function SignedInCheck() {
  const { getAccessToken, isAuthenticated, isLoading } = useLogto();
  const [result, setResult] = useState<AuthedHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    setError(null);
    try {
      // The resource argument is required: without it Logto returns the OIDC
      // token, which the API rejects on audience.
      const token = await getAccessToken(API_RESOURCE);
      if (!token) {
        throw new Error("No access token returned for the API resource.");
      }
      setResult(await getAuthedHealth(token));
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Auth check failed");
    } finally {
      setChecking(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !API_RESOURCE) {
      setResult(null);
      setError(null);
      return;
    }
    void check();
  }, [isLoading, isAuthenticated, check]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="card">
      <strong>API auth</strong>
      {!API_RESOURCE && (
        <p>Missing VITE_LOGTO_API_RESOURCE, so no API token can be issued.</p>
      )}
      {checking && <p>Checking…</p>}
      {result && (
        <p className="badge">
          OK · sub {result.sub} · env {result.env}
        </p>
      )}
      {error && (
        <p>
          {error}{" "}
          <button onClick={() => void check()}>Retry</button>
        </p>
      )}
    </div>
  );
}