import { useEffect, useRef, useState } from "react";
import { useLogto, type UserInfoResponse } from "@logto/react";
import {
  LOGTO_POST_SIGN_OUT_REDIRECT,
  LOGTO_REDIRECT_URI,
  isLogtoConfigured,
} from "../lib/logto";

function initialOf(user: UserInfoResponse | null): string {
  const name = user?.name ?? user?.username ?? user?.email ?? "?";
  return name.charAt(0).toUpperCase();
}

function getAvatarUrl(user: UserInfoResponse | null): string | null {
  if (!user) {
    return null;
  }
  // Standard OIDC picture claim (profile scope).
  if (typeof user.picture === "string" && user.picture.length > 0) {
    return user.picture;
  }
  // Some Logto setups store avatar under custom_data or extra claims.
  const record = user as unknown as Record<string, unknown>;
  const customData = record["custom_data"] as Record<string, unknown> | undefined;
  const customAvatar = customData?.["avatar"] ?? customData?.["picture"];
  if (typeof customAvatar === "string" && customAvatar.length > 0) {
    return customAvatar;
  }
  const avatar = record["avatar"];
  if (typeof avatar === "string" && avatar.length > 0) {
    return avatar;
  }
  return null;
}

export default function TopNav() {
  const {
    signIn,
    signOut,
    isAuthenticated,
    isLoading,
    fetchUserInfo,
    getIdTokenClaims,
  } = useLogto();
  const [user, setUser] = useState<UserInfoResponse | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setUser(null);
      setImgFailed(false);
      return;
    }
    let cancelled = false;
    (async () => {
      // Prefer userinfo (has picture with profile scope), fall back to ID token.
      const info = await fetchUserInfo().catch(() => null);
      const claims = await getIdTokenClaims().catch(() => null);
      if (cancelled) {
        return;
      }
      const merged = {
        ...(claims ?? {}),
        ...(info ?? {}),
      } as UserInfoResponse;
      if (info || claims) {
        setUser(merged);
        setImgFailed(false);
        if (import.meta.env.DEV) {
          console.debug("[logto] userinfo", info, "idTokenClaims", claims);
        }
      } else {
        setUser(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, fetchUserInfo, getIdTokenClaims]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const handleSignIn = () => {
    void signIn(LOGTO_REDIRECT_URI);
  };

  const handleSignOut = () => {
    setMenuOpen(false);
    void signOut(LOGTO_POST_SIGN_OUT_REDIRECT);
  };

  const avatarUrl = getAvatarUrl(user);

  return (
    <nav className="topnav">
      <div className="topnav-spacer" aria-hidden="true" />
      <div className="topnav-right">
        {isLoading ? (
          <button className="topnav-signin" disabled>
            Loading…
          </button>
        ) : isAuthenticated ? (
          <div className="topnav-profile" ref={menuRef}>
            <button
              className="topnav-avatar"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title={user?.name ?? user?.email ?? user?.username ?? "Profile"}
            >
              {avatarUrl && !imgFailed ? (
                <img
                  src={avatarUrl}
                  alt={user?.name ?? user?.email ?? user?.username ?? "Profile"}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <span aria-hidden="true">{initialOf(user)}</span>
              )}
            </button>
            {menuOpen && (
              <div className="topnav-menu" role="menu">
                <div className="topnav-menu-header">
                  <strong>{user?.name ?? user?.username ?? "Signed in"}</strong>
                  {user?.email && <span>{user.email}</span>}
                </div>
                <button
                  className="topnav-menu-item"
                  onClick={handleSignOut}
                  role="menuitem"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="topnav-signin"
            onClick={handleSignIn}
            disabled={!isLogtoConfigured}
            title={
              isLogtoConfigured
                ? "Sign in with Logto"
                : "Missing VITE_LOGTO_ENDPOINT / VITE_LOGTO_APP_ID"
            }
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
