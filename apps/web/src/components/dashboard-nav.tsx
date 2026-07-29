"use client";

import { Button } from "@autoapply/ui";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/resumes", label: "Resumes" },
  { href: "/dashboard/jobs", label: "Jobs" },
  { href: "/dashboard/applications", label: "Applications" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

export function DashboardNav() {
  const { data: session } = useSession();

  return (
    <header className="border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <div className="space-y-1">
          <p className="font-display text-xl font-semibold tracking-tight">AutoApply AI</p>
          <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
        </div>

        <nav className="hidden items-center gap-4 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              className="text-sm text-muted-foreground transition hover:text-foreground"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Button
          variant="outline"
          onClick={() => {
            void signOut({ callbackUrl: "/login" });
          }}
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}
