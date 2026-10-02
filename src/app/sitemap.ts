import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/utils/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: new URL("/", getSiteUrl()).toString(), changeFrequency: "weekly", priority: 1 }];
}