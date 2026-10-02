import { useEffect } from "react";
import type { ReactNode } from "react";
import { Link, Navigate, Outlet } from "react-router-dom";
import { useLogto } from "@logto/react";
import AuthControl from "./AuthControl";
import { APP_ENV, useApi } from "../lib/api";
import { SIGN_OUT_URI } from "../lib/logto";

function Loading() {
  return <p>Loading…</p>;
}

// Layout route for authenticated pages. Renders the top nav plus the matched
// child route. Also validates the session against the API on entry and signs
// the user out if the token is no longer accepted.
export function RequireAuth() {
  const { isAuthenticated, isLoading, signOut } = useLogto();
  const { fetch: apiFetch } = useApi();

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    let cancelled = false;
    apiFetch("/me").catch(() => {
      if (!cancelled) {
        void signOut(SIGN_OUT_URI);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, apiFetch, signOut]);

  // `isLoading` is a global counter that any Logto call flips (including
  // token refreshes and userinfo lookups), so only gate on it until we know
  // whether the user is authenticated. Gating after that unmounts children
  // like AuthControl, whose remount re-triggers loading forever.
  if (isLoading && !isAuthenticated) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <nav className="topnav">
        <Link to="/app">Home</Link>
        <Link to="/app/inventory">Inventory</Link>
        <span
          title={`VITE_APP_ENV=${APP_ENV}`}
          style={{
            fontSize: 12,
            padding: "2px 8px",
            borderRadius: 999,
            background: APP_ENV === "production" ? "#fee2e2" : "#fef9c3",
          }}
        >
          {APP_ENV}
        </span>
        <div className="topnav-spacer" aria-hidden="true" />
        <AuthControl />
      </nav>
      <main>
        <Outlet />
      </main>
    </>
  );
}

// Keeps signed-in users off the public sales home by sending them to /app.
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useLogto();

  if (isLoading && !isAuthenticated) {
    return <Loading />;
  }

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
