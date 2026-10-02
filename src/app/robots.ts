import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/utils/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  const previewEnvironment = process.env.VERCEL_ENV === "preview";

  return {
    rules: { userAgent: "*", allow: previewEnvironment ? undefined : "/", disallow: previewEnvironment ? "/" : "/api/" },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
    host: siteUrl.host,
  };
}