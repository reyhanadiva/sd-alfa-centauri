// Pemuat sederhana supaya Node bisa membaca file .ts proyek ini: alias "@/..." -> src/..., dan impor tanpa ekstensi.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";

const src = resolve(dirname(fileURLToPath(import.meta.url)), "../src");
const tryExt = (base) => {
  for (const ext of ["", ".ts", ".tsx", "/index.ts"]) if (existsSync(base + ext) && !existsSync(base + ext + "/")) return base + ext;
  for (const ext of [".ts", ".tsx", "/index.ts"]) if (existsSync(base + ext)) return base + ext;
  return null;
};
export async function resolve_(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    const f = tryExt(resolve(src, specifier.slice(2)));
    if (f) return next(pathToFileURL(f).href, context);
  } else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL && !/\.[a-z]+$/.test(specifier)) {
    const f = tryExt(resolve(dirname(fileURLToPath(context.parentURL)), specifier));
    if (f) return next(pathToFileURL(f).href, context);
  }
  return next(specifier, context);
}
export { resolve_ as resolve };
