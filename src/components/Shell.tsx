import type { Lang } from "@/lib/lang";
import "@/app/globals.css";

// <html> + <body> per bahasa (dua root layout terpisah: "/" Indonesia, "/en" English).
export function Shell({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <html lang={lang} className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
