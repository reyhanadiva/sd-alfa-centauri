// Memecah judul menjadi kata supaya tiap kata bisa naik bergiliran saat judul masuk layar (CSS scroll-driven,
// lihat `.rise` di globals.css). Browser tanpa dukungan: judul tampil biasa. Teks tetap utuh untuk pembaca layar.
export function Words({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  return (
    <span className="rise">
      {words.map((w, i) => (
        <span key={i}>
          <span className="w" style={{ "--i": i } as React.CSSProperties}>{w}</span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}
