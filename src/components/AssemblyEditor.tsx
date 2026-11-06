"use client";
import Link from "next/link";
import { useState } from "react";
import { useAssemblies } from "@/lib/assemblies";
import type { Assembly } from "@/lib/types";
import { DetailsTab } from "@/components/DetailsTab";
import { SongsTab } from "@/components/SongsTab";
import { ContentTab } from "@/components/ContentTab";
import { ReviewTab } from "@/components/ReviewTab";

const TABS = ["Details", "Songs", "Content", "Review & Export"] as const;

export function AssemblyEditor({ id }: { id: string }) {
  const [assemblies, setAssemblies] = useAssemblies();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Details");
  const a = assemblies.find((x) => x.id === id);

  if (!a) {
    return (
      <p className="text-stone-500">
        Assembly not found. <Link href="/" className="underline">Back to assemblies</Link>
      </p>
    );
  }

  const update = (patch: Partial<Assembly>) =>
    setAssemblies((l) => l.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x)));

  return (
    <div className="space-y-10">
      <div>
        <Link href="/" className="text-sm text-stone-500 transition-colors hover:text-accent">← Assemblies</Link>
        <h1 className="display mt-3 text-stone-900">{a.title || "New assembly"}</h1>
        <p className="mt-1 text-sm text-stone-500">Changes are saved automatically.</p>
      </div>

      <div role="tablist" className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-stone-100 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-full px-5 py-2 text-sm transition-all ${
              tab === t ? "bg-surface text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Details" && <DetailsTab a={a} update={update} />}
      {tab === "Songs" && <SongsTab a={a} update={update} />}
      {tab === "Content" && <ContentTab a={a} update={update} />}
      {tab === "Review & Export" && <ReviewTab a={a} update={update} />}

      <div className="flex justify-between border-t border-stone-200 pt-8">
        <button className="btn" disabled={tab === TABS[0]} onClick={() => setTab(TABS[TABS.indexOf(tab) - 1])}>Back</button>
        <button className="btn btn-primary" disabled={tab === TABS[3]} onClick={() => setTab(TABS[TABS.indexOf(tab) + 1])}>Next</button>
      </div>
    </div>
  );
}
