import { bmsTelemetrySchema, mlPredictionResponseSchema } from "@/services/bmsContracts";
import { requireServiceToken } from "@/services/serviceAuth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const unauthorized = requireServiceToken(request);
  if (unauthorized) return unauthorized;

  const payload = await request.json().catch(() => null);
  const parsed = bmsTelemetrySchema.safeParse(payload);
  if (!parsed.success) return Response.json({ error: "Telemetria inválida." }, { status: 400 });

  const serviceUrl = process.env.ML_SERVICE_URL;
  const token = process.env.SERVICE_API_TOKEN;
  if (!serviceUrl || !token) return Response.json({ error: "Serviço de ML não configurado." }, { status: 503 });

  try {
    const response = await fetch(`${serviceUrl.replace(/\/$/, "")}/predict`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return Response.json({ error: response.status === 409 ? "Modelo ainda não treinado." : "Serviço de ML indisponível." }, { status: response.status === 409 ? 409 : 503 });
    const prediction = mlPredictionResponseSchema.safeParse(await response.json());
    if (!prediction.success) return Response.json({ error: "Resposta inválida do serviço de ML." }, { status: 502 });
    return Response.json(prediction.data);
  } catch {
    return Response.json({ error: "Serviço de ML indisponível." }, { status: 503 });
  }
}