export interface TabProps {
  a: import("@/lib/types").Assembly;
  update: (patch: Partial<import("@/lib/types").Assembly>) => void;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-stone-500">{label}</span>
      {children}
    </label>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card min-w-0 space-y-5 p-4 sm:p-6">
      <div>
        <h2 className="display text-2xl text-stone-900">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-stone-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}
