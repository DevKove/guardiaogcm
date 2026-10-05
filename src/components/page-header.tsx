import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({ icon: Icon, asset, kicker, title, children }: { icon: LucideIcon; asset?: string; kicker: string; title: string; children?: ReactNode }) {
  return (
    <section className="relative mb-5 overflow-hidden border-b border-cyan-400/20 bg-[#05090e] px-4 py-5 animate-rise md:px-5">
      <div className="absolute inset-x-0 top-0 h-px bg-cyan-400/80" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {asset ? (
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-cyan-400/25 shadow-[0_0_16px_rgba(34,211,238,.08)] ${asset.endsWith(".png") ? "bg-transparent" : "bg-white p-0.5"}`}>
              <img src={`${import.meta.env.BASE_URL}cad-assets/${asset}`} alt="" aria-hidden="true" className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="icon-chip h-10 w-10 shrink-0"><Icon className="h-5 w-5" /></div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300">
              <span className="live-dot h-1.5 w-1.5 rounded-full bg-cyan-400" /> CAD GUARDA MUNICIPAL
            </div>
            <div className="mt-1 text-[9px] font-medium uppercase tracking-[0.18em] text-slate-500">{kicker}</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">{title}</h1>
          </div>
        </div>
        {children && <div className="flex gap-2">{children}</div>}
      </div>
    </section>
  );
}

export function StatCard({ icon: Icon, label, value, tone = "text-primary", delay = 0 }: { icon: LucideIcon; label: string; value: ReactNode; tone?: string; delay?: number }) {
  return (
    <div className="card-3d lift animate-rise p-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <div className={`mt-2 font-mono text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}
