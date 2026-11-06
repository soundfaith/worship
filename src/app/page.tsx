"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { blankAssembly, duplicateAssembly, useAssemblies, usePreferredFont, useRecurring } from "@/lib/assemblies";
import { coverSlide, formatDate } from "@/lib/slides";
import { getTemplate, TEMPLATES } from "@/lib/templates";
import { songLabel, useSongSearch } from "@/lib/useSongs";
import type { Assembly } from "@/lib/types";
import { Icon, IconButton } from "@/components/Icon";
import { SlideView } from "@/components/SlideView";
import { ConfirmDialog } from "@/components/Modal";

export default function Home() {
  const router = useRouter();
  const [assemblies, setAssemblies] = useAssemblies();
  const [recurring] = useRecurring();
  const [preferredFont] = usePreferredFont();
  const [q, setQ] = useState("");
  const [deleteAssembly, setDeleteAssembly] = useState<Assembly | null>(null);
  const { results } = useSongSearch(q);
  const needle = q.trim().toLowerCase();

  const sorted = [...assemblies].sort((a, b) => b.date.localeCompare(a.date));

  const create = (from?: Assembly) => {
    const a = from ? duplicateAssembly(from) : blankAssembly(preferredFont);
    setAssemblies((l) => [...l, a]);
    router.push(`/assembly/${a.id}`);
  };

  const inAssembly = (a: Assembly) => [a.title, a.activity, a.theme, a.presider].some((x) => x.toLowerCase().includes(needle));
  const aHits = needle ? sorted.filter(inAssembly) : sorted;
  const sHits = needle ? results.slice(0, 8) : [];
  const annHits = needle
    ? [...recurring, ...assemblies.flatMap((a) => a.announcements)].filter((x) => x.text.toLowerCase().includes(needle)).slice(0, 6)
    : [];
  const cHits = needle
    ? assemblies
        .flatMap((a) => [...a.birthdays, ...a.anniversaries])
        .filter((c) => c.name.toLowerCase().includes(needle))
        .map((c) => c.name)
        .filter((n, i, arr) => arr.indexOf(n) === i)
        .slice(0, 6)
    : [];
  const tHits = needle ? TEMPLATES.filter((t) => t.name.toLowerCase().includes(needle)) : [];
  const anyOther = sHits.length + annHits.length + cHits.length + tHits.length > 0;

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">SoundFaith</p>
          <h1 className="display text-stone-900">Assemblies</h1>
          <p className="mt-2 text-stone-500">Prepare a full presentation in a few minutes.</p>
        </div>
        <button className="btn btn-primary" onClick={() => create()}>
          <Icon name="plus" className="h-4 w-4" /> New assembly
        </button>
      </div>

      <div className="relative">
        <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone-400" />
        <input
          className="input !py-3 !pl-11"
          placeholder="Search assemblies, songs, announcements, celebrants, templates…"
          aria-label="Global search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {needle && anyOther && (
        <div className="grid gap-4 text-sm sm:grid-cols-2">
          <Group title="Songs" show={sHits.length > 0}>
            {sHits.map((s) => (
              <Link key={s.id} href="/songs" className="block truncate hover:text-accent">
                {songLabel(s)}
                {s.match === "lyrics" && <span className="ml-2 text-xs text-stone-400">in lyrics</span>}
              </Link>
            ))}
          </Group>
          <Group title="Announcements" show={annHits.length > 0}>{annHits.map((x) => <p key={x.id} className="truncate">{x.text}</p>)}</Group>
          <Group title="Celebrants" show={cHits.length > 0}>{cHits.map((n) => <p key={n}>{n}</p>)}</Group>
          <Group title="Templates" show={tHits.length > 0}>{tHits.map((t) => <p key={t.id}>{t.name}</p>)}</Group>
        </div>
      )}

      <section className="space-y-5">
        <h2 className="eyebrow">{needle ? "Matching assemblies" : "My assembly slides"}</h2>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {!needle && (
            <li>
              <button
                onClick={() => create()}
                className="group flex aspect-[16/10] h-full min-h-48 w-full flex-col items-center justify-center gap-3 rounded-[1.1rem] border border-dashed border-stone-300 text-stone-500 transition hover:border-accent hover:text-accent"
              >
                <span className="grid h-11 w-11 place-items-center rounded-full bg-stone-100 transition group-hover:bg-accent/15">
                  <Icon name="plus" />
                </span>
                <span className="text-sm">New assembly</span>
              </button>
            </li>
          )}
          {aHits.map((a) => (
            <AssemblyCard
              key={a.id}
              a={a}
              onDuplicate={() => create(a)}
              onDelete={() => setDeleteAssembly(a)}
            />
          ))}
        </ul>
        {aHits.length === 0 && needle && <p className="py-8 text-center text-stone-500">No assemblies match.</p>}
      </section>
      {deleteAssembly && <ConfirmDialog title="Delete assembly?" message={`“${deleteAssembly.title || "Untitled assembly"}” will be permanently deleted from this browser.`} confirmLabel="Delete assembly" onCancel={() => setDeleteAssembly(null)} onConfirm={() => {
        setAssemblies((list) => list.filter((item) => item.id !== deleteAssembly.id));
        setDeleteAssembly(null);
      }} />}
    </div>
  );
}

function AssemblyCard({ a, onDuplicate, onDelete }: { a: Assembly; onDuplicate: () => void; onDelete: () => void }) {
  const template = getTemplate(a.sectionTemplates.welcome ?? a.templateId);
  const count = a.songs.length;
  return (
    <li className="card group overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
      <Link href={`/assembly/${a.id}`} className="block" aria-label={`Open ${a.title || "assembly"}`}>
        <div className="overflow-hidden p-2.5 pb-0">
          <SlideView slide={a.slides?.find((s) => s.kind === "welcome") ?? coverSlide(a)} template={template} font={a.font} className="!shadow-none transition duration-500 group-hover:scale-[1.015]" />
        </div>
        <div className="px-5 pb-1 pt-4">
          <p className="truncate font-medium text-stone-900">{a.title || "Untitled assembly"}</p>
          <p className="mt-0.5 truncate text-sm text-stone-500">
            {[formatDate(a.date), a.activity].filter(Boolean).join(" · ")}
          </p>
        </div>
      </Link>
      <div className="flex items-center justify-between px-3 pb-3 pl-5 pt-1">
        <span className="flex items-center gap-1.5 text-xs text-stone-400">
          <Icon name="music" className="h-3.5 w-3.5" /> {count} {count === 1 ? "song" : "songs"}
        </span>
        <span className="flex">
          <IconButton icon="copy" label="Duplicate assembly" onClick={onDuplicate} />
          <IconButton icon="trash" label="Delete assembly" danger onClick={onDelete} />
        </span>
      </div>
    </li>
  );
}

function Group({ title, show, children }: { title: string; show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <div className="card p-5">
      <h3 className="eyebrow mb-3">{title}</h3>
      <div className="space-y-1.5 text-stone-700">{children}</div>
    </div>
  );
}
