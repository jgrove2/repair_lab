import { useCallback, useState } from "react";
import { useLogto } from "@logto/react";
import { CALLBACK_URI, SIGN_OUT_URI, logtoConfigured } from "../lib/logto";
import { useDismissOnOutsideClick } from "../hooks/useDismissOnOutsideClick";
import { useUserInfo } from "../hooks/useUserInfo";
import AccountMenu from "./AccountMenu";

export default function AuthControl() {
  const { signIn, signOut, isAuthenticated, isLoading, error, fetchUserInfo } =
    useLogto();
  const user = useUserInfo(isAuthenticated, fetchUserInfo);
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const rootRef = useDismissOnOutsideClick<HTMLDivElement>(menuOpen, closeMenu);

  const handleSignOut = useCallback(() => {
    setSigningOut(true);
    setMenuOpen(false);
    void signOut(SIGN_OUT_URI).catch(() => setSigningOut(false));
  }, [signOut]);

  if (isLoading && !isAuthenticated) {
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
        disabled={!logtoConfigured}
        title={
          logtoConfigured
            ? undefined
            : "Missing VITE_LOGTO_ENDPOINT / VITE_LOGTO_APP_ID"
        }
      >
        Sign In
      </button>
    );
  }

  return (
    <div className="topnav-profile" ref={rootRef}>
      <AccountMenu
        user={user}
        open={menuOpen}
        signingOut={signingOut}
        onToggle={() => setMenuOpen((open) => !open)}
        onSignOut={handleSignOut}
      />
    </div>
  );
}