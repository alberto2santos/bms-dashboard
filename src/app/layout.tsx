import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import { getSiteUrl } from "@/utils/siteUrl";
import "./globals.css";

const description = "Dashboard BMS para supervisão predial, simulação de equipamentos e gestão de alarmes, energia, climatização e utilidades.";
const previewEnvironment = process.env.VERCEL_ENV === "preview";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "Sentinel BMS | Supervisão Predial",
    template: "%s | Sentinel BMS",
  },
  description,
  applicationName: "Sentinel BMS",
  authors: [{ name: "Alberto Luiz" }],
  creator: "Alberto Luiz",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: "Sentinel BMS",
    title: "Sentinel BMS | Supervisão Predial",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Sentinel BMS | Supervisão Predial",
    description,
    images: [{ url: "/opengraph-image", alt: "Sentinel BMS: supervisão e simulação predial" }],
  },
  robots: { index: !previewEnvironment, follow: !previewEnvironment },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="pt-BR" data-theme="dark"><body>{children}<Analytics /></body></html>;
}
