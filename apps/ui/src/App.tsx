import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages";
import { APP_ENV } from "./lib/api";

export default function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Home</Link>
        <span
          title={`VITE_APP_ENV=${APP_ENV}`}
          style={{
            marginLeft: "auto",
            fontSize: 12,
            padding: "2px 8px",
            borderRadius: 999,
            background: APP_ENV === "production" ? "#fee2e2" : "#fef9c3",
          }}
        >
          {APP_ENV}
        </span>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
