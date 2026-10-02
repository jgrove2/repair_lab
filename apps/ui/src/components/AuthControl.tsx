import { useEffect, useState } from "react";
import { useLogto, type UserInfoResponse } from "@logto/react";
import { CALLBACK_URI, SIGN_OUT_URI, logtoConfig } from "../lib/logto";

// Avatar and display name come from Logto's userinfo endpoint. That profile is
// not part of the SDK's session state, so it is the one thing this control
// fetches for itself; `isAuthenticated` / `isLoading` / `error` are read
// straight from the provider.
export default function AuthControl() {
  const { signIn, signOut, isAuthenticated, isLoading, error, fetchUserInfo } =
    useLogto();
  const [user, setUser] = useState<UserInfoResponse | null>(null);
  const [pictureFailed, setPictureFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setUser(null);
      setPictureFailed(false);
      return;
    }
    let cancelled = false;
    fetchUserInfo()
      .then((info) => {
        if (!cancelled) {
          setUser(info ?? null);
          setPictureFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, fetchUserInfo]);

  if (isLoading) {
    return <button className="topnav-signin" disabled>Checking session…</button>;
  }

  if (error) {
    return (
      <>
        <span>Session error.</span>
        <button className="topnav-signin" onClick={() => void signIn(CALLBACK_URI)}>
          Sign in again
        </button>
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <button
        className="topnav-signin"
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

  const picture = typeof user?.picture === "string" ? user.picture : "";
  const label = user?.name ?? user?.username ?? user?.email ?? "Signed in";
  const initial = (user?.name ?? user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="topnav-right">
      <span className="topnav-user">{label}</span>
      <span className="topnav-avatar" title={label}>
        {picture && !pictureFailed ? (
          <img
            src={picture}
            alt={label}
            referrerPolicy="no-referrer"
            onError={() => setPictureFailed(true)}
          />
        ) : (
          <span aria-hidden="true">{initial}</span>
        )}
      </span>
      <button
        className="topnav-signin"
        disabled={signingOut}
        onClick={() => {
          setSigningOut(true);
          void signOut(SIGN_OUT_URI).catch(() => setSigningOut(false));
        }}
      >
        {signingOut ? "Signing out…" : "Sign Out"}
      </button>
    </div>
  );
}