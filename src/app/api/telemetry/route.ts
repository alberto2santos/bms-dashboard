import { z } from "zod";
import { getHistorianPool } from "@/services/historian";
import { requireServiceToken } from "@/services/serviceAuth";

export const runtime = "nodejs";

const querySchema = z.object({
  from: z.coerce.number().int().nonnegative().optional(),
  to: z.coerce.number().int().nonnegative().optional(),
  deviceId: z.string().trim().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(5_000).default(1_000),
}).refine(({ from, to }) => from === undefined || to === undefined || from <= to, "from deve ser menor ou igual a to.");

export async function GET(request: Request) {
  const unauthorized = requireServiceToken(request);
  if (unauthorized) return unauthorized;

  const parsedQuery = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsedQuery.success) return Response.json({ error: "Parâmetros inválidos.", issues: parsedQuery.error.issues }, { status: 400 });

  const { from, to, deviceId, limit } = parsedQuery.data;
  const values: (string | number)[] = [];
  const predicates: string[] = [];
  if (from !== undefined) { values.push(from); predicates.push(`timestamp_ms >= $${values.length}`); }
  if (to !== undefined) { values.push(to); predicates.push(`timestamp_ms <= $${values.length}`); }
  if (deviceId !== undefined) { values.push(deviceId); predicates.push(`device_id = $${values.length}`); }
  values.push(limit);

  try {
    const result = await getHistorianPool().query(
      `SELECT device_id, timestamp_ms, tank_level_percent, demand_kw, energy_kwh FROM telemetry_readings ${predicates.length ? `WHERE ${predicates.join(" AND ")}` : ""} ORDER BY timestamp_ms DESC LIMIT $${values.length}`,
      values,
    );
    return Response.json({ readings: result.rows.map((row) => ({
      deviceId: row.device_id,
      timestamp: Number(row.timestamp_ms),
      tankLevelPercent: row.tank_level_percent,
      demandKw: row.demand_kw,
      energyKwh: row.energy_kwh,
    })) });
  } catch {
    return Response.json({ error: "Historiador indisponível." }, { status: 503 });
  }
}