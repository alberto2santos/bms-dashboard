import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/telemetry/route";

describe("GET /api/telemetry", () => {
  beforeEach(() => vi.stubEnv("SERVICE_API_TOKEN", "test-service-token"));
  afterEach(() => vi.unstubAllEnvs());

  it("requires the service token", async () => {
    const response = await GET(new Request("http://localhost/api/telemetry"));

    expect(response.status).toBe(401);
  });

  it("rejects invalid ranges before accessing the historian", async () => {
    const response = await GET(new Request("http://localhost/api/telemetry?from=20&to=10", {
      headers: { authorization: "Bearer test-service-token" },
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "Parâmetros inválidos." });
  });

  it("rejects limits outside the supported query bounds", async () => {
    const response = await GET(new Request("http://localhost/api/telemetry?limit=6000", {
      headers: { authorization: "Bearer test-service-token" },
    }));

    expect(response.status).toBe(400);
  });
});