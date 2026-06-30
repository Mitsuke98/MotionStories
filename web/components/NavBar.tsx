"use client";

import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/lib/useRequireAuth";

const LINKS = [
  { href: "/", label: "Analyze" },
  { href: "/library", label: "Library" },
  { href: "/gallery", label: "Motion Gallery" },
  { href: "/recreate", label: "Recreate" },
  { href: "/settings", label: "Settings" },
];

export function NavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { checked } = useRequireAuth();

  if (!checked) {
    return (
      <header className="sticky top-0 z-20 -mx-4 mb-8 h-[57px] border-b border-[var(--color-border)] bg-[var(--color-background)]/80 px-4 backdrop-blur-md sm:-mx-6 sm:px-6" />
    );
  }

  return (
    <header className="sticky top-0 z-20 -mx-4 mb-8 border-b border-[var(--color-border)] bg-[var(--color-background)]/80 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-1 text-sm">
        <a href="/" className="mr-2 flex items-center gap-2 pr-3">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{
              background: "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
            }}
          >
            MS
          </span>
          <span className="font-semibold tracking-tight">Motion Story</span>
        </a>

        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <a
              key={link.href}
              href={link.href}
              className={`rounded-full px-3 py-1.5 font-medium transition-colors duration-150 ${
                active
                  ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-muted-surface)] hover:text-[var(--color-foreground)]"
              }`}
            >
              {link.label}
            </a>
          );
        })}

        <button
          onClick={async () => {
            await api.logout().catch(() => {});
            router.push("/login");
          }}
          className="ml-auto cursor-pointer rounded-full px-3 py-1.5 font-medium text-[var(--color-muted)] transition-colors duration-150 hover:bg-[var(--color-muted-surface)] hover:text-[var(--color-foreground)]"
        >
          Log out
        </button>
      </nav>
    </header>
  );
}
