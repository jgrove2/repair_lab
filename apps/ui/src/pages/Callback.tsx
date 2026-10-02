import { Link, useNavigate } from "react-router-dom";
import { useHandleSignInCallback } from "@logto/react";

export default function Callback() {
  const navigate = useNavigate();
  const { isLoading, error } = useHandleSignInCallback(() => {
    navigate("/", { replace: true });
  });

  if (isLoading) {
    return (
      <main className="home-center">
        <p>Redirecting…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="home-center">
        <p>
          Sign-in failed. <Link to="/">Back to home</Link>
        </p>
      </main>
    );
  }

  return null;
}
