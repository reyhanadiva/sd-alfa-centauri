import { Fragment } from "react";

// Teks dengan **tebal** sederhana (dipakai di kamus bahasa agar penekanan ikut diterjemahkan).
export function Rich({ text, strong = "font-semibold text-white" }: { text: string; strong?: string }) {
  return (
    <>
      {text.split("**").map((part, i) => (i % 2 ? <strong key={i} className={strong}>{part}</strong> : <Fragment key={i}>{part}</Fragment>))}
    </>
  );
}
