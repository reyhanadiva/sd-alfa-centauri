import { Shell } from "@/components/Shell";
import { metaFor, viewport as vp } from "@/lib/meta";

export const metadata = metaFor("en");
export const viewport = vp;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <Shell lang="en">{children}</Shell>;
}
