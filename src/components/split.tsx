// Pemecah teks menjadi kata untuk animasi `.rise` (aman dipakai di server component).
/** Memecah teks menjadi kata-kata; `from` = nomor urut kata pertama (supaya beberapa potongan teks tetap berurutan). */
export function split(text: string, from = 0) {
  const words = text.trim().split(/\s+/);
  return words.map((w, i) => (
    <span key={i}>
      <span className="w" style={{ "--i": from + i } as React.CSSProperties}>{w}</span>
      {i < words.length - 1 ? " " : null}
    </span>
  ));
}
