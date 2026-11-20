"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Icon } from "./Icon";
import Image from "next/image";
import { Modal } from "./Modal";
import { ThemeToggle } from "./ThemeToggle";
import { useAssemblies } from "@/lib/assemblies";
import { exportPptx } from "@/lib/export";
import type { Assembly } from "@/lib/types";

const NAV = [
  { href: "/", label: "Assemblies" },
  { href: "/songs", label: "Songs" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [assemblies] = useAssemblies();
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 640px)");
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/70 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Assembly by SoundFaith home">
          <span className="assembly-mark grid h-10 w-10 shrink-0 place-items-center rounded-full" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10">
              <circle cx="20" cy="20" r="19" fill="url(#assembly-mark-bg)" />
              <path d="M20 11v18M14 17h12" stroke="#FFFEFA" strokeWidth="2" strokeLinecap="round" />
              <defs><linearGradient id="assembly-mark-bg" x1="6" y1="4" x2="34" y2="37" gradientUnits="userSpaceOnUse"><stop stopColor="#C6A96A"/><stop offset="1" stopColor="#A98745"/></linearGradient></defs>
            </svg>
          </span>
          <span className="flex flex-col leading-none">
            <span className="display text-[1.35rem] tracking-wide text-stone-900">Assembly</span>
            <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.16em] text-stone-500">by SoundFaith</span>
          </span>
        </Link>
        <div className="hidden items-center gap-1 sm:flex">
          <Suspense fallback={<Navigation path={null} />}>
            <ActiveNavigation />
          </Suspense>
          <span className="mx-1 h-5 w-px bg-stone-200" />
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-1.5 sm:hidden">
          <Suspense fallback={null}><EditorHeaderActions assemblies={assemblies} /></Suspense>
          <button type="button" className="icon-btn mobile-menu-trigger" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>
            <Icon name={open ? "close" : "menu"} />
          </button>
        </div>
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

function EditorHeaderActions({ assemblies }: { assemblies: Assembly[] }) {
  const [exporting, setExporting] = useState(false);
  const path = usePathname();
  const isEditor = path.startsWith("/assembly/");
  const currentAssembly = isEditor ? assemblies.find((assembly) => path === `/assembly/${assembly.id}`) : undefined;
  const exportCurrent = async () => {
    if (!currentAssembly) return;
    setExporting(true);
    try { await exportPptx(currentAssembly); }
    catch (error) { window.alert(error instanceof Error ? error.message : "Download failed."); }
    finally { setExporting(false); }
  };
  if (!isEditor) return null;
  return (
    <>
      <div className="flex items-center gap-1 sm:hidden">
        <button type="button" aria-label="Present" title="Present" className="btn btn-primary !h-11 !w-11 !min-h-0 !rounded-full !p-0" onClick={() => window.dispatchEvent(new CustomEvent("assembly:present"))}><Icon name="present" className="h-5 w-5" /></button>
        <button type="button" className="icon-btn border border-stone-200 bg-surface" aria-label="Download PowerPoint" title="Download PowerPoint" disabled={exporting} onClick={() => void exportCurrent()}><Icon name="download" /></button>
      </div>
    </>
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
