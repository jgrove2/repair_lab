import { useEffect, useState } from "react";
import type { UserInfoResponse } from "@logto/react";

type AccountMenuProps = {
  user: UserInfoResponse | null;
  open: boolean;
  signingOut: boolean;
  onToggle: () => void;
  onSignOut: () => void;
};

const DETAIL_FIELDS: Array<{
  key: keyof UserInfoResponse;
  label: string;
}> = [
  { key: "name", label: "Name" },
  { key: "username", label: "Username" },
  { key: "email", label: "Email" },
];

export default function AccountMenu({
  user,
  open,
  signingOut,
  onToggle,
  onSignOut,
}: AccountMenuProps) {
  const [pictureFailed, setPictureFailed] = useState(false);

  useEffect(() => {
    setPictureFailed(false);
  }, [user?.picture]);

  const picture = typeof user?.picture === "string" ? user.picture : "";
  const label = user?.name ?? user?.username ?? user?.email ?? "Signed in";
  const initial = (user?.name ?? user?.email ?? "?").charAt(0).toUpperCase();

  const details = DETAIL_FIELDS.flatMap(({ key, label: term }) =>
    typeof user?.[key] === "string" ? [{ term, value: user[key] as string }] : [],
  );

  return (
    <>
      <button
        type="button"
        id="topnav-profile-trigger"
        className="topnav-profile-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="topnav-account-menu"
        aria-label={open ? `Close menu for ${label}` : `Account menu for ${label}`}
        onClick={onToggle}
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

      {open && (
        <div
          id="topnav-account-menu"
          className="topnav-menu"
          role="menu"
          aria-labelledby="topnav-profile-trigger"
        >
          <div className="topnav-menu-head">
            <span className="topnav-menu-name">{label}</span>
            {user?.email && user.email !== label && (
              <span className="topnav-menu-sub">{user.email}</span>
            )}
          </div>

          {details.length > 0 && (
            <dl className="topnav-menu-details">
              {details.map(({ term, value }) => (
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
            onClick={onSignOut}
          >
            {signingOut ? "Signing out…" : "Sign Out"}
          </button>
        </div>
      )}
    </>
  );
}