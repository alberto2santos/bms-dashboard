"use client";

import { useEffect, useState } from "react";
import { Activity, ArrowUpDown, BellRing, DoorOpen, Flame, Gauge, Lightbulb, SlidersHorizontal, Waves, Wind, X } from "lucide-react";
import { useBmsStore } from "@/store/useBmsStore";

interface SidebarNavigationProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const groups = [
  {
    label: "EDIFÍCIO",
    items: [{ id: "overview", label: "Visão geral", icon: Gauge }],
  },
  {
    label: "SISTEMAS",
    items: [
      { id: "hydraulic", label: "Hidráulica", icon: Waves },
      { id: "fire", label: "Incêndio", icon: Flame },
      { id: "gates", label: "Portões", icon: DoorOpen },
      { id: "elevators", label: "Elevadores", icon: ArrowUpDown },
      { id: "energy", label: "Energia", icon: Lightbulb },
      { id: "hvac", label: "HVAC e qualidade do ar", icon: Wind },
    ],
  },
  {
    label: "OPERAÇÃO",
    items: [
      { id: "simulation", label: "Cenários", icon: SlidersHorizontal },
      { id: "events", label: "Alarmes e eventos", icon: BellRing },
    ],
  },
];

export function SidebarNavigation({ mobileOpen, onClose }: SidebarNavigationProps) {
  const [activeSection, setActiveSection] = useState("overview");
  const activeAlarms = useBmsStore((state) => state.alarms.filter((alarm) => alarm.status === "active").length);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-bms-section]"));
    const updateActiveSection = () => {
      let current = sections[0]?.id ?? "overview";
      let nearestTop = Number.NEGATIVE_INFINITY;
      for (const section of sections) {
        const top = section.getBoundingClientRect().top;
        if (top <= 150 && top > nearestTop) {
          current = section.id;
          nearestTop = top;
        }
      }
      const hashId = window.location.hash.slice(1);
      const selectedTarget = sections.find((section) => section.id === hashId);
      if (selectedTarget) {
        const rect = selectedTarget.getBoundingClientRect();
        if (rect.top <= 150 && rect.bottom > 0) current = selectedTarget.id;
      }
      setActiveSection(current);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen, onClose]);

  return (
    <>
      {mobileOpen && <button type="button" aria-label="Fechar menu de navegação" onClick={onClose} className="fixed inset-x-0 bottom-0 top-[126px] z-30 bg-slate-950/60 backdrop-blur-[2px] lg:hidden" />}
      <aside id="sidebar-navigation" aria-label="Navegação por seção" className={`fixed bottom-0 left-0 top-[126px] z-40 flex w-[min(84vw,280px)] flex-col border-r border-white/[0.07] bg-[#0d141d] p-3 shadow-2xl transition-transform duration-200 lg:sticky lg:bottom-auto lg:top-[68px] lg:z-auto lg:h-[calc(100vh_-_68px)] lg:w-[222px] lg:shrink-0 lg:translate-x-0 lg:visible lg:border-r-0 lg:bg-transparent lg:p-0 lg:shadow-none ${mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full"}`}>
        <div className="panel-surface glass-menu flex h-full min-h-0 flex-col rounded-2xl p-3 lg:overflow-y-auto">
          <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] px-2 pb-3 pt-1">
            <div><p className="text-[9px] font-bold tracking-[0.16em] text-cyan-300">SENTINEL BMS</p><p className="mt-1 text-[9px] text-slate-500">NAVEGAÇÃO</p></div>
            <button type="button" onClick={onClose} aria-label="Fechar menu" className="inline-flex size-10 items-center justify-center rounded-lg text-slate-400 hover:bg-white/[0.06] lg:hidden"><X size={15} /></button>
          </div>

          <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto" aria-label="Seções do dashboard">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 px-2 text-[8px] font-bold tracking-[0.15em] text-slate-500">{group.label}</p>
                <div className="space-y-1">
                  {group.items.map(({ id, label, icon: Icon }) => {
                    const active = activeSection === id;
                    return (
                      <a
                        key={id}
                        href={`#${id}`}
                        aria-current={active ? "location" : undefined}
                        onClick={() => { setActiveSection(id); onClose(); }}
                        className={`flex min-h-10 items-center gap-2.5 rounded-lg border px-2.5 text-[10px] font-medium transition ${active ? "border-cyan-300/15 bg-cyan-300/[0.09] text-cyan-200" : "border-transparent text-slate-400 hover:border-white/[0.06] hover:bg-white/[0.035] hover:text-slate-200"}`}
                      >
                        <Icon size={14} className="shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                        {id === "events" && activeAlarms > 0 && <span className="rounded-full bg-rose-400/[0.13] px-1.5 py-0.5 font-mono text-[8px] text-rose-300">{activeAlarms}</span>}
                      </a>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-4 border-t border-white/[0.06] px-2 pt-3">
            <p className="flex items-center gap-1.5 text-[8px] font-semibold tracking-[0.1em] text-slate-500"><Activity size={10} className="text-emerald-400" />SIMULAÇÃO LOCAL</p>
          </div>
        </div>
      </aside>
    </>
  );
}
