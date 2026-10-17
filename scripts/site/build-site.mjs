// Builds the public website in site/ (published as is by Cloudflare Pages): landing page in Spanish (/) and
// English (/en/), Catalan (/ca/) and the bilingual privacy policy (/privacy/).
import { mkdir, readFile, writeFile, copyFile, cp } from 'node:fs/promises';
import { join } from 'node:path';
import {fileURLToPath} from 'node:url';

import {COPY} from './site-copy.mjs';
import {releaseDialog} from './release-history.mjs';
const OUT = 'site';
const SHOT_SOURCE='docs/quality-review/captures/website/2026-10-17-beta16-final-03';
const SHOTS = ['01-today','02-routine','03-repertoire','04-quick-practice','05-quick-result','06-progress','07-multimedia','08-time-details','09-calendar'];
const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  read: icon('<path d="M3 6h18M3 10h18M3 14h18M3 18h18"/><circle cx="9" cy="10" r="2" fill="currentColor"/><circle cx="15" cy="14" r="2" fill="currentColor"/>'),
  hands: icon('<path d="M8 13V5a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v9c0 4-2.5 6-6 6s-5-1.5-7-5l-1.5-3a1.5 1.5 0 0 1 2.6-1.5L8 13"/>'),
  midi: icon('<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M7 6v8M12 6v8M17 6v8"/>'),
  level: icon('<path d="M4 20V14M10 20V9M16 20V4M2 20h20"/>'),
  plan: icon('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M8 14h3"/>'),
  media: icon('<rect x="3" y="5" width="14" height="14" rx="2"/><path d="m17 9 5-3v12l-5-3"/><circle cx="10" cy="12" r="3"/>'),
  score: icon('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>'),
  game: icon('<path d="m12 3 3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1z"/>'),
  metronome: icon('<path d="m9 3-5 18h16L15 3zM12 17l5-9M8 14h8"/>'),
  lock: icon('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
};

const TEST_DOWNLOAD_COPY=Object.fromEntries(Object.entries(COPY).map(([lang,copy])=>[lang,copy.testDownload]));

function downloads(t){
 const c={en:['Stable · 6.0.0 (53)','Google Play · 5.2.3 (35)','Beta · 6.1.0-beta.17 (70)','Android beta APK','iOS Simulator for Mac · beta 9','Allow audio/video copies over mobile data from Backup & sync, independently of score downloads. New videos place the framed title and date further above the bottom edge. Includes the recording and synchronization improvements from beta16.','The iOS download runs in Xcode Simulator on a Mac. An iPhone/iPad installation and TestFlight are not available yet: Apple Developer signing is required. I don’t own an iPhone, and the Apple Developer membership costs about $100 a year. I don’t currently have a reason to pay for it. If you’re interested in an iOS release, please let me know at <a href="mailto:support@spinoapp.com">support@spinoapp.com</a>.'],es:['Estable · 6.0.0 (53)','Google Play · 5.2.3 (35)','Beta · 6.1.0-beta.17 (70)','APK beta de Android','Simulador iOS para Mac · beta 9','Permite copiar audio y vídeo con datos móviles desde Copia y sincronización, sin cambiar las descargas de partituras. Los nuevos vídeos sitúan el título y la fecha más arriba. Incluye las mejoras de grabación y sincronización de beta16.','La descarga de iOS funciona en el simulador de Xcode en Mac. Todavía no se puede instalar en iPhone/iPad ni en TestFlight: hace falta la firma de Apple Developer. No tengo un iPhone y la cuenta de Apple Developer cuesta unos 100 dólares al año. De momento no tengo un motivo para pagarla. Si te interesa una versión para iOS, escríbeme a <a href="mailto:support@spinoapp.com">support@spinoapp.com</a>.'],ca:['Estable · 6.0.0 (53)','Google Play · 5.2.3 (35)','Beta · 6.1.0-beta.17 (70)','APK beta d’Android','Simulador iOS per a Mac · beta 9','Permet copiar àudio i vídeo amb dades mòbils des de Còpia i sincronització, sense canviar les baixades de partitures. Els nous vídeos situen el títol i la data més amunt. Inclou les millores de gravació i sincronització de beta16.','La descàrrega d’iOS funciona al simulador de Xcode en Mac. Encara no es pot instal·lar en iPhone/iPad ni en TestFlight: cal la signatura d’Apple Developer. No tinc un iPhone i el compte d’Apple Developer costa uns 100 dòlars l’any. De moment no tinc cap motiu per pagar-lo. Si t’interessa una versió per a iOS, escriu-me a <a href="mailto:support@spinoapp.com">support@spinoapp.com</a>.']}[t.lang];
 const stable = {en:['Android stable APK','Local practice when sync is unavailable, connection recovery and consistent screen headers.'],es:['APK estable de Android','Práctica en local si falla la sincronización, recuperación de la conexión y cabeceras uniformes entre pantallas.'],ca:['APK estable d’Android','Pràctica en local si falla la sincronització, recuperació de la connexió i capçaleres uniformes entre pantalles.']}[t.lang];
 return `<div id="downloads"><article class="feature" data-channel="stable"><h3>${c[0]}</h3><p>${stable[1]}</p><p><a class="cta" href="${t.root}downloads/spino-6.0.0-53-android.apk" download>${stable[0]}</a></p><p><a href="${t.root}downloads/spino-6.0.0-checksums.json">SHA-256</a></p><a href="https://play.google.com/store/apps/details?id=com.miguecoll.spino">${c[1]}</a></article><article class="feature" data-channel="beta" style="margin-top:16px"><h3>${c[2]}</h3><p>${c[5]}</p><p><button type="button" class="release-open" data-release-open>${({en:'Release notes',es:'Notas de versión',ca:'Notes de versió'})[t.lang]}</button></p><p><a class="cta" href="${t.root}downloads/spino-6.1.0-beta.17-70-android.apk" download>${c[3]}</a></p><a href="${t.root}downloads/spino-6.0.0-beta.9-48-ios-simulator.zip" download>${c[4]}</a><p class="cta-note">${c[6]}</p><a href="${t.root}downloads/spino-6.1.0-beta.17-checksums.json">SHA-256</a><p><a href="https://github.com/cuoyot/spino/tree/v6.1.0-beta.17">${({en:'Source code',es:'Código fuente',ca:'Codi font'})[t.lang]}</a></p></article></div>`;
}

function languagePicker(lang,root){const names={"es":"Español","en":"English","ca":"Català"};return `<details class="language-picker"><summary aria-label="${names[lang]} — ${lang==='ca'?'Canvia l’idioma':lang==='es'?'Cambiar idioma':'Change language'}" title="${names[lang]}"><span class="flag flag-${lang}" aria-hidden="true"></span></summary><div class="language-options">${['es','en','ca'].filter(l=>l!==lang).map(l=>`<a href="${root}${l==='es'?'':l+'/'}" lang="${l}" hreflang="${l}"><span class="flag flag-${l}" aria-hidden="true"></span>${names[l]}</a>`).join('')}</div></details>`; }
const STYLE = `.language-picker{position:relative;z-index:5}.language-picker summary{list-style:none;cursor:pointer;border:1px solid #615b72;border-radius:10px;padding:10px;display:flex;align-items:center;background:#29263a}.language-picker summary::-webkit-details-marker{display:none}.language-picker summary:focus-visible,.language-picker a:focus-visible{outline:3px solid #ffdf69;outline-offset:3px}.language-options{position:absolute;right:0;top:100%;margin-top:8px;min-width:160px;background:#29263a;border:1px solid #615b72;border-radius:12px;padding:5px;box-shadow:0 8px 24px #0005}.language-options a{display:flex;align-items:center;gap:10px;color:#fff5ee;text-decoration:none;padding:10px;border-radius:7px;white-space:nowrap}.language-options a:hover{background:#454057}.flag{display:inline-block;width:30px;height:21px;border-radius:3px;box-shadow:0 0 0 1px #ffffff40;flex-shrink:0}.flag-es{background:linear-gradient(#b72730 25%,#ffd451 25% 75%,#b72730 75%)}.flag-ca{background:repeating-linear-gradient(to bottom,#f5ce43 0 11.11%,#c9353d 11.11% 22.22%)}.flag-en{background:linear-gradient(90deg,transparent 41%,#c83041 41% 59%,transparent 59%),linear-gradient(transparent 35%,#c83041 35% 65%,transparent 65%),linear-gradient(90deg,transparent 32%,#fff 32% 68%,transparent 68%),linear-gradient(transparent 25%,#fff 25% 75%,transparent 75%),linear-gradient(33deg,transparent 43%,#fff 43% 48%,#c83041 48% 52%,#fff 52% 57%,transparent 57%),linear-gradient(-33deg,transparent 43%,#fff 43% 48%,#c83041 48% 52%,#fff 52% 57%,transparent 57%),#253d88}:root{--bg:#14161a;--panel:#1d2027;--line:#2c313a;--text:#e8eaed;--muted:#a3abb7;--accent:#4f8cff}
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
.release-open,.release-dialog button{font:inherit;min-height:44px;cursor:pointer;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--text);padding:8px 14px}.release-open{color:var(--accent)}.release-dialog{width:min(850px,calc(100% - 24px));max-height:85dvh;padding:0;border:1px solid var(--line);border-radius:20px;background:var(--panel);color:var(--text);overflow:hidden}.release-dialog[open]{display:flex;flex-direction:column}.release-dialog::backdrop{background:#000a}.release-dialog header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 20px;border-bottom:1px solid var(--line);flex:none}.release-dialog h2{font-size:22px;margin:0}.release-dialog header button{min-width:44px;font-size:26px;padding:0;flex:none}.release-body{overflow-y:auto;overscroll-behavior:contain;min-height:0;padding:0 20px 20px}.release-body>p{color:var(--muted)}.release-dialog details{border-bottom:1px solid var(--line);padding:12px 0}.release-dialog summary{cursor:pointer;min-height:44px;align-content:center;font-weight:650}.release-dialog p,.release-dialog li{overflow-wrap:anywhere}.release-dialog code{font-size:.9em}.release-open:focus-visible,.release-dialog :focus-visible{outline:3px solid var(--accent);outline-offset:3px}
@media (max-width:760px){.hero{grid-template-columns:1fr;padding-top:16px}.hero .phone{width:min(260px,72vw)}.privacy{grid-template-columns:1fr}}`;

function page(t) {
  const shot = (name, i) => `<img src="${t.root}img/${t.lang}/${name}.png?v=2026-10-17-beta16-final-03" alt="${t.shotAlt[i]}" width="1080" height="1920" loading="lazy">`;
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
${["es","en","ca"].map(lang=>`<link rel="alternate" hreflang="${lang}" href="${t.root}${lang==='es'?'':lang+'/'}">`).join('')}
<style>${STYLE}</style>
</head>
<body>
<div class="wrap">
<header class="top"><a class="brand" href="./"><img src="${t.root}img/icon.png" alt="" width="36" height="36">SPino</a>${languagePicker(t.lang,t.root)}</header>
<main>
<section class="hero">
<div><h1>SPino<br><span>${t.tagline}</span></h1><p class="lead">${t.lead}</p>
${downloads(t)}</div>
<img class="phone" src="${t.root}img/${t.lang}/01-today.png?v=2026-10-17-beta16-final-03" alt="${t.shotAlt[0]}" width="1080" height="1920">
</section>
<section id="features"><h2>${t.featuresTitle}</h2><div class="features">${t.features.map(([k, h, p]) => `<article class="feature">${ICONS[k]}<h3>${h}</h3><p>${p}</p></article>`).join('')}</div></section>
<section><h2>${t.shotsTitle}</h2><p class="shots-note">${t.shotsNote}</p><div class="shots">${SHOTS.map(shot).join('')}</div>
<img class="wide" src="${t.root}img/${t.lang}/wide-reading.png?v=2026-10-17-beta16-final-03" alt="${t.wideAlt}" width="2560" height="1600" loading="lazy">
<figure style="margin:24px 0 0"><img class="wide" src="${t.root}img/${t.lang}/landscape-reading.png?v=2026-10-17-beta16-final-03" alt="${t.landscapeAlt}" width="844" height="390" loading="lazy"><figcaption>${t.landscapeAlt}</figcaption></figure></section>
<section><div class="privacy">${ICONS.lock}<div><h2>${t.privacyTitle}</h2><p>${t.privacy}</p><a href="${t.root}privacy/">${t.privacyLink}</a></div></div></section>
<section id="arcade"><div class="feature"><h2>Spino Arcade · ${t.lang==='ca'?'Laboratori de joc':t.lang==='en'?'Play lab':'Laboratorio de juego'}</h2><p>${t.lang==='ca'?'Un joc musical nascut de Spino: Smart Piano Notebook. Llegeix notes en moviment, segueix el ritme i encadena ratxes, amb instruments amb mostres i progressió gradual.':t.lang==='en'?'A musical game born from Spino: Smart Piano Notebook. Read moving notes, keep the rhythm and build streaks, with sampled instruments and gentle progression.':'Un juego musical nacido de Spino: Smart Piano Notebook. Lee notas en movimiento, sigue el ritmo y encadena rachas, con instrumentos con muestras y progresión gradual.'}</p><p><a href="${t.root+'arcade/'+(t.lang==='es'?'':t.lang+'/')}">${t.lang==='ca'?'Descobreix Spino Arcade 1.0':t.lang==='en'?'Discover Spino Arcade 1.0':'Descubre Spino Arcade 1.0'} →</a></p></div></section></main>
<footer><span>© ${new Date().getFullYear()} ${t.footer}</span><span><a href="${t.root}privacy/">${t.privacyLink}</a></span></footer>
</div>
${releaseDialog(t.lang)}
</body>
</html>
`;
}

export {page,COPY};
if(process.argv[1]===fileURLToPath(import.meta.url)){
// Refresh generated pages without deleting unrelated files in the site directory.
for (const t of Object.values(COPY)) {
  const dir = t.lang === 'es' ? OUT : join(OUT, t.lang);
  await mkdir(join(OUT, 'img', t.lang), { recursive: true }); await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), page(t));
  for (const name of SHOTS) await copyFile(`${SHOT_SOURCE}/${t.lang}/phone/${name}.png`, join(OUT, 'img', t.lang, `${name}.png`));
  await copyFile(`${SHOT_SOURCE}/${t.lang}/tablet/wide-reading.png`, join(OUT, 'img', t.lang, 'wide-reading.png'));
  await copyFile(`${SHOT_SOURCE}/${t.lang}/phone-landscape/landscape-reading.png`, join(OUT, 'img', t.lang, 'landscape-reading.png'));
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
await writeFile(join(OUT, '_headers'), (await readFile(join(OUT, '_headers'), 'utf8')) + "\n/downloads/*.apk\n  Content-Type: application/vnd.android.package-archive\n  Content-Disposition: attachment\n  Cache-Control: public, max-age=300\n");
await writeFile(join(OUT, '404.html'), `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>SPino</title><body style="margin:0;background:#14161a;color:#e8eaed;font:17px/1.6 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center"><div><p>Página no encontrada · Page not found</p><p><a style="color:#4f8cff" href="/">SPino</a></p></div></body></html>\n`);
await writeFile(join(OUT, '_headers'), (await readFile(join(OUT, '_headers'), 'utf8')) + "\n/downloads/*.zip\n  Content-Type: application/zip\n  Content-Disposition: attachment\n  Cache-Control: public, max-age=300\n");
await cp('scripts/site/downloads' , join(OUT, 'downloads'), { recursive: true });
await cp('scripts/site/arcade', join(OUT, 'arcade'), { recursive: true });
console.log('site/ built');

}
