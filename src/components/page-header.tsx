import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({ icon: Icon, kicker, title, children }: { icon: LucideIcon; kicker: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 animate-rise">
      <div className="flex items-center gap-4">
        <div className="icon-chip h-12 w-12"><Icon className="h-6 w-6" /></div>
        <div>
          <div className="font-mono text-xs tracking-widest text-muted-foreground">{kicker}</div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        </div>
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, tone = "text-primary", delay = 0 }: { icon: LucideIcon; label: string; value: ReactNode; tone?: string; delay?: number }) {
  return (
    <div className="card-3d lift animate-rise p-4" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <div className={`mt-1 font-mono text-3xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}
