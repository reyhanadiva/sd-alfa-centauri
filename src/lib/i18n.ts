import { id } from "@/content/id";
import { en } from "@/content/en";
import type { Lang } from "./lang";

export type { Lang };
export const getT = (lang: Lang) => (lang === "en" ? en : id);
