"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAssemblies, useSoundFaithDiscoveryEligibility } from "@/lib/assemblies";
import { exportPptx } from "@/lib/export";
import { requestPresentationFullscreen } from "@/lib/fullscreen";
import type { Assembly } from "@/lib/types";
import { DetailsTab } from "@/components/DetailsTab";
import { SongsTab } from "@/components/SongsTab";
import { ContentTab } from "@/components/ContentTab";
import { ReviewTab } from "@/components/ReviewTab";
import { Icon } from "@/components/Icon";

const TABS = ["Template", "Content", "Songs", "Edit & Present"] as const;

export function AssemblyEditor({ id }: { id: string }) {
  const [assemblies, setAssemblies] = useAssemblies();
  const [, setDiscoveryEligible] = useSoundFaithDiscoveryEligibility();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Template");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [presentationError, setPresentationError] = useState("");
  const [presentRequest, setPresentRequest] = useState(0);
  const handledPresentRequestRef = useRef(0);
  const a = assemblies.find((x) => x.id === id);
  const requestPresentation = useCallback(() => {
    setPresentationError("");
    setTab("Edit & Present");
    setPresentRequest((request) => request + 1);
    void requestPresentationFullscreen(true).catch((error: unknown) => {
      setPresentationError(error instanceof Error ? error.message : "Could not enter fullscreen.");
    });
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  useEffect(() => {
    const onPresent = () => requestPresentation();
    window.addEventListener("assembly:present", onPresent);
    return () => window.removeEventListener("assembly:present", onPresent);
  }, [requestPresentation]);

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
      setDiscoveryEligible(true);
    } catch (e) {
      setExportError(`Export failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setExporting(false);
    }
  };
  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="space-y-5">
        <Link href="/" className="text-sm text-stone-500 transition-colors hover:text-accent">← Assemblies</Link>
        <div className="flex flex-col items-start gap-4">
          <div>
            <h1 className="display mt-3 text-stone-900">{a.title || "New assembly"}</h1>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-3">
            <button
              type="button"
              className="btn btn-primary !px-5 !py-3 sm:!px-6 sm:!py-3.5 !text-base sm:!text-lg font-medium !gap-2.5 !rounded-xl shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
              onClick={requestPresentation}
            >
              <Icon name="present" className="h-5 w-5 sm:h-6 sm:w-6" />
              <span>Present</span>
            </button>
            <button
              type="button"
              className="btn !px-5 !py-3 sm:!px-6 sm:!py-3.5 !text-base sm:!text-lg font-medium !gap-2.5 !rounded-xl shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
              disabled={exporting}
              onClick={() => void exportAssembly()}
            >
              <Icon name="download" className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="sm:hidden">{exporting ? "Preparing…" : "Download"}</span>
              <span className="hidden sm:inline">{exporting ? "Preparing download…" : "Download PowerPoint"}</span>
            </button>
          </div>
          {exportError && tab !== "Edit & Present" && <p role="alert" className="rounded-xl border border-red-500 p-3 text-sm text-red-600">{exportError}</p>}
          {presentationError && tab !== "Edit & Present" && <p role="status" className="text-sm text-amber-700">{presentationError}</p>}
        </div>
      </div>

      <nav aria-label="Assembly steps" className="relative my-3 grid grid-cols-4 gap-1 py-3 sm:my-6 sm:gap-2 sm:py-4">
        <span aria-hidden="true" className="absolute left-[12.5%] right-[12.5%] top-[2.125rem] h-px bg-stone-200 sm:top-11" />
          {TABS.map((step, index) => (
            <button
              key={step}
              type="button"
              onClick={() => {
                handledPresentRequestRef.current = presentRequest;
                setTab(step);
              }}
              aria-current={tab === step ? "step" : undefined}
              className={`stepper-item relative z-10 flex min-w-0 cursor-pointer flex-col items-center gap-1.5 rounded-xl py-1 text-center text-[11px] transition sm:gap-2 sm:text-sm ${tab === step ? "is-current" : ""}`}
            >
              <span className="stepper-number grid h-9 w-9 place-items-center rounded-full border text-sm font-semibold tabular-nums sm:h-12 sm:w-12 sm:border-2 sm:text-lg">{index + 1}</span>
              <span className="max-w-full truncate">{step}</span>
            </button>
          ))}
      </nav>

      {tab === "Template" && <DetailsTab a={a} update={update} />}
      {tab === "Content" && <ContentTab a={a} update={update} />}
      {tab === "Songs" && <SongsTab a={a} update={update} />}
      {tab === "Edit & Present" && <ReviewTab a={a} update={update} exportError={exportError} presentationError={presentationError} presentRequest={presentRequest} handledPresentRequestRef={handledPresentRequestRef} />}

      {tab !== "Edit & Present" && (
        <div className="flex justify-between border-t border-stone-200 pt-5">
          {tab !== TABS[0]
            ? <button className="btn" onClick={() => setTab(TABS[TABS.indexOf(tab) - 1])}>Back</button>
            : <span />}
          <button className="btn btn-primary" onClick={() => setTab(TABS[TABS.indexOf(tab) + 1])}>
            {tab === "Songs" ? "Edit & present" : "Continue"}
          </button>
        </div>
      )}
    </div>
  );
}
