"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { blankAssembly, duplicateAssembly, useAssemblies, useLogoPreference, usePreferredFont, useRecurring, useSoundFaithDiscoveryEligibility } from "@/lib/assemblies";
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
  const [discoveryEligible, setDiscoveryEligible] = useSoundFaithDiscoveryEligibility();
  const [recurring] = useRecurring();
  const [preferredFont] = usePreferredFont();
  const [logoPreference] = useLogoPreference();
  const [q, setQ] = useState("");
  const [deleteAssembly, setDeleteAssembly] = useState<Assembly | null>(null);
  const needle = q.trim().toLowerCase();

  useEffect(() => {
    if (assemblies.length > 0 && !discoveryEligible) setDiscoveryEligible(true);
  }, [assemblies.length, discoveryEligible, setDiscoveryEligible]);

  const sorted = [...assemblies].sort((a, b) => b.date.localeCompare(a.date));

  const create = (from?: Assembly) => {
    const a = from ? duplicateAssembly(from) : blankAssembly(preferredFont || undefined);
    if (!from && logoPreference) {
      a.logo = structuredClone(logoPreference);
      a.showLogo = true;
    }
    setAssemblies((l) => [...l, a]);
    setDiscoveryEligible(true);
    router.push(`/assembly/${a.id}`);
  };

  const inAssembly = (a: Assembly) => {
    const searchable = [
      a.title,
      a.activity,
      a.theme,
      a.presider,
      formatDate(a.date),
    ]
      .filter(Boolean)
      .map((x) => x.toLowerCase());

    const songMatch = a.songs.some((song) =>
      songLabel(song).toLowerCase().includes(needle)
    );

    return searchable.some((x) => x.includes(needle)) || songMatch;
  };

  const aHits = needle ? sorted.filter(inAssembly) : sorted;

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 space-y-12">
        <div className="flex flex-col items-start gap-4">
          <div>
            <p className="eyebrow mb-2">SoundFaith</p>
            <h1 className="display text-stone-900">Assemblies</h1>
            <p className="mt-2 text-stone-500">Prepare a full presentation in a few minutes.</p>
          </div>
          <button
            className="btn btn-primary !px-5 !py-3 sm:!px-6 sm:!py-3.5 !text-base sm:!text-lg font-medium !gap-2.5 !rounded-xl shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
            onClick={() => create()}
          >
            <Icon name="plus" className="h-5 w-5 sm:h-6 sm:w-6" /> New assembly
          </button>
        </div>

        {assemblies.length > 0 && (
                <div className="relative">
                  <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-stone-400" />
                  <input
                    className="input !py-3 !pl-11"
                    placeholder="Search assemblies, songs, announcements, templates…"
                    aria-label="Global search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>

        )}

      <section className="space-y-5">
        {(aHits.length > 0 || needle) && (
          <h2 className="eyebrow">
            {needle ? "Matching assemblies" : "My assemblies"}
          </h2>
        )}

        {!needle && aHits.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg font-medium">
              No assemblies yet
            </p>

            <p className="mt-2 text-stone-500">
              Click "New assembly" above to create your first presentation.
            </p>
          </div>
        ) : (
          <>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {aHits.map((a) => (
                <AssemblyCard
                  key={a.id}
                  a={a}
                  onDuplicate={() => create(a)}
                  onDelete={() => setDeleteAssembly(a)}
                />
              ))}
            </ul>

            {aHits.length === 0 && needle && (
              <p className="py-8 text-center text-stone-500">
                No assemblies match.
              </p>
            )}
          </>
        )}
      </section>
      </div>

      {!needle && discoveryEligible && (
        <footer
          aria-labelledby="about-soundfaith-title"
          className="mt-auto border-t border-stone-200 bg-surface"
        >
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <div className="mb-3 flex items-center gap-3">
                  <Image
                    src="/soundfaith.svg"
                    alt="SoundFaith"
                    width={150}
                    height={34}
                    className="h-8 w-auto"
                  />

                  <h2
                    id="about-soundfaith-title"
                    className="text-sm font-medium text-stone-800"
                  >
                    About SoundFaith
                  </h2>
                </div>

                <p className="text-sm leading-relaxed text-stone-600">
                  <strong>Assembly</strong> is part of SoundFaith, a growing collection
                  of Catholic tools that help individuals, prayer groups, ministries,
                  and communities prepare worship, proclaim Scripture, deepen faith,
                  and serve with confidence.
                </p>
              </div>

              <a
                href="https://soundfaith.app"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary inline-flex shrink-0 items-center gap-2"
              >
                Explore SoundFaith
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </footer>
      )}
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
