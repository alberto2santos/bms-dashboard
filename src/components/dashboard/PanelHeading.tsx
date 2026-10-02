import type { ReactNode } from "react";
import { InfoTooltip } from "@/components/dashboard/InfoTooltip";

interface PanelHeadingProps {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  action?: ReactNode;
  info?: string;
}

export function PanelHeading({ icon, eyebrow, title, action, info }: PanelHeadingProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.035] text-cyan-300">{icon}</div>
        <div className="min-w-0">
          <p className="text-[9px] font-semibold tracking-[0.1em] text-slate-500">{eyebrow}</p>
          <div className="mt-1 flex min-w-0 items-center gap-1">
            <h2 className="truncate text-[13px] font-semibold tracking-[0.01em] text-slate-100">{title}</h2>
            {info && <InfoTooltip label={`Informações sobre ${title}`} content={info} />}
          </div>
        </div>
      </div>
      {action}
    </div>
  );
}
