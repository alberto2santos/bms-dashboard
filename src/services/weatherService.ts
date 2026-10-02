import type { WeatherLocation } from "@/store/useBmsStore";
import { z } from "zod";

const geocodingResponseSchema = z.object({
  results: z.array(z.object({
    id: z.number().int(),
    name: z.string().min(1),
    admin1: z.string().optional(),
    country: z.string().optional(),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    timezone: z.string().optional(),
  })).optional(),
});

const forecastResponseSchema = z.object({
  current: z.object({
    temperature_2m: z.number().finite(),
    relative_humidity_2m: z.number().finite().min(0).max(100),
    apparent_temperature: z.number().finite(),
    weather_code: z.number().int().min(0).max(99),
    wind_speed_10m: z.number().finite().min(0),
    time: z.string().min(1),
  }),
});

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

const SEARCH_CACHE_TTL_MS = 60_000;
const WEATHER_CACHE_TTL_MS = 5 * 60_000;
const MAX_CACHE_ENTRIES = 100;
const searchCache = new Map<string, CacheEntry<WeatherLocation[]>>();
const weatherCache = new Map<string, CacheEntry<CurrentWeather>>();

function readCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function writeCache<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number) {
  if (!cache.has(key) && cache.size >= MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value!);
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("A operação foi cancelada.", "AbortError");
}

export interface CurrentWeather {
  temperature: number;
  humidity: number;
  feelsLike: number;
  code: number;
  windSpeed: number;
  observedAt: string;
  condition: string;
}

export async function searchWeatherLocations(query: string, signal?: AbortSignal): Promise<WeatherLocation[]> {
  const params = new URLSearchParams({ name: query, count: "6", language: "pt", format: "json" });
  const cacheKey = params.toString();
  throwIfAborted(signal);
  const cached = readCache(searchCache, cacheKey);
  if (cached) return cached;

  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, { signal });
  if (!response.ok) throw new Error("Não foi possível pesquisar esse local.");
  const payload = geocodingResponseSchema.parse(await response.json());
  const locations = (payload.results ?? []).map((place) => ({
    id: place.id,
    name: place.name,
    admin1: place.admin1 ?? "",
    country: place.country ?? "",
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone ?? "auto",
  }));
  throwIfAborted(signal);
  writeCache(searchCache, cacheKey, locations, SEARCH_CACHE_TTL_MS);
  return locations;
}

export async function fetchCurrentWeather(location: WeatherLocation, signal?: AbortSignal): Promise<CurrentWeather> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
    timezone: location.timezone || "auto",
  });
  const cacheKey = params.toString();
  throwIfAborted(signal);
  const cached = readCache(weatherCache, cacheKey);
  if (cached) return cached;

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });
  if (!response.ok) throw new Error("Não foi possível atualizar as condições externas.");
  const parsed = forecastResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("A API não retornou as condições atuais para esse local.");
  const current = parsed.data.current;
  const weather = {
    temperature: current.temperature_2m,
    humidity: current.relative_humidity_2m,
    feelsLike: current.apparent_temperature,
    code: current.weather_code,
    windSpeed: current.wind_speed_10m,
    observedAt: current.time,
    condition: describeWeatherCode(current.weather_code),
  };
  throwIfAborted(signal);
  writeCache(weatherCache, cacheKey, weather, WEATHER_CACHE_TTL_MS);
  return weather;
}

export function describeWeatherCode(code: number) {
  if (code === 0) return "Céu limpo";
  if (code === 1) return "Predominantemente limpo";
  if (code === 2) return "Parcialmente nublado";
  if (code === 3) return "Nublado";
  if (code === 45 || code === 48) return "Neblina";
  if ([51, 53, 55, 56, 57].includes(code)) return "Garoa";
  if ([61, 63, 65, 66, 67].includes(code)) return "Chuva";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Neve";
  if ([80, 81, 82].includes(code)) return "Pancadas de chuva";
  if ([95, 96, 99].includes(code)) return "Trovoadas";
  return "Condição variável";
}
