import { BrowserRouter, Route, Routes } from "react-router-dom";
import { LogtoProvider } from "@logto/react";
import SalesHome from "./pages/SalesHome";
import Home from "./pages/Home";
import Inventory from "./pages/Inventory";
import Tasks from "./pages/Tasks";
import Listings from "./pages/Listings";
import Callback from "./pages/Callback";
import {
  RedirectIfAuthenticated,
  RequireAuth,
} from "./components/RouteGuards";
import { logtoConfig } from "./lib/logto";

export default function App() {
  return (
    <BrowserRouter>
      <LogtoProvider config={logtoConfig}>
        <Routes>
          <Route
            path="/"
            element={
              <RedirectIfAuthenticated>
                <SalesHome />
              </RedirectIfAuthenticated>
            }
          />
          <Route path="/callback" element={<Callback />} />
          <Route element={<RequireAuth />}>
            <Route path="/app" element={<Home />} />
            <Route path="/app/inventory" element={<Inventory />} />
            <Route path="/app/tasks" element={<Tasks />} />
            <Route path="/app/listings" element={<Listings />} />
          </Route>
        </Routes>
      </LogtoProvider>
    </BrowserRouter>
  );
}
