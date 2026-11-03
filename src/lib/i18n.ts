import { id } from "@/content/id";
import { en } from "@/content/en";
import type { Lang } from "./lang";

export type { Lang };
import { applyPanel } from "./panel";

// Teks bawaan + data yang diterbitkan panel admin (kosong = persis bawaan). Digabung sekali saat modul dimuat.
const merged = { id: applyPanel(id, "id"), en: applyPanel(en, "en") };
export const getT = (lang: Lang) => (lang === "en" ? merged.en : merged.id);
