import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { LogtoProvider } from "@logto/react";
import { Dashboard } from "./pages";
import Callback from "./pages/Callback";
import AuthControl from "./components/AuthControl";
import { APP_ENV } from "./lib/api";
import { logtoConfig } from "./lib/logto";

export default function App() {
  return (
    <BrowserRouter>
      <LogtoProvider config={logtoConfig}>
        <nav className="topnav">
          <Link to="/">Home</Link>
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
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/callback" element={<Callback />} />
          </Routes>
        </main>
      </LogtoProvider>
    </BrowserRouter>
  );
}
