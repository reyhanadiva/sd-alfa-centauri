// English version. Same shape as id.ts (typed as Content). Non-text fields (photo, icon, href) are inherited from id.
import { lokasi, site, spmb, waLink, ssc } from "@/lib/site";
import { id, type Content } from "./id";
import { jaringan as _j } from "./shared";

const wa = (text: string) => waLink(`Hello SD Alfa Centauri, ${text}`);
const waLabel = "Continue with admin (WhatsApp)";
const mix = <A extends object, B extends object>(a: readonly A[], b: readonly B[]) => a.map((x, i) => ({ ...x, ...b[i] }));

const faqItems = [
  { q: "Does SD Alfa Centauri accept children with special needs?", a: "Yes. As an inclusive school, we run a Learning Support Unit (LSU) supervised by psychologists, with individual support for academics and behavior, plus integrated therapy services." },
  { q: "Which curriculum do you use?", a: "The national curriculum (Kemendikbud), adapted to students' needs so every child can grow according to their talents and uniqueness." },
  { q: "How do children learn in class?", a: "Learning is student-centered and collaborative, makes use of technology, and is paired with good daily habits to instill our 7 student characters." },
  { q: "What extracurriculars are offered?", a: "Cinematography, marching band, music, Scouts, swimming, futsal, robotics, dance, and taekwondo." },
  { q: "When does SPMB (admissions) open and what are the requirements?", a: "The latest schedule and requirements are in the admissions (SPMB) section. Our admin team is happy to help via WhatsApp." },
  { q: "How much is tuition?", a: "Fees are shared by our admin team based on grade level and program. Please ask via WhatsApp." },
  { q: "Is there a tahfidz program?", a: "Yes. Students join the Tahfidz (Qur'an memorization) program with munaqosyah assessments, along with Dhuha prayer and congregational obligatory prayers." },
];
const pilar = ["Honest", "Clean & Tidy", "Independent", "Disciplined", "Resilient", "Polite & Courteous", "Useful to Others"];
const net = _j("Language Course for Da'wah and Ummah");

export const en: Content = {
  lang: "en",
  htmlLang: "en",
  ogLocale: "en_US",
  path: "/en",
  meta: {
    title: "SD Alfa Centauri Bandung | Inclusive Elementary School with Character",
    description:
      "SD Alfa Centauri, Bandung, Indonesia. Accredited A. Raising a generation that is Taqwa (devout), Cerdas (smart), and Kreatif (creative) through inclusive support, character education, and the integration of faith values with science and technology.",
    ogTitle: "SD Alfa Centauri Bandung",
    ogDescription: "To Be The Finest School In The World.",
  },

  nav: [
    { label: "About", href: "#tentang", children: [
      { label: "School Profile", href: "#tentang", desc: "History and vision" },
      { label: "7 Character Pillars", href: "#pilar", desc: "Values we nurture" },
      { label: "Accreditation", href: "#akreditasi", desc: "Accredited A" },
    ] },
    { label: "Programs", href: "#program", children: [
      { label: "Inclusive Support", href: "#inklusi", desc: "Learning Support Unit" },
      { label: "Gakko Tosho", href: "#program", desc: "Literacy culture" },
      { label: "Tahfidz", href: "#program", desc: "Qur'an memorization program" },
      { label: "Extracurriculars", href: "#ekskul", desc: "Activities students can join" },
    ] },
    { label: "For Parents", href: "#fasilitas", children: [
      { label: "Facilities", href: "#fasilitas", desc: "Classrooms and support" },
      { label: "FAQ", href: "#faq", desc: "Common questions" },
    ] },
    { label: "News", href: "#berita" },
    { label: "Admissions", href: "#spmb" },
  ],
  ui: {
    mainMenu: "Main menu", openMenu: "Open menu", closeMenu: "Close menu", mobileMenu: "Mobile menu",
    portal: "Portals", register: "Apply Now", registerOnline: "Apply Online",
    home: "SD Alfa Centauri, back to top", language: "Language",
  },
  portals: [
    { label: "Parent Portal", href: "#" },
    { label: "Teacher Portal", href: "#" },
  ],

  hero: {
    alt: "SD Alfa Centauri school building on Jalan Terate No. 10, Bandung",
    sub: "Raising children who are **Taqwa** (devout), **Cerdas** (smart), and **Kreatif** (creative).",
    register: "Apply Now",
    accredited: "Accredited by BAN-S/M",
  },
  cert: {
    open: "View certificate", title: "Accreditation Certificate A", aria: "Accreditation certificate", close: "Close",
    alt: "Accreditation A certificate from BAN-S/M for SD Alfa Centauri", label: "Accreditation certificate (BAN-S/M)",
    img: id.cert.img, info: "Accredited A (Excellent), score 95. Valid until 31 December 2028.",
  },
  about: {
    lead: "SD Alfa Centauri is committed to realizing the vision",
    quote: "To Be The Finest School In The World",
    tail: "through a mission of shaping a generation that is",
    link: "Taqwa, Cerdas, and Kreatif",
    founded: "Founded 12 July 2009",
    under: "Under the auspices of",
    foundation: "Taqwa Cerdas Kreatif Foundation",
    twinTitle: "The Alfa Centauri twin stars",
    twinText: "Two stars symbolize the balance of our goal: guiding children to succeed in **this world & the hereafter**.",
  },
  video: {
    title: "SD Alfa Centauri profile video", pause: "Pause video", play: "Play video",
    unmute: "Turn sound on", mute: "Turn sound off", soon: "Profile video coming soon",
  },

  why: {
    title: ["Why choose ", "SD Alfa Centauri?"],
    aria: "Reasons to choose us",
    acc: { title: "Accredited A", text: "A quality standard recognized by BAN-S/M." },
    prog: {
      title: "Integrated Flagship Programs", text: "Developing every student's potential, interests, and talents.",
      alt: "SD Alfa Centauri students reading a book outside the classroom", label: "Student activities",
      pills: ["Tahfidz & Munaqosyah", "FLS2N Coaching", "Reading Challenge", "Educational Fieldtrips", "Parents Day", "Contests & Olympiads"],
    },
    bimbel: { title: "Tutoring Partnership", text: `Extra learning hours with ${ssc.name}.`, more: "Learn more" },
    ask: { title: "How can we help?", cta: "Chat with admin", wa: wa("I would like to ask about admissions (SPMB).") },
    more: "+{n} more", close: "Close",
  },
  stats: {
    aria: "Alfa Centauri in numbers",
    labels: ["years serving education", "active students", "teachers and staff", "alumni"],
  },

  program: {
    title: ["Programs that grow ", "Taqwa, Cerdas, and Kreatif"],
    tabsAria: "Program domains",
    ranah: mix(id.program.ranah, [
      { key: "Taqwa", photoLabel: "Tahfidz and congregational prayer", tagline: "Faith that grows through habit.",
        items: mix(id.program.ranah[0].items, [
          { title: "Tahfidz & Munaqosyah", desc: "Memorizing the Qur'an, assessed through munaqosyah" },
          { title: "Dhuha Prayer", desc: "Practiced together at school" },
          { title: "Congregational prayers", desc: "Obligatory prayers performed together at school" },
        ]) },
      { key: "Cerdas", photoLabel: "Students learning and reading", tagline: "Numeracy, literacy, and technology.",
        items: mix(id.program.ranah[1].items, [
          { title: "Gakko Tosho", desc: "A culture of literacy" },
          { title: "Surala", desc: "Learning math through e-learning" },
          { title: "Reading Challenge", desc: "Regular reading challenges" },
          { title: "Project Based Learning", desc: "Learning through real projects" },
          { title: "FLS2N & Olympiad Coaching", desc: "Guidance toward contests and olympiads" },
        ]) },
      { key: "Kreatif", photoLabel: "Creativity Week or Expo", tagline: "Room to create and perform.",
        items: mix(id.program.ranah[2].items, [
          { title: "Reflection Week", desc: "Time to reflect on the learning journey" },
          { title: "Parents Day", desc: "A day for school and parents together" },
          { title: "Creativity Week", desc: "A week to create and express" },
          { title: "Expo", desc: "Showcasing student work" },
          { title: "Educational Fieldtrips", desc: "Learning hands-on outside the classroom" },
        ]) },
    ]),
    ekskul: {
      title: "Extracurriculars", sub: "Many activities to match your child's interests.", view: "View", viewLabel: "{x} view",
      grid: "Grid", photo: "Photo", see: "See photo: {x}", prev: "Previous", next: "Next",
      items: mix(id.program.ekskul.items, [
        { label: "Cinematography" }, { label: "Marching Band" }, { label: "Music" }, { label: "Scouts" }, { label: "Swimming" },
        { label: "Futsal" }, { label: "Robotics" }, { label: "Dance" }, { label: "Taekwondo" },
      ]),
    },
  },

  fasilitas: {
    title: ["Complete ", "facilities"],
    perKelasLabel: "In every classroom",
    perKelas: ["Projector", "Air conditioning", "CCTV", "24-hour internet"],
    listAria: "Facilities list",
    items: mix(id.fasilitas.items, [
      { title: "24-hour internet" }, { title: "Projector" }, { title: "Interactive TV" }, { title: "Air conditioning" },
      { title: "CCTV" }, { title: "Multimedia room" }, { title: "Prayer room (Mushola)" },
      { title: "Parent Portal", caption: "Follow your child's academic and character progress." },
    ]),
  },

  inklusi: {
    badge: "Learning Support Unit (LSU)",
    title: ["Inclusive Education ", "Program"],
    sub: "Every child learns in their own way.",
    points: mix(id.inklusi.points, [
      { title: "Professional Psychologist Supervision", desc: "Programs designed and monitored by experts." },
      { title: "Individual Support Program (PPI)", desc: "Academic and behavioral support for each child." },
      { title: "Integrated Therapy Services", desc: "Woven into everyday learning." },
    ]),
    activitiesLabel: "Support activities",
    activities: mix(id.inklusi.activities, [
      { label: "Bead Stringing" }, { label: "Yoga" }, { label: "Puzzles" }, { label: "Balance Training" }, { label: "Drawing" }, { label: "Buttoning" },
    ]),
  },

  prestasi: {
    title: ["Achievements to be ", "proud of"],
    totalLabel: "Total achievements", sinceText: "since {y}, from city to national level", aria: "Achievements by category",
    total: id.prestasi.total, since: id.prestasi.since,
    categories: [
      { name: "Academics", count: 40, items: [["1st place", "[Contest name], city level, 20XX"], ["2nd place", "[Olympiad name], provincial level, 20XX"]] },
      { name: "Sports", count: 30, items: [["1st place", "[Sport], city level, 20XX"], ["3rd place", "[Sport], provincial level, 20XX"]] },
      { name: "Arts & Creativity", count: 30, items: [["1st place", "[Arts contest], city level, 20XX"], ["Finalist", "[FLS2N], provincial level, 20XX"]] },
      { name: "Tahfidz", count: 20, items: [["2nd place", "[Tahfidz contest], city level, 20XX"], ["Passed", "Munaqosyah juz [X], 20XX"]] },
    ],
  },

  galeri: {
    title: ["Activity ", "gallery"], aria: "Activity gallery", zoom: "Enlarge: {x}",
    items: mix(id.galeri.items, [
      { title: "Reading Challenge", caption: "Students finish books together." },
      { title: "River Clean Up", caption: "Learning to care for the environment through real action." },
      { title: "Parents Day", caption: "A day of togetherness for school and parents." },
      { title: "Munaqosyah", caption: "Students' Qur'an memorization exams." },
      { title: "Fieldtrip", caption: "Learning hands-on outside the classroom." },
      { title: "Creativity Week", caption: "Children's work and ideas on show." },
      { title: "Expo", caption: "An exhibition of student learning." },
      { title: "Olympiad", caption: "Testing abilities through competition." },
      { title: "Character Habits", caption: "Becoming independent and tidy through daily habits." },
    ]),
  },

  testimoni: {
    title: ["What ", "parents say"], prev: "Previous", next: "Next", pick: "Choose a testimonial", item: "Testimonial {n}: {p}", photoAlt: "Photo of {x}", photoLabel: "parent",
    items: mix(id.testimoni.items, [
      { quote: "We confidently chose SD Alfa Centauri as our daughter's first step in growing up. It offers many of the things we hoped for: character building, comprehensive religious education, quality teachers, close communication between teachers and parents, manners and good habits that are also practiced at home, and consistently well-directed motivation. SD Alfa Centauri made us feel we have found the right partner for our daughter's education.", persona: "Homemaker", note: "Parent of a Grade 1 student" },
      { quote: "After researching schools, I fell in love with SD Alfa Centauri's mission: “Creating a safe and friendly school environment for all students, each with their own characteristics.” The school's experts, in this case the psychologists, and its teachers turned out to be people I know and whose work ethic I know well. That made me even more confident to collaborate with SD Alfa Centauri in educating my child.", persona: "Psychology academic, lecturer at UNJANI, Founder & BOC of sintesawellness.com", note: "Parent of a Grade 3 student" },
      { quote: "Enrolling our child at Alfa Centauri was the right decision. The character development based on religious values, along with the family-like atmosphere, gives a comfortable place to grow, both academically and personally. We also deeply appreciate the supportive approach of the teachers and staff in educating and accompanying the children day to day. This environment is what makes the school a second home for our daughter.", persona: "Cardiologist", note: "Parent of a Grade 2 student" },
      { quote: "Both of our children transferred in. The warm welcome from teachers, friends, and the rest of the school community makes them go to school every day full of enthusiasm. Besides showing good learning motivation and academic results, they also tend to bring peace and are willing to help friends who struggle with their studies.", persona: "Lecturer, Faculty of Mechanical and Aerospace Engineering (FTMD), ITB", note: "Parent of Grade 2, 5 & 6 students" },
    ]),
  },

  berita: {
    title: ["Latest ", "news"], sub: "Updates on activities, achievements, and announcements from the school.", all: "All news", featured: "Featured", aria: "Latest news", photoLabel: "News photo",
    items: mix(id.berita.items, [
      { cat: "Character", date: "Sep 2026", title: "Character Ambassadors for Cleanliness and Tidiness: This Simple Habit Matters at School", excerpt: "Keeping things clean and tidy may look simple in daily life, but the school practices and appreciates it." },
      { cat: "Character", date: "Sep 2026", title: "Discipline Character Ambassadors: Growing from Small Habits", excerpt: "Recognition for students who show disciplined character habits in their daily school life." },
      { cat: "Activities", date: "Sep 2026", title: "SD Alfa Centauri Holds a Benchmarking Visit to SD Muhammadiyah Sapen and SDIT LHI", excerpt: "Part of our continuing effort to improve the quality of our educational programs." },
      { cat: "Announcement", date: "5 Oct 2026", title: "SPMB 2026/2027 admissions are now open", excerpt: "Schedule, requirements, and how to apply can now be asked directly to our admin team." },
    ]),
  },

  faq: {
    title: ["Frequently ", "asked questions"],
    photoAlt: "SD Alfa Centauri students reading together", photoLabel: "Classroom atmosphere",
    noAnswer: "Didn't find your answer?", help: "Our admin team is happy to help via WhatsApp.", ask: "Ask admin on WhatsApp",
    askWa: wa("I would like to ask about: "),
    items: faqItems,
  },

  lokasi: {
    label: "Location", street: "Jl. Terate No. 10,", city: "Bandung City",
    phoneLabel: "School phone", phoneCta: "Call", waLabel: "Admin WhatsApp", waCta: "Chat",
    waText: wa("I would like to ask about admissions (SPMB)."), directions: "Get directions", mapTitle: "SD Alfa Centauri location map",
  },

  closing: {
    title: ["Ready to grow with ", "Alfa Centauri?"],
    text: "Ask about the schedule, requirements, and how to apply. Our admin team is happy to help via WhatsApp.",
    register: "Apply Now", registerWa: wa(`I would like to apply for SPMB ${spmb.academicYear}.`),
    ask: "Ask admin", askWa: wa("I would like to ask a question."),
    brosur: "Download brochure",
    about: "An inclusive elementary school in Bandung, accredited A.",
    explore: "Explore", visit: "Visit us", network: "Education network",
    explorer: [["About", "#tentang"], ["Programs", "#program"], ["Facilities", "#fasilitas"], ["News", "#berita"], ["FAQ", "#faq"], ["Location", "#lokasi"]],
    wa: "(WhatsApp)", rights: "All rights reserved.",
    jaringan: net,
  },

  assistant: {
    name: "SD Alfa Centauri Assistant",
    tagline: "We're here to answer your questions",
    bubble: "Hi! How can we help?",
    bubbleClose: "Dismiss greeting",
    fab: "Open the assistant, we can help answer",
    fabClose: "Close assistant",
    close: "Close", dialog: "SD Alfa Centauri assistant",
    greeting: "Hi! We're happy to help. Pick a topic below or type your question.",
    placeholder: "Type your question…", question: "Question", send: "Send", typing: "Typing",
    fallback: "Sorry, we don't have an answer for that yet. Pick a topic below, or ask our admin team directly.",
    waLabel,
    waAsk: (q: string) => wa(`I would like to ask: ${q}`),
    kb: [
      { chip: "How to apply", keys: ["apply", "admission", "admissions", "enroll", "enrol", "register", "registration", "spmb", "requirement", "requirements", "join"], text: faqItems[4].a, links: [{ label: waLabel, href: wa("I would like to ask: how and when to apply for SPMB") }] },
      { chip: "Tuition", keys: ["fee", "fees", "tuition", "cost", "price", "pay", "payment", "spp", "free", "how much"], text: faqItems[5].a, links: [{ label: waLabel, href: wa("I would like to ask: tuition fees") }] },
      { chip: "Special needs", keys: ["special need", "special needs", "inclusive", "inclusion", "lsu", "psychologist", "therapy", "autism", "autistic", "adhd", "dyslexia", "disability"], text: faqItems[0].a },
      { chip: "Extracurriculars", keys: ["extracurricular", "extracurriculars", "club", "clubs", "futsal", "swimming", "scout", "scouts", "robotics", "music", "marching", "taekwondo", "dance", "cinematography", "sports"], text: faqItems[3].a },
      { chip: "Founded", keys: ["founded", "established", "history", "when was", "since when", "how old", "opened"], text: "SD Alfa Centauri was founded on 12 July 2009." },
      { keys: ["accreditation", "accredited", "certificate", "ban "], text: "SD Alfa Centauri is accredited A by BAN-S/M." },
      { keys: ["motto", "vision", "slogan", "tagline", "finest"], text: `Our motto: "${site.tagline}".` },
      { keys: ["character", "pillar", "pillars", "values", "manners"], text: `We nurture 7 student characters: ${pilar.join(", ")}.` },
      { keys: ["curriculum", "subjects"], text: faqItems[1].a },
      { keys: ["teaching", "method", "learning style", "how do children learn", "student centered"], text: faqItems[2].a },
      { keys: ["tahfidz", "quran", "qur'an", "memorize", "memorization", "munaqosyah", "dhuha", "prayer", "pray"], text: faqItems[6].a },
      { keys: ["gakko", "tosho", "surala", "literacy", "reading", "math", "maths", "mathematics"], text: "We have the Gakko Tosho literacy culture, Surala for learning math through e-learning, and the Reading Challenge." },
      { keys: ["tutoring", "ssc", "sony", "grade 5", "extra lessons", "extra class"], text: "Grade 5 tutoring is available with Sony Sugema College (SSC)." },
      { keys: ["portal", "report card", "progress", "grades"], text: "The Parent Portal lets parents follow their child's academic and character progress." },
      { chip: "Facilities", keys: ["facility", "facilities", "cctv", "projector", "internet", "wifi", "prayer room", "mushola", "multimedia", "classroom", "interactive tv"], text: "Every classroom has a projector, air conditioning, CCTV, and 24-hour internet. We also have interactive TVs, a multimedia room, a prayer room, and the Parent Portal." },
      { chip: "Location", keys: ["location", "address", "where", "maps", "map", "directions", "find you"], text: `${site.name} is at ${site.address}.`, links: [{ label: "Open in Google Maps", href: lokasi.mapLink }] },
      { keys: ["phone", "call", "contact", "number", "email", "whatsapp"], text: `School phone ${site.phone}, WhatsApp ${site.whatsappDisplay}, email ${site.email}.`, links: [{ label: "Chat on WhatsApp", href: waLink("Hello SD Alfa Centauri, I would like to ask a question.") }, { label: "Call", href: site.phoneHref }] },
      { keys: ["instagram", "social media", "socials"], text: `Follow us on Instagram ${site.instagramHandle}.`, links: [{ label: "Open Instagram", href: site.instagram }] },
      { keys: ["junior high", "high school", "kindergarten", "smp", "sma", "tk ", "foundation", "yayasan", "english now", "lcdu", "other schools"], text: "Alfa Centauri also runs a kindergarten, junior high, and senior high school. The full list is at the bottom of this page.", links: net.slice(1, 4).map((j) => ({ label: j.label, href: j.href })) },
      { chip: "Brochure", keys: ["brochure", "brosur", "download", "school profile", "pdf"], text: "The school brochure can be downloaded here.", links: [{ label: "Download brochure", href: site.brosur.en }] },
    ],
  },
};
