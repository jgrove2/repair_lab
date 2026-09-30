import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { Dashboard, Inventory, Preferences, Tickets } from "./pages";
import { TicketDetail } from "./TicketDetail";
import { Search } from "./Search";

export default function App() {
  return (
    <BrowserRouter>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/inventory">Inventory</Link>
        <Link to="/tickets">Tickets</Link>
        <Link to="/search">Search</Link>
        <Link to="/preferences">Preferences</Link>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/tickets/:id" element={<TicketDetail />} />
          <Route path="/search" element={<Search />} />
          <Route path="/preferences" element={<Preferences />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
