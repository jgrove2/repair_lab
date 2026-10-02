import { BrowserRouter, Route, Routes } from "react-router-dom";
import { LogtoProvider } from "@logto/react";
import { Home } from "./pages";
import Callback from "./pages/Callback";
import TopNav from "./components/TopNav";
import { logtoConfig } from "./lib/logto";

export default function App() {
  return (
    <BrowserRouter>
      <LogtoProvider config={logtoConfig}>
        <TopNav />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/callback" element={<Callback />} />
        </Routes>
      </LogtoProvider>
    </BrowserRouter>
  );
}
