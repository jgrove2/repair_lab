import { useEffect, useRef, useState } from "react";
import { useLogto, type UserInfoResponse } from "@logto/react";
import { CALLBACK_URI, SIGN_OUT_URI, logtoConfig } from "../lib/logto";

// Avatar and display name come from Logto's userinfo endpoint. That profile is
// not part of the SDK's session state, so it is the one thing this control
// fetches for itself; `isAuthenticated` / `isLoading` / `error` are read
// straight from the provider. Once signed in, the profile becomes a menu that
// holds the account details and the sign-out action, so the topnav carries
// nothing but the avatar.
export default function AuthControl() {
  const { signIn, signOut, isAuthenticated, isLoading, error, fetchUserInfo } =
    useLogto();
  const [user, setUser] = useState<UserInfoResponse | null>(null);
  const [pictureFailed, setPictureFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setUser(null);
      setPictureFailed(false);
      setMenuOpen(false);
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

  // Dismiss the menu on an outside click or Escape.
  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

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

  // Only show claims the app actually has a value for; userinfo returns
  // whichever scopes were granted, so most of these are optional.
  const details: Array<[string, string]> = [];
  if (typeof user?.name === "string") details.push(["Name", user.name]);
  if (typeof user?.username === "string") details.push(["Username", user.username]);
  if (typeof user?.email === "string") details.push(["Email", user.email]);
  if (typeof user?.phone_number === "string") details.push(["Phone", user.phone_number]);
  if (typeof user?.sub === "string") details.push(["User ID", user.sub]);

  return (
    <div className="topnav-profile" ref={rootRef}>
      <button
        type="button"
        className="topnav-profile-trigger"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? `Close menu for ${label}` : `Account menu for ${label}`}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="topnav-avatar" title={label}>
          {picture && !pictureFailed ? (
            <img
              src={picture}
              alt=""
              referrerPolicy="no-referrer"
              onError={() => setPictureFailed(true)}
            />
          ) : (
            <span aria-hidden="true">{initial}</span>
          )}
        </span>
      </button>

      {menuOpen && (
        <div className="topnav-menu" role="menu" aria-label="Account">
          <div className="topnav-menu-head">
            <span className="topnav-menu-name">{label}</span>
            {user?.email && user.email !== label && (
              <span className="topnav-menu-sub">{user.email}</span>
            )}
          </div>

          {details.length > 0 && (
            <dl className="topnav-menu-details">
              {details.map(([term, value]) => (
                <div className="topnav-menu-row" key={term}>
                  <dt>{term}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="topnav-menu-sep" role="separator" />

          <button
            type="button"
            role="menuitem"
            className="topnav-menu-action"
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true);
              setMenuOpen(false);
              void signOut(SIGN_OUT_URI).catch(() => setSigningOut(false));
            }}
          >
            {signingOut ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      )}
    </div>
  );
}