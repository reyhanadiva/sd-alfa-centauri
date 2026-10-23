import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SD Alfa Centauri Bandung | Sekolah Dasar Islam Inklusif & Berkarakter",
  description:
    "SD Alfa Centauri, Bandung. Terakreditasi A. Mencetak generasi Bertakwa, Cerdas, dan Kreatif dengan pendampingan inklusi, pendidikan karakter, dan integrasi nilai keislaman dengan sains teknologi.",
  openGraph: {
    title: "SD Alfa Centauri Bandung",
    description: "To Be The Finest School In The World.",
    locale: "id_ID",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#4884fe",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
