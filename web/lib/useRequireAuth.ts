"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type User } from "@/lib/api";

/**
 * Redirects to /login if there's no valid session. Call this from any
 * protected page (or a shared component like NavBar) so unauthenticated
 * visitors never reach forms that silently fail with 401s.
 */
export function useRequireAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((u) => {
        if (!cancelled) {
          setUser(u);
          setChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setChecked(true);
          router.replace("/login");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return { user, checked };
}
