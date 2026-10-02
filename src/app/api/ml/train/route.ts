import { requireServiceToken } from "@/services/serviceAuth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const unauthorized = requireServiceToken(request);
  if (unauthorized) return unauthorized;

  const serviceUrl = process.env.ML_SERVICE_URL;
  const token = process.env.SERVICE_API_TOKEN;
  if (!serviceUrl || !token) return Response.json({ error: "Serviço de ML não configurado." }, { status: 503 });

  try {
    const response = await fetch(`${serviceUrl.replace(/\/$/, "")}/train`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30_000),
    });
    const result = await response.json().catch(() => ({}));
    return Response.json(result, { status: response.ok ? 200 : response.status === 409 ? 409 : 503 });
  } catch {
    return Response.json({ error: "Serviço de ML indisponível." }, { status: 503 });
  }
}