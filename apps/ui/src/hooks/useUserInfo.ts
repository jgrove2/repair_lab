import { useEffect, useState } from "react";
import type { UserInfoResponse } from "@logto/react";

export function useUserInfo(
  isAuthenticated: boolean,
  fetchUserInfo: () => Promise<UserInfoResponse | undefined>,
): UserInfoResponse | null {
  const [user, setUser] = useState<UserInfoResponse | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setUser(null);
      return;
    }
    let cancelled = false;
    fetchUserInfo()
      .then((info) => {
        if (!cancelled) {
          setUser(info ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, fetchUserInfo]);

  return user;
}