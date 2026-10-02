import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Sentinel BMS: dashboard para supervisão e simulação predial";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const favicon = await readFile(join(process.cwd(), "public", "favicon.svg"));
  const faviconData = `data:image/svg+xml;base64,${favicon.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 68,
          backgroundColor: "#0b0f19",
          color: "#f8fafc",
          border: "1px solid #334155",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* ImageResponse requires a native img for embedded data-URI assets. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={faviconData} width={104} height={104} alt="" style={{ borderRadius: 24 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ color: "#67e8f9", fontSize: 20, fontWeight: 600 }}>BUILDING MANAGEMENT SYSTEM</div>
            <div style={{ marginTop: 10, fontSize: 58, fontWeight: 700 }}>Sentinel BMS</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 32, fontWeight: 600 }}>Supervisão e simulação predial</div>
          <div style={{ color: "#94a3b8", fontSize: 22 }}>Hidráulica · Energia · HVAC · Alarmes · Acessos</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #334155", paddingTop: 20, color: "#94a3b8", fontSize: 17 }}>
          <span>MONITORAMENTO OPERACIONAL</span>
          <span>sentinel-bms</span>
        </div>
      </div>
    ),
    size,
  );
}