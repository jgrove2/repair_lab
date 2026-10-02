import { useEffect } from "react";
import { useLogto } from "@logto/react";
import { useApi } from "./lib/api";
import { SIGN_OUT_URI } from "./lib/logto";

export function Dashboard() {
  const { isAuthenticated, signOut } = useLogto();
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

  return (
    <div className="home">
      <h1 className="home-title">Repair lab</h1>
    </div>
  );
}
