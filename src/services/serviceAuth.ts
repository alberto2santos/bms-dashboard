export function requireServiceToken(request: Request): Response | null {
  const token = process.env.SERVICE_API_TOKEN;
  if (!token) return Response.json({ error: "SERVICE_API_TOKEN não configurado." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${token}`) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }
  return null;
}