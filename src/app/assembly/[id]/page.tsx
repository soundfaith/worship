import { Suspense } from "react";
import { AssemblyEditor } from "@/components/AssemblyEditor";

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssemblyEditor id={id} />;
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-stone-400">Loading…</p>}>
      <Editor params={params} />
    </Suspense>
  );
}
