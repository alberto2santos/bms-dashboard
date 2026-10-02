import { z } from "zod";
import { getHistorianPool } from "@/services/historian";
import { requireServiceToken } from "@/services/serviceAuth";

export const runtime = "nodejs";

const querySchema = z.object({
  from: z.coerce.number().int().nonnegative().optional(),
  to: z.coerce.number().int().nonnegative().optional(),
  limit: z.coerce.number().int().min(1).max(5_000).default(1_000),
}).refine(({ from, to }) => from === undefined || to === undefined || from <= to, "from deve ser menor ou igual a to.");

export async function GET(request: Request) {
  const unauthorized = requireServiceToken(request);
  if (unauthorized) return unauthorized;

  const parsedQuery = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsedQuery.success) return Response.json({ error: "Parâmetros inválidos.", issues: parsedQuery.error.issues }, { status: 400 });

  const { from, to, limit } = parsedQuery.data;
  const values: number[] = [];
  const predicates: string[] = [];
  if (from !== undefined) { values.push(from); predicates.push(`timestamp_ms >= $${values.length}`); }
  if (to !== undefined) { values.push(to); predicates.push(`timestamp_ms <= $${values.length}`); }
  values.push(limit);

  try {
    const result = await getHistorianPool().query(
      `SELECT event_id, timestamp_ms, payload FROM alarm_events ${predicates.length ? `WHERE ${predicates.join(" AND ")}` : ""} ORDER BY timestamp_ms DESC LIMIT $${values.length}`,
      values,
    );
    return Response.json({ events: result.rows.map((row) => ({ id: row.event_id, timestamp: Number(row.timestamp_ms), ...row.payload })) });
  } catch {
    return Response.json({ error: "Historiador indisponível." }, { status: 503 });
  }
}