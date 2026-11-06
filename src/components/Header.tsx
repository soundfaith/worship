"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/", label: "Assemblies" },
  { href: "/songs", label: "Songs" },
];

export function Header() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" || path.startsWith("/assembly") : path.startsWith(href));

  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-accent/15 text-accent">
            <Icon name="cross" className="h-4 w-4" />
          </span>
          <span className="display text-xl tracking-wide text-stone-900">Assembly Slides</span>
        </Link>
        <div className="flex items-center gap-1">
          <nav className="flex items-center gap-1 text-sm">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active(n.href) ? "page" : undefined}
                className={`rounded-full px-4 py-1.5 transition-colors ${
                  active(n.href) ? "bg-stone-100 text-stone-900" : "text-stone-500 hover:text-stone-900"
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <span className="mx-1 h-5 w-px bg-stone-200" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
