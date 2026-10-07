// Builds the public website in site/ (published as is by Cloudflare Pages): landing page in Spanish (/) and
// English (/en/), and the bilingual privacy policy (/privacy/). Usage: node scripts/site/build-site.mjs
import { mkdir, readFile, writeFile, copyFile, rm, cp } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'site';
const SHOTS = ['01-today', '02-warmup-session', '03-warmup-guide', '06-reading-keyboard', '07-calendar'];
const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  read: icon('<path d="M3 6h18M3 10h18M3 14h18M3 18h18"/><circle cx="9" cy="10" r="2" fill="currentColor"/><circle cx="15" cy="14" r="2" fill="currentColor"/>'),
  hands: icon('<path d="M8 13V5a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v9c0 4-2.5 6-6 6s-5-1.5-7-5l-1.5-3a1.5 1.5 0 0 1 2.6-1.5L8 13"/>'),
  midi: icon('<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M7 6v8M12 6v8M17 6v8"/>'),
  level: icon('<path d="M4 20V14M10 20V9M16 20V4M2 20h20"/>'),
  plan: icon('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M8 14h3"/>'),
  score: icon('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>'),
  lock: icon('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
};

const COPY = {
  es: {
    lang: 'es', other: 'en', otherLabel: 'English', root: './', title: 'SPino: cuaderno de piano',
    description: 'Lectura a primera vista, calentamiento Hanon y plan de estudio de piano, con teclado MIDI, piano acústico o solo el móvil.',
    tagline: 'Tu cuaderno de piano', lead: 'Planifica qué vas a estudiar, practica con ejercicios que se adaptan a tu nivel y guarda cómo te ha ido cada día. Con un teclado MIDI, con tu piano o, cuando viajas, solo con el móvil.',
    cta: 'Próximamente en Google Play', ctaNote: 'Android · gratis · sin anuncios',
    featuresTitle: 'Todo lo que necesitas para practicar',
    features: [
      ['read', 'Lectura a primera vista sin fin', 'Ejercicios nuevos cada vez en la escala que elijas, a una o dos manos. A dos manos, el bajo mantiene un patrón y la melodía cae en notas del acorde.'],
      ['hands', 'Calentamiento Hanon', 'Cada sesión con piano empieza con un ejercicio de El pianista virtuoso, con una guía visual de las manos y una demostración animada.'],
      ['midi', 'Con teclado MIDI', 'Conéctalo por USB o Bluetooth: SPino comprueba cada nota, también los acordes. Usa los pedales para pasar página.'],
      ['level', 'A tu nivel', 'Elige tu nivel de pianista y cada práctica ajusta el ritmo y el registro. La mano izquierda avanza a su propio paso.'],
      ['plan', 'Planifica y repasa', 'Hoy, calendario semanal, rutinas, recordatorios e historial con notas y valoración de cada sesión.'],
      ['score', 'Tus partituras', 'Biblioteca de dominio público, tus PDF con anotaciones y lectura por partes en apaisado.'],
    ],
    shotsTitle: 'Así es SPino', shotAlt: ['Pantalla Hoy con la semana y la próxima práctica', 'Bloque de calentamiento con las manos sobre el teclado', 'Guía visual del ejercicio Hanon', 'Lectura con teclado en pantalla', 'Calendario semanal'],
    wideAlt: 'Lectura a dos manos en una tablet',
    privacyTitle: 'Privado por diseño', privacy: 'Sin cuentas, sin anuncios y sin servidores propios: tu cuaderno se guarda en tu dispositivo. Si quieres, haz una copia en el archivo que elijas, por ejemplo en Google Drive.',
    privacyLink: 'Política de privacidad', footer: 'SPino · Smart Piano Notebook', contact: 'Contacto',
  },
  en: {
    lang: 'en', other: 'es', otherLabel: 'Español', root: '../', title: 'SPino: Smart Piano Notebook',
    description: 'Piano sight-reading, Hanon warm-ups and practice planning, with a MIDI keyboard, an acoustic piano or just your phone.',
    tagline: 'Your piano notebook', lead: 'Plan what to practise, play exercises that adapt to your level and keep a record of every session. With a MIDI keyboard, with your piano or, when you travel, with just your phone.',
    cta: 'Coming soon to Google Play', ctaNote: 'Android · free · no ads',
    featuresTitle: 'Everything you need to practise',
    features: [
      ['read', 'Endless sight-reading', 'Fresh exercises every time in the scale you choose, one hand or both. With both hands, the bass keeps a pattern and the melody lands on chord tones.'],
      ['hands', 'Hanon warm-up', 'Every piano session opens with an exercise from The Virtuoso Pianist, with a visual hand guide and an animated demo.'],
      ['midi', 'With a MIDI keyboard', 'Connect by USB or Bluetooth: SPino checks every note, chords included. Turn pages with your pedals.'],
      ['level', 'At your level', 'Choose your pianist level and each practice sets its rhythm and range. The left hand progresses at its own pace.'],
      ['plan', 'Plan and look back', 'Today, a weekly calendar, routines, reminders and a history with notes and a rating for each session.'],
      ['score', 'Your scores', 'A public-domain library, your own annotated PDFs and part-by-part reading in landscape.'],
    ],
    shotsTitle: 'See SPino', shotAlt: ['Today screen with the week and the next practice', 'Warm-up block with both hands on the keyboard', 'Visual guide for the Hanon exercise', 'Reading with the on-screen keyboard', 'Weekly calendar'],
    wideAlt: 'Two-hand reading on a tablet',
    privacyTitle: 'Private by design', privacy: 'No accounts, no ads and no servers of our own: your notebook stays on your device. If you want, back it up to a file you choose, for example in Google Drive.',
    privacyLink: 'Privacy policy', footer: 'SPino · Smart Piano Notebook', contact: 'Contact',
  },
};

const STYLE = `:root{--bg:#14161a;--panel:#1d2027;--line:#2c313a;--text:#e8eaed;--muted:#a3abb7;--accent:#4f8cff}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--bg);color:var(--text);font:17px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--accent)}img{max-width:100%;height:auto;display:block}
.wrap{max-width:1080px;margin:0 auto;padding:0 16px}
header.top{display:flex;align-items:center;justify-content:space-between;padding:18px 0}
.brand{display:flex;align-items:center;gap:10px;color:var(--text);text-decoration:none;font-weight:700;font-size:20px}.brand img{width:36px;height:36px}
.lang{color:var(--muted);text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:6px 14px;font-size:14px}
.hero{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center;padding:40px 0 56px}
.hero h1{font-size:clamp(36px,6vw,58px);line-height:1.05;margin:0 0 16px;letter-spacing:-.02em}
.hero h1 span{color:var(--accent)}.hero p.lead{color:var(--muted);font-size:19px;margin:0 0 28px}
.cta{display:inline-flex;align-items:center;gap:10px;background:var(--accent);color:#fff;text-decoration:none;font-weight:650;border-radius:14px;padding:14px 22px}
.cta-note{display:block;color:var(--muted);font-size:14px;margin-top:10px}
.hero .phone{justify-self:center;width:min(300px,80vw);border-radius:28px;border:6px solid #2a2e36;box-shadow:0 30px 60px rgba(0,0,0,.45)}
h2{font-size:clamp(26px,4vw,36px);margin:0 0 24px;letter-spacing:-.01em}
section{padding:48px 0}
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
.feature{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:22px}
.feature svg{width:30px;height:30px;color:var(--accent)}.feature h3{margin:12px 0 6px;font-size:19px}.feature p{margin:0;color:var(--muted);font-size:16px}
.shots{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:12px}
.shots img{flex:0 0 auto;width:min(240px,62vw);border-radius:20px;border:1px solid var(--line);scroll-snap-align:start}
.wide{margin-top:24px;border-radius:18px;border:1px solid var(--line)}
.privacy{background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:28px;display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:start}
.privacy svg{width:40px;height:40px;color:var(--accent)}.privacy h2{margin:0 0 8px}.privacy p{margin:0 0 12px;color:var(--muted)}
footer{border-top:1px solid var(--line);margin-top:24px;padding:28px 0 40px;color:var(--muted);font-size:14px;display:flex;flex-wrap:wrap;gap:16px;justify-content:space-between}
footer a{color:var(--muted)}
@media (max-width:760px){.hero{grid-template-columns:1fr;padding-top:16px}.hero .phone{width:min(260px,72vw)}.privacy{grid-template-columns:1fr}}`;

function page(t) {
  const shot = (name, i) => `<img src="${t.root}img/${t.lang}/${name}.png" alt="${t.shotAlt[i]}" width="1080" height="1920" loading="lazy">`;
  return `<!doctype html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t.title}</title>
<meta name="description" content="${t.description}">
<meta property="og:title" content="${t.title}">
<meta property="og:description" content="${t.description}">
<meta property="og:image" content="${t.root}img/feature.png">
<link rel="icon" href="${t.root}img/icon.png">
<link rel="apple-touch-icon" href="${t.root}img/icon.png">
<link rel="alternate" hreflang="es" href="${t.lang === 'es' ? './' : '../'}">
<link rel="alternate" hreflang="en" href="${t.lang === 'es' ? 'en/' : './'}">
<style>${STYLE}</style>
</head>
<body>
<div class="wrap">
<header class="top"><a class="brand" href="./"><img src="${t.root}img/icon.png" alt="" width="36" height="36">SPino</a><a class="lang" href="${t.lang === 'es' ? 'en/' : '../'}" hreflang="${t.other}" lang="${t.other}">${t.otherLabel}</a></header>
<main>
<section class="hero">
<div><h1>SPino<br><span>${t.tagline}</span></h1><p class="lead">${t.lead}</p>
<a class="cta" href="#features">${icon('<path d="M5 3l14 9-14 9z" fill="currentColor"/>').replace('<svg', '<svg width="18" height="18"')} ${t.cta}</a><span class="cta-note">${t.ctaNote}</span></div>
<img class="phone" src="${t.root}img/${t.lang}/02-warmup-session.png" alt="${t.shotAlt[1]}" width="1080" height="1920">
</section>
<section id="features"><h2>${t.featuresTitle}</h2><div class="features">${t.features.map(([k, h, p]) => `<article class="feature">${ICONS[k]}<h3>${h}</h3><p>${p}</p></article>`).join('')}</div></section>
<section><h2>${t.shotsTitle}</h2><div class="shots">${SHOTS.map(shot).join('')}</div>
<img class="wide" src="${t.root}img/${t.lang}/wide-reading.png" alt="${t.wideAlt}" width="2560" height="1600" loading="lazy"></section>
<section><div class="privacy">${ICONS.lock}<div><h2>${t.privacyTitle}</h2><p>${t.privacy}</p><a href="${t.root}privacy/">${t.privacyLink}</a></div></div></section>
<section id="arcade"><div class="feature"><h2>Spino Arcade · ${t.lang==='en'?'Play lab':'Laboratorio de juego'}</h2><p>${t.lang==='en'?'A musical game born from Spino: Smart Piano Notebook. Read moving notes, keep the rhythm and build streaks, with sampled instruments and gentle progression.':'Un juego musical nacido de Spino: Smart Piano Notebook. Lee notas en movimiento, sigue el ritmo y encadena rachas, con instrumentos con muestras y progresión gradual.'}</p><p><a href="${t.lang==='en'?'../arcade/en/':'./arcade/'}">${t.lang==='en'?'Discover Spino Arcade 0.9':'Descubre Spino Arcade 0.9'} →</a></p></div></section></main>
<footer><span>© ${new Date().getFullYear()} ${t.footer}</span><span><a href="${t.root}privacy/">${t.privacyLink}</a></span></footer>
</div>
</body>
</html>
`;
}

await rm(OUT, { recursive: true, force: true });
for (const t of Object.values(COPY)) {
  const dir = t.lang === 'es' ? OUT : join(OUT, 'en');
  await mkdir(join(OUT, 'img', t.lang), { recursive: true }); await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), page(t));
  for (const name of SHOTS) await copyFile(`docs/play-store/screenshots/${t.lang}/phone/${name}.png`, join(OUT, 'img', t.lang, `${name}.png`));
  await copyFile(`docs/play-store/screenshots/${t.lang}/tablet-10/05-reading-two-hands.png`, join(OUT, 'img', t.lang, 'wide-reading.png'));
}
await copyFile('assets/brand/spino-symbol-512.png', join(OUT, 'img', 'icon.png'));
await copyFile('assets/brand/play-store-feature-1024x500.png', join(OUT, 'img', 'feature.png'));
// The privacy policy is the reviewed Play Store page, with a way back to the home page.
const policy = (await readFile('docs/play-store/privacy-policy.html', 'utf8'))
  .replace('<main>', '<main>\n<p><a href="../">← SPino</a></p>')
  .replace('<head>', '<head>\n<link rel="icon" href="../img/icon.png">');
await mkdir(join(OUT, 'privacy'), { recursive: true });
await writeFile(join(OUT, 'privacy', 'index.html'), policy);
await writeFile(join(OUT, '_headers'), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
/img/*
  Cache-Control: public, max-age=604800
`);
await writeFile(join(OUT, '404.html'), `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>SPino</title><body style="margin:0;background:#14161a;color:#e8eaed;font:17px/1.6 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center"><div><p>Página no encontrada · Page not found</p><p><a style="color:#4f8cff" href="/">SPino</a></p></div></body></html>\n`);
await cp('scripts/site/arcade', join(OUT, 'arcade'), { recursive: true });
console.log('site/ built');
