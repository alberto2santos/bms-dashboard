"use client";

import { useEffect } from "react";
import { fetchCurrentWeather } from "@/services/weatherService";
import { useBmsStore } from "@/store/useBmsStore";

const WEATHER_REFRESH_MS = 15 * 60_000;

export function useWeather() {
  const location = useBmsStore((state) => state.weatherLocation);

  useEffect(() => {
    let disposed = false;
    let controller: AbortController | null = null;

    const refresh = async () => {
      // Cancela a consulta anterior para evitar aplicar dados do local que acabou de ser trocado.
      controller?.abort();
      controller = new AbortController();
      try {
        const weather = await fetchCurrentWeather(location, controller.signal);
        if (!disposed) useBmsStore.getState().setWeatherSnapshot(weather);
      } catch (error) {
        if (!disposed && !(error instanceof DOMException && error.name === "AbortError")) {
          useBmsStore.getState().setWeatherStatus("offline");
        }
      }
    };

    useBmsStore.getState().setWeatherStatus("loading");
    void refresh();
    const interval = window.setInterval(() => void refresh(), WEATHER_REFRESH_MS);
    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(interval);
    };
  }, [location]);
}
