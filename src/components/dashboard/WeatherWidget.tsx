"use client";

import { useEffect, useRef, useState } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, LoaderCircle, MapPin, Search, Sun, X } from "lucide-react";
import { searchWeatherLocations } from "@/services/weatherService";
import { useBmsStore, type WeatherLocation } from "@/store/useBmsStore";

interface WeatherWidgetProps {
  compact?: boolean;
  className?: string;
}

function WeatherIcon({ code, className }: { code: number | null; className?: string }) {
  const Icon = code === null ? CloudSun
    : code === 0 ? Sun
      : code === 1 || code === 2 ? CloudSun
        : code === 3 ? Cloud
          : code === 45 || code === 48 ? CloudFog
            : [51, 53, 55, 56, 57].includes(code) ? CloudDrizzle
              : [61, 63, 65, 66, 67, 80, 81, 82].includes(code) ? CloudRain
                : [71, 73, 75, 77, 85, 86].includes(code) ? CloudSnow
                  : [95, 96, 99].includes(code) ? CloudLightning
                    : CloudMoon;
  return <Icon size={16} className={className} aria-hidden="true" />;
}

function locationLabel(location: WeatherLocation) {
  return [location.name, location.admin1 && location.admin1 !== location.name ? location.admin1 : "", location.country].filter(Boolean).join(", ");
}

type WeatherSearchState =
  | { query: string; status: "loading" }
  | { query: string; status: "success"; results: WeatherLocation[] }
  | { query: string; status: "error"; message: string };

export function WeatherWidget({ compact = false, className = "" }: WeatherWidgetProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState<WeatherSearchState | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const location = useBmsStore((state) => state.weatherLocation);
  const temperature = useBmsStore((state) => state.outdoorTemperature);
  const condition = useBmsStore((state) => state.weatherCondition);
  const weatherCode = useBmsStore((state) => state.weatherCode);
  const weatherStatus = useBmsStore((state) => state.weatherStatus);
  const humidity = useBmsStore((state) => state.weatherHumidity);
  const windSpeed = useBmsStore((state) => state.weatherWindSpeed);
  const feelsLike = useBmsStore((state) => state.weatherFeelsLike);
  const observedAt = useBmsStore((state) => state.weatherObservedAt);
  const setLocation = useBmsStore((state) => state.setWeatherLocation);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!open || normalizedQuery.length < 2) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setSearchState({ query: normalizedQuery, status: "loading" });
      void searchWeatherLocations(normalizedQuery, controller.signal)
        .then((results) => {
          if (!controller.signal.aborted) setSearchState({ query: normalizedQuery, status: "success", results });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) return;
          setSearchState({ query: normalizedQuery, status: "error", message: "Não foi possível buscar. Confira sua conexão e tente novamente." });
        })
    }, 320);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [open, query]);

  const normalizedQuery = query.trim();
  const currentSearch = searchState?.query === normalizedQuery ? searchState : null;
  const searching = open && normalizedQuery.length >= 2 && (!currentSearch || currentSearch.status === "loading");
  const searchError = currentSearch?.status === "error" ? currentSearch.message : "";
  const results = currentSearch?.status === "success" ? currentSearch.results : [];

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("pointerdown", closeOnOutsideClick);
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [open]);

  const chooseLocation = (nextLocation: WeatherLocation) => {
    setLocation(nextLocation);
    setQuery("");
    setSearchState(null);
    setOpen(false);
  };

  const statusLabel = weatherStatus === "loading" ? "ATUALIZANDO" : weatherStatus === "offline" ? "SEM CONEXÃO" : "TEMPO EXTERNO";
  const temperatureLabel = temperature === null ? "--°" : `${Math.round(temperature)}°`;
  const displayCondition = weatherStatus === "offline" && temperature === null ? "Clima indisponível" : condition;

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Clima em ${locationLabel(location)}: ${temperature === null ? "sem leitura" : `${temperature.toFixed(1)} graus`}, ${displayCondition}. ${statusLabel}. Selecionar local.`}
        className={`flex min-w-0 items-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-left transition hover:border-cyan-300/20 hover:bg-white/[0.045] ${compact ? "gap-2 px-2 py-1.5" : "gap-2.5 px-2.5 py-2"}`}
      >
        {weatherStatus === "loading"
          ? <LoaderCircle size={16} className="shrink-0 animate-spin text-sky-300" />
          : <WeatherIcon code={weatherCode} className={`shrink-0 ${weatherStatus === "offline" ? "text-rose-300" : "text-amber-300"}`} />}
        <span className={`font-mono font-semibold tabular-nums text-slate-100 ${compact ? "text-[12px]" : "text-[13px]"}`}>{temperatureLabel}</span>
        {!compact && <span className="min-w-0">
          <span className="block max-w-36 truncate text-[10px] font-medium text-slate-200">{displayCondition}</span>
          <span className="mt-0.5 block max-w-40 truncate text-[9px] text-slate-500">EXTERNO · {location.name}</span>
          {weatherStatus !== "online" && <span className={`mt-0.5 block text-[8px] font-semibold ${weatherStatus === "offline" ? "text-rose-300" : "text-sky-300"}`}>{statusLabel}</span>}
        </span>}
        {compact && <MapPin size={12} className="shrink-0 text-slate-500" />}
      </button>

      {open && <div role="dialog" aria-label="Selecionar local do clima" className="glass-overlay absolute right-0 top-full z-50 mt-2 w-[min(90vw,350px)] rounded-xl border border-slate-700 p-4 text-slate-200 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div><p className="text-[12px] font-semibold text-slate-100">Clima externo</p><p className="mt-0.5 text-[10px] text-slate-400">{locationLabel(location)}</p></div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Fechar seleção de local" className="rounded-md p-1.5 text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"><X size={14} /></button>
        </div>

        <div className="mb-3 flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
          <WeatherIcon code={weatherCode} className="shrink-0 text-amber-300" />
          <div className="min-w-0 flex-1"><p className="text-[14px] font-semibold text-slate-100">{temperature === null ? "--" : `${temperature.toFixed(1)}°C`} <span className="text-[10px] font-normal text-slate-400">{displayCondition}</span></p><p className="mt-0.5 text-[9px] text-slate-500">{statusLabel}{feelsLike !== null ? ` · sensação ${Math.round(feelsLike)}°` : ""}{humidity !== null ? ` · UR ${Math.round(humidity)}%` : ""}{windSpeed !== null ? ` · vento ${Math.round(windSpeed)} km/h` : ""}</p></div>
        </div>

        {observedAt && <p className="-mt-1 mb-3 text-right text-[9px] text-slate-500">Referência local · {observedAt.slice(11, 16)}</p>}

        <label htmlFor="weather-location-search" className="mb-1.5 block text-[10px] font-medium text-slate-400">Pesquisar cidade ou município</label>
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input ref={inputRef} id="weather-location-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ex.: Santos, São Paulo" autoComplete="off" className="w-full rounded-lg border border-white/[0.08] bg-[#090e14] py-2.5 pl-9 pr-3 text-[11px] text-slate-200 placeholder:text-slate-600" />
        </div>
        <div className="mt-2 max-h-52 overflow-y-auto" aria-live="polite">
          {searching && <p className="flex items-center gap-2 px-2 py-3 text-[10px] text-slate-400"><LoaderCircle size={13} className="animate-spin" />Pesquisando locais…</p>}
          {!searching && searchError && <p className="px-2 py-3 text-[10px] text-amber-300">{searchError}</p>}
          {!searching && !searchError && query.trim().length >= 2 && results.length === 0 && <p className="px-2 py-3 text-[10px] text-slate-500">Nenhum local encontrado para essa busca.</p>}
          {open && query.trim().length >= 2 && !searching && results.map((result) => <button key={`${result.id}-${result.latitude}-${result.longitude}`} type="button" onClick={() => chooseLocation(result)} className="flex min-h-10 w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[10px] text-slate-300 hover:bg-cyan-300/[0.08] hover:text-cyan-100"><MapPin size={13} className="shrink-0 text-cyan-300" /><span className="min-w-0 flex-1"><span className="block truncate font-medium">{result.name}</span><span className="mt-0.5 block truncate text-[9px] text-slate-500">{[result.admin1, result.country].filter(Boolean).join(", ")}</span></span></button>)}
        </div>
        <p className="mt-2 border-t border-white/[0.06] pt-2 text-[9px] text-slate-500">Dados atuais · <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="text-sky-300 hover:underline">Open-Meteo</a></p>
      </div>}
    </div>
  );
}
