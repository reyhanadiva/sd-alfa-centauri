// Tautan jaringan unit pendidikan; hanya label LCDU yang diterjemahkan.
export const jaringan = (lcdu: string) => [
  { label: "Yayasan Alfa Centauri", href: "https://alfacentauri.sch.id/yayasan/" },
  { label: "TK Alfa Centauri", href: "https://alfacentauri.sch.id/tk/" },
  { label: "SMP Alfa Centauri", href: "https://smpalfacentauri.sch.id/" },
  { label: "SMA Alfa Centauri", href: "https://smaalfacentauri.sch.id/" },
  { label: "English Now", href: "http://englishnow.co.id/" },
  { label: lcdu ? `LCDU (${lcdu})` : "LCDU", href: "https://lcdu.org/" },
];
