import { Link, useNavigate } from "react-router-dom";
import { useHandleSignInCallback } from "@logto/react";

export default function Callback() {
  const navigate = useNavigate();
  const { isLoading, error } = useHandleSignInCallback(() => {
    navigate("/app", { replace: true });
  });

  if (isLoading) {
    return <p>Redirecting…</p>;
  }

  if (error) {
    return (
      <p>
        Sign-in failed: {error.message} <Link to="/">Back to home</Link>
      </p>
    );
  }

  return null;
}