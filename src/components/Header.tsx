"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Modal } from "./Modal";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/", label: "Assemblies" },
  { href: "/songs", label: "Songs" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 640px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-accent/15 text-accent">
            <Icon name="cross" className="h-4 w-4" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="display text-xl tracking-wide text-stone-900">Assembly</span>
            <span className="mt-1 text-[10px] tracking-wide text-stone-500">by SoundFaith</span>
          </span>
        </Link>
        <div className="hidden items-center gap-1 sm:flex">
          <Suspense fallback={<Navigation path={null} />}>
            <ActiveNavigation />
          </Suspense>
          <span className="mx-1 h-5 w-px bg-stone-200" />
          <ThemeToggle />
        </div>
        <button type="button" className="icon-btn mobile-menu-trigger" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>
          <Icon name={open ? "close" : "menu"} />
        </button>
      </div>
      {open && <Modal labelledBy="mobile-menu-title" onClose={() => setOpen(false)} className="menu-drawer">
        <div id="mobile-menu" className="flex h-full flex-col p-6">
          <div className="mb-8 flex items-center justify-between">
            <h2 id="mobile-menu-title" className="display text-3xl text-stone-900">Menu</h2>
            <button type="button" className="icon-btn" aria-label="Close menu" data-initial-focus onClick={() => setOpen(false)}><Icon name="close" /></button>
          </div>
          <Suspense fallback={<Navigation path={null} onNavigate={() => setOpen(false)} vertical />}>
            <ActiveNavigation onNavigate={() => setOpen(false)} vertical />
          </Suspense>
          <div className="mt-4 flex items-center justify-between border-t border-stone-200 px-4 pt-4 text-sm text-stone-700">
            <span>Appearance</span><ThemeToggle />
          </div>
        </div>
      </Modal>}
    </header>
  );
}

function ActiveNavigation({ onNavigate, vertical }: { onNavigate?: () => void; vertical?: boolean }) {
  return <Navigation path={usePathname()} onNavigate={onNavigate} vertical={vertical} />;
}

function Navigation({ path, onNavigate, vertical }: { path: string | null; onNavigate?: () => void; vertical?: boolean }) {
  const active = (href: string) =>
    path !== null && (href === "/" ? path === "/" || path.startsWith("/assembly") : path.startsWith(href));

  return (
    <nav className={`flex gap-1 text-sm ${vertical ? "flex-col" : "items-center"}`}>
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          onClick={onNavigate}
          aria-current={active(n.href) ? "page" : undefined}
          className={`rounded-full px-4 ${vertical ? "py-3" : "py-1.5"} transition-colors ${
            active(n.href) ? "bg-stone-100 text-stone-900" : "text-stone-500 hover:text-stone-900"
          }`}
        >
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
