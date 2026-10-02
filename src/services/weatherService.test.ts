import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCurrentWeather, searchWeatherLocations } from "@/services/weatherService";
import type { WeatherLocation } from "@/store/useBmsStore";

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
}

const location: WeatherLocation = {
  id: "weather-test",
  name: "Cidade de teste",
  admin1: "Estado de teste",
  country: "Brasil",
  latitude: 51.234567,
  longitude: -42.345678,
  timezone: "America/Sao_Paulo",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("weather service", () => {
  it("rejects forecast payloads with invalid measurements", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      current: {
        temperature_2m: 22,
        relative_humidity_2m: 140,
        apparent_temperature: 22,
        weather_code: 0,
        wind_speed_10m: 4,
        time: "2026-09-29T12:00",
      },
    })));

    await expect(fetchCurrentWeather(location)).rejects.toThrow("A API não retornou as condições atuais");
  });

  it("caches validated forecasts for repeated requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      current: {
        temperature_2m: 22,
        relative_humidity_2m: 60,
        apparent_temperature: 23,
        weather_code: 1,
        wind_speed_10m: 4,
        time: "2026-09-29T12:00",
      },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const first = await fetchCurrentWeather(location);
    const second = await fetchCurrentWeather(location);

    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects geocoding results outside valid coordinate ranges", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
      results: [{ id: 1, name: "Local inválido", latitude: 95, longitude: 0 }],
    })));

    await expect(searchWeatherLocations("local-invalido-zod-test")).rejects.toThrow();
  });
});