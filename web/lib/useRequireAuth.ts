"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type User } from "@/lib/api";

export function useRequireAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("ms_token");
    if (!token) {
      setChecked(true);
      router.replace("/login");
      return;
    }
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
          localStorage.removeItem("ms_token");
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
