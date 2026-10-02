"use client";

import { useId } from "react";
import { Info } from "lucide-react";

interface InfoTooltipProps {
  label: string;
  content: string;
}

export function InfoTooltip({ label, content }: InfoTooltipProps) {
  const tooltipId = useId();

  return (
    <span className="group/tooltip relative inline-flex shrink-0 align-middle">
      <button type="button" aria-label={label} aria-describedby={tooltipId} className="flex size-7 min-h-7 min-w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/[0.06] hover:text-cyan-200 focus-visible:text-cyan-200">
        <Info size={14} />
      </button>
      <span id={tooltipId} role="tooltip" className="info-tooltip pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2.5 text-left text-[10px] font-normal leading-relaxed opacity-0 shadow-xl backdrop-blur-md transition-opacity duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100">
        {content}
      </span>
    </span>
  );
}
