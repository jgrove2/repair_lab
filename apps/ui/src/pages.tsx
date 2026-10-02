import { useState } from "react";
import { useLogto } from "@logto/react";
import { getAuthedHealth, type AuthedHealth } from "./lib/api";
import { LOGTO_API_RESOURCE, isApiResourceConfigured } from "./lib/logto";

export function Home() {
  const { isAuthenticated, getAccessToken } = useLogto();
  const [result, setResult] = useState<AuthedHealth | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const checkAuth = async () => {
    setChecking(true);
    setError(null);
    setResult(null);
    try {
      const token = await getAccessToken(LOGTO_API_RESOURCE);
      if (!token) {
        throw new Error("No access token returned (missing API resource or consent).");
      }
      setResult(await getAuthedHealth(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth check failed");
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="home-center">
      <h1>Repair Lab</h1>
      {isAuthenticated ? (
        <div>
          <button
            onClick={() => void checkAuth()}
            disabled={checking || !isApiResourceConfigured}
            title={
              isApiResourceConfigured
                ? "Call GET /health/auth with your access token"
                : "Missing VITE_LOGTO_API_RESOURCE"
            }
          >
            {checking ? "Checking…" : "Check API auth"}
          </button>
          {result && <p>API auth OK (sub: {result.sub}, env: {result.env})</p>}
          {error && <p>API auth failed: {error}</p>}
        </div>
      ) : null}
    </main>
  );
}
