"use client";
import Link from "next/link";
import { useState } from "react";
import { useAssemblies } from "@/lib/assemblies";
import { exportPptx } from "@/lib/export";
import type { Assembly } from "@/lib/types";
import { DetailsTab } from "@/components/DetailsTab";
import { SongsTab } from "@/components/SongsTab";
import { ContentTab } from "@/components/ContentTab";
import { ReviewTab } from "@/components/ReviewTab";

const TABS = ["Details", "Songs", "Content", "Review & Export"] as const;

export function AssemblyEditor({ id }: { id: string }) {
  const [assemblies, setAssemblies] = useAssemblies();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Details");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
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

  const exportAssembly = async () => {
    if (!a.slides?.length) {
      setExportError("There are no slides to export. Add a slide first.");
      return;
    }
    setExporting(true);
    setExportError("");
    try {
      await exportPptx(a);
    } catch (e) {
      setExportError(`Export failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <Link href="/" className="text-sm text-stone-500 transition-colors hover:text-accent">← Assemblies</Link>
        <h1 className="display mt-3 text-stone-900">{a.title || "New assembly"}</h1>
        <p className="mt-1 text-sm text-stone-500">Changes are saved automatically.</p>
      </div>

      <div role="tablist" aria-label="Assembly sections" tabIndex={0} className="flex w-full gap-1 overflow-x-auto rounded-full bg-stone-100 p-1 sm:w-fit sm:max-w-full">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-w-max flex-1 whitespace-nowrap rounded-full px-2.5 py-2 text-xs transition-all sm:flex-none sm:px-5 sm:text-sm ${
              tab === t ? "bg-surface text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-800"
            }`}
          >
            {t === "Review & Export" ? <><span className="sm:hidden">Review</span><span className="hidden sm:inline">Review &amp; Export</span></> : t}
          </button>
        ))}
      </div>

      {tab === "Details" && <DetailsTab a={a} update={update} />}
      {tab === "Songs" && <SongsTab a={a} update={update} />}
      {tab === "Content" && <ContentTab a={a} update={update} />}
      {tab === "Review & Export" && <ReviewTab a={a} update={update} exporting={exporting} onExport={exportAssembly} exportError={exportError} />}

      <div className="border-t border-stone-200 pt-8">
        {tab === TABS[3] && exportError && <p role="alert" className="mb-4 text-sm text-red-600">{exportError}</p>}
        <div className="flex justify-between">
          {tab !== TABS[0] && <button className="btn" onClick={() => setTab(TABS[TABS.indexOf(tab) - 1])}>Back</button>}
          {tab === TABS[3]
            ? <button className="btn btn-primary ml-auto" disabled={exporting} onClick={exportAssembly}>{exporting ? "Exporting…" : "Export PowerPoint"}</button>
            : <button className="btn btn-primary ml-auto" onClick={() => setTab(TABS[TABS.indexOf(tab) + 1])}>Next</button>}
        </div>
      </div>
    </div>
  );
}
