import { useState } from "react";
import { Link } from "react-router-dom";
import AuthControl from "./AuthControl";
import { useDismissOnOutsideClick } from "../hooks/useDismissOnOutsideClick";

const NAV_LINKS = [
  { to: "/app", label: "Home" },
  { to: "/app/inventory", label: "Inventory" },
  { to: "/app/tasks", label: "Tasks" },
];

// Responsive top navigation. On narrow screens the links collapse behind a
// hamburger button; auth controls stay in the bar at every size.
export default function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const navRef = useDismissOnOutsideClick<HTMLElement>(menuOpen, closeMenu);

  return (
    <>
      <nav className="topnav" ref={navRef}>
        <button
          type="button"
          className="topnav-hamburger"
          aria-expanded={menuOpen}
          aria-controls="topnav-links"
          aria-label="Toggle navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="topnav-hamburger-bar" aria-hidden="true" />
          <span className="topnav-hamburger-bar" aria-hidden="true" />
          <span className="topnav-hamburger-bar" aria-hidden="true" />
        </button>

        <div
          id="topnav-links"
          className={`topnav-links${menuOpen ? " open" : ""}`}
        >
          {NAV_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} onClick={closeMenu}>
              {label}
            </Link>
          ))}
        </div>

        <div className="topnav-spacer" aria-hidden="true" />
        <AuthControl />
      </nav>
      {menuOpen && (
        <div
          className="topnav-backdrop"
          aria-hidden="true"
          onClick={closeMenu}
        />
      )}
    </>
  );
}
