import AuthControl from "../components/AuthControl";

// Public sales home. Only shown to signed-out visitors; signed-in users are
// redirected to /app by RedirectIfAuthenticated.
export default function SalesHome() {
  return (
    <div className="home">
      <h1 className="home-title">Repair lab</h1>
      <AuthControl />
    </div>
  );
}
