import type { Metadata, Viewport } from "next";
import { getT, type Lang } from "./i18n";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sdalfacentauri.sch.id";

export const viewport: Viewport = { themeColor: "#4884fe", width: "device-width", initialScale: 1 };

export function metaFor(lang: Lang): Metadata {
  const t = getT(lang);
  return {
    metadataBase: new URL(base),
    title: t.meta.title,
    description: t.meta.description,
    alternates: { canonical: t.path, languages: { id: "/", en: "/en", "x-default": "/" } },
    openGraph: { title: t.meta.ogTitle, description: t.meta.ogDescription, locale: t.ogLocale, type: "website", url: t.path },
  };
}
