import { useState } from "react";
import { useLogto } from "@logto/react";
import { CALLBACK_URI, SIGN_OUT_URI, logtoConfig } from "../lib/logto";

// Reads session state straight from the provider; the only local state is
// whether the sign-out click is mid-flight, so the button can't be double-fired.
export default function AuthControl() {
  const { signIn, signOut, isAuthenticated, isLoading, error } = useLogto();
  const [signingOut, setSigningOut] = useState(false);

  if (isLoading) {
    return <button disabled>Checking session…</button>;
  }

  if (error) {
    return (
      <span>
        Session error.{" "}
        <button onClick={() => void signIn(CALLBACK_URI)}>Sign in again</button>
      </span>
    );
  }

  if (isAuthenticated) {
    return (
      <button
        disabled={signingOut}
        onClick={() => {
          setSigningOut(true);
          void signOut(SIGN_OUT_URI).catch(() => setSigningOut(false));
        }}
      >
        {signingOut ? "Signing out…" : "Sign Out"}
      </button>
    );
  }

  return (
    <button
      onClick={() => void signIn(CALLBACK_URI)}
      disabled={!logtoConfig.appId}
      title={
        logtoConfig.appId
          ? undefined
          : "Missing VITE_LOGTO_ENDPOINT / VITE_LOGTO_APP_ID"
      }
    >
      Sign In
    </button>
  );
}