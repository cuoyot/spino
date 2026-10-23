import {extraCopy} from '../../src/companion/locale-extra.js';
// Builds the public website in site/ (served by the Cloudflare Worker): landing page in Spanish (/) and
// English (/en/), Catalan (/ca/) and the bilingual privacy policy (/privacy/).
import { mkdir, readFile, writeFile, copyFile, cp } from 'node:fs/promises';
import { join } from 'node:path';
import {fileURLToPath} from 'node:url';

import {COPY} from './site-copy.mjs';
import {catalogueSection} from './catalogue-section.mjs';
import {releaseDialog} from './release-history.mjs';
import {metadata, structuredData, faqSection, localizedPath, enhanceStaticPage, sitemap, ROBOTS, STABLE_RELEASE} from './seo.mjs';
const OUT = 'site';
const SHOT_SOURCE='docs/quality-review/captures/website/2026-10-23-de-hu-04';
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
 const copies={
  en:{stable:'Stable',apk:'Get it on Google Play',betaApk:'Android beta APK',notes:'Release notes',source:'Source code',stableSummary:'Practice recording and trimming, video title cards, revised catalogue, improved Google Drive sync and repertoire in in-person lessons.',betaSummary:'A clearer Manage screen with notebook identity, automatic synchronization, QR and local backup. Recovery actions are grouped separately.'},
  es:{stable:'Estable',apk:'Descargar en Google Play',betaApk:'APK beta de Android',notes:'Notas de versión',source:'Código fuente',stableSummary:'Grabación y recorte de prácticas, portadas de vídeo, catálogo revisado, mejoras en Google Drive y repertorio en clases presenciales.',betaSummary:'Gestionar muestra el cuaderno, la sincronización automática, el QR y la copia local con más claridad. Las acciones de recuperación quedan agrupadas.'},
  ca:{stable:'Estable',apk:'Descarrega a Google Play',betaApk:'APK beta d’Android',notes:'Notes de versió',source:'Codi font',stableSummary:'Gravació i retall de pràctiques, portades de vídeo, catàleg revisat, millores a Google Drive i repertori a les classes presencials.',betaSummary:'Gestiona mostra el quadern, la sincronització automàtica, el QR i la còpia local amb més claredat. Les accions de recuperació queden agrupades.'}
 };
 const copy=copies[t.lang]||extraCopy(copies.en,t.lang);
 const releaseCopy={
 en:['German and Hungarian join English, Spanish and Catalan in the app and website. Refreshed screenshots and wording for stable releases.','Signed Android APK','Google Play availability follows approval of version 6.1.3.'],
 es:['Alemán y húngaro se unen al español, inglés y catalán en la app y la web. Capturas renovadas y textos para versiones estables.','APK de Android firmado','La disponibilidad en Google Play depende de la aprobación de la versión 6.1.3.'],
 ca:['L’alemany i l’hongarès s’afegeixen al català, castellà i anglès a l’app i al web. Captures renovades i textos per a versions estables.','APK d’Android signat','La disponibilitat a Google Play depèn de l’aprovació de la versió 6.1.3.'],
 de:['Die App und Website sind jetzt auch auf Deutsch und Ungarisch verfügbar. Neue Bildschirmbilder und überarbeitete Texte für stabile Versionen.','Signierte Android-APK','Die Verfügbarkeit bei Google Play folgt nach der Freigabe von Version 6.1.3.'],
 hu:['Az alkalmazás és a weboldal már magyarul és németül is elérhető. Friss képernyőképek és a stabil kiadásokhoz igazított szövegek.','Aláírt Android APK','A Google Playen a 6.1.3-as verzió jóváhagyása után lesz elérhető.']
 }[t.lang];
 copy.stableSummary=releaseCopy[0];
 const card=(channel,title,version,code,summary,apk)=>`<article class="feature" data-channel="${channel}"><h3>${title} · ${version} (${code})</h3><p>${summary}</p><div class="download-actions"><a class="cta" href="${channel==='stable'?'https://play.google.com/store/apps/details?id=com.miguecoll.spino':`${t.root}downloads/spino-${version}-${code}-beta-android.apk`}" ${channel==='beta'?'download':''}>${apk}</a><button type="button" class="release-open" data-release-open>${copy.notes}</button></div><div class="download-links">${channel==='beta'?`<a href="${t.root}downloads/spino-${version}-checksums.json">SHA-256</a>`:`<a href="${t.root}downloads/spino-${version}-${code}-android.apk" download>${releaseCopy[1]}</a><a href="${t.root}downloads/spino-${version}-checksums.json">SHA-256</a><span>${releaseCopy[2]}</span>`}<a href="https://github.com/cuoyot/spino/tree/v${version}">${copy.source}</a></div></article>`;
 return `<div id="downloads"><h2>${t.downloadsTitle}</h2><p class="download-note">${t.ctaNote}</p>${card('stable',copy.stable,STABLE_RELEASE.version,STABLE_RELEASE.code,copy.stableSummary,copy.apk)}${card('beta','Beta','6.1.2-beta.2','88',copy.betaSummary,copy.betaApk)}</div>`;
}

function languagePicker(lang,root){const names={"es":"Español","en":"English","ca":"Català","de":"Deutsch","hu":"Magyar"};return `<details class="language-picker"><summary aria-label="${names[lang]} — ${lang==='de'?'Sprache ändern':lang==='hu'?'Nyelv módosítása':lang==='ca'?'Canvia l’idioma':lang==='es'?'Cambiar idioma':'Change language'}" title="${names[lang]}"><span class="flag flag-${lang}" aria-hidden="true"></span></summary><div class="language-options">${['es','en','ca','de','hu'].filter(l=>l!==lang).map(l=>`<a href="${root}${l==='es'?'':l+'/'}" lang="${l}" hreflang="${l}"><span class="flag flag-${l}" aria-hidden="true"></span>${names[l]}</a>`).join('')}</div></details>`; }
const STYLE = `.flag-de{background:linear-gradient(#171717 33.33%,#ce2028 33.33% 66.66%,#ffce36 66.66%)}.flag-hu{background:linear-gradient(#ce293e 33.33%,#fff 33.33% 66.66%,#477050 66.66%)}.language-picker{position:relative;z-index:5}.language-picker summary{list-style:none;cursor:pointer;border:1px solid #615b72;border-radius:10px;padding:10px;display:flex;align-items:center;background:#29263a}.language-picker summary::-webkit-details-marker{display:none}.language-picker summary:focus-visible,.language-picker a:focus-visible{outline:3px solid #ffdf69;outline-offset:3px}.language-options{position:absolute;right:0;top:100%;margin-top:8px;min-width:160px;background:#29263a;border:1px solid #615b72;border-radius:12px;padding:5px;box-shadow:0 8px 24px #0005}.language-options a{display:flex;align-items:center;gap:10px;color:#fff5ee;text-decoration:none;padding:10px;border-radius:7px;white-space:nowrap}.language-options a:hover{background:#454057}.flag{display:inline-block;width:30px;height:21px;border-radius:3px;box-shadow:0 0 0 1px #ffffff40;flex-shrink:0}.flag-es{background:linear-gradient(#b72730 25%,#ffd451 25% 75%,#b72730 75%)}.flag-ca{background:repeating-linear-gradient(to bottom,#f5ce43 0 11.11%,#c9353d 11.11% 22.22%)}.flag-en{background:linear-gradient(90deg,transparent 41%,#c83041 41% 59%,transparent 59%),linear-gradient(transparent 35%,#c83041 35% 65%,transparent 65%),linear-gradient(90deg,transparent 32%,#fff 32% 68%,transparent 68%),linear-gradient(transparent 25%,#fff 25% 75%,transparent 75%),linear-gradient(33deg,transparent 43%,#fff 43% 48%,#c83041 48% 52%,#fff 52% 57%,transparent 57%),linear-gradient(-33deg,transparent 43%,#fff 43% 48%,#c83041 48% 52%,#fff 52% 57%,transparent 57%),#253d88}:root{--bg:#14161a;--panel:#1d2027;--line:#2c313a;--text:#e8eaed;--muted:#a3abb7;--accent:#4f8cff}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}body{margin:0;background:var(--bg);color:var(--text);font:17px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--accent)}img{max-width:100%;height:auto;display:block}
.wrap{max-width:1080px;margin:0 auto;padding:0 16px}
header.top{display:flex;align-items:center;justify-content:space-between;padding:18px 0}
.brand{display:flex;align-items:center;gap:10px;color:var(--text);text-decoration:none;font-weight:700;font-size:20px}.brand img{width:36px;height:36px}
.lang{color:var(--muted);text-decoration:none;border:1px solid var(--line);border-radius:999px;padding:6px 14px;font-size:14px}
.hero{display:grid;grid-template-columns:1.1fr .9fr;column-gap:40px;row-gap:0;align-items:center;padding:40px 0 56px}
.hero h1{grid-column:1;grid-row:1;font-size:clamp(36px,6vw,58px);line-height:1.05;margin:0 0 16px;letter-spacing:-.02em}
.hero h1 span{color:var(--accent)}.hero p.lead{color:var(--muted);font-size:19px;margin:0 0 28px}
.cta{display:inline-flex;align-items:center;gap:10px;background:#2563eb;color:#fff;text-decoration:none;font-weight:650;border-radius:14px;padding:14px 22px}.cta:hover{background:#1d4ed8}.cta:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
#downloads{display:grid;gap:16px}#downloads h3{margin-top:0}.download-actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin-top:18px}.download-links{display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:16px;font-size:14px}
#downloads h2{font-size:22px;margin:0}.download-note{color:var(--muted);margin:0}.faq{max-width:800px}.faq article{padding:20px 0;border-top:1px solid var(--line);scroll-margin-top:24px}.faq h3{font-size:20px;line-height:1.4;margin:0 0 10px}.faq p{margin:0;color:var(--muted)}
.cta-note{display:block;color:var(--muted);font-size:14px;margin-top:10px}
.hero-copy{grid-column:1;grid-row:2;min-width:0}.hero .phone{grid-column:2;grid-row:1 / span 2;justify-self:center;width:min(300px,80vw);border-radius:28px;border:6px solid #2a2e36;box-shadow:0 30px 60px rgba(0,0,0,.45)}
h2{font-size:clamp(26px,4vw,36px);margin:0 0 24px;letter-spacing:-.01em}
section{padding:48px 0}
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}
.feature{background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:22px}
.feature svg{width:30px;height:30px;color:var(--accent)}.feature h3{margin:12px 0 6px;font-size:19px}.feature p{margin:0;color:var(--muted);font-size:16px}
.catalogue-intro,.catalogue-credit{max-width:800px;color:var(--muted)}.catalogue-beta{color:var(--accent);font-size:14px;margin:0 0 10px}.catalogue-stats{display:flex;flex-wrap:wrap;align-items:center;gap:16px 32px;margin:26px 0}.catalogue-stats div{display:flex;gap:12px;align-items:center}.catalogue-stats strong{font-size:36px;color:var(--accent);line-height:1}.catalogue-stats span{max-width:120px;font-size:15px}.catalogue-stats p{color:var(--muted);font-size:15px}.catalogue-albeniz{border-left:3px solid var(--accent);padding:12px 18px;margin:24px 0}.catalogue-shots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:24px;max-width:900px;margin:30px auto}.catalogue-shots figure{margin:0;min-width:0}.catalogue-shots img{width:100%;border:1px solid var(--line);border-radius:18px}.catalogue-shots figcaption{font-size:14px;color:var(--muted);margin-top:12px}.catalogue-credit{font-size:14px}.catalogue-section .feature h3{margin-top:0}@media(max-width:600px){.catalogue-shots{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:16px;gap:16px}.catalogue-shots figure{flex:0 0 min(260px,78vw);scroll-snap-align:start}}
.hanon-demo>p{max-width:760px;color:var(--muted)}.hanon-demo figure{margin:24px 0 0}.hanon-demo video{display:block;width:100%;height:auto;aspect-ratio:1920/804;background:#111a21;border:1px solid var(--line);border-radius:18px}.hanon-demo figcaption{display:flex;flex-wrap:wrap;gap:8px 20px;margin-top:12px;color:var(--muted);font-size:14px}
.shots{display:flex;gap:16px;overflow-x:auto;scroll-snap-type:x mandatory;padding-bottom:12px}
.shots img{flex:0 0 auto;width:min(240px,62vw);border-radius:20px;border:1px solid var(--line);scroll-snap-align:start}
.wide{margin-top:24px;border-radius:18px;border:1px solid var(--line)}
.privacy{background:var(--panel);border:1px solid var(--line);border-radius:22px;padding:28px;display:grid;grid-template-columns:auto 1fr;gap:20px;align-items:start}
.privacy svg{width:40px;height:40px;color:var(--accent)}.privacy h2{margin:0 0 8px}.privacy p{margin:0 0 12px;color:var(--muted)}
footer{border-top:1px solid var(--line);margin-top:24px;padding:28px 0 40px;color:var(--muted);font-size:14px;display:flex;flex-wrap:wrap;gap:16px;justify-content:space-between}
footer a{color:var(--muted)}
.release-open,.release-dialog button{font:inherit;min-height:44px;cursor:pointer;border:1px solid var(--line);border-radius:10px;background:var(--panel);color:var(--text);padding:8px 14px}.release-open{color:var(--accent)}.release-dialog{width:min(850px,calc(100% - 24px));max-height:85dvh;padding:0;border:1px solid var(--line);border-radius:20px;background:var(--panel);color:var(--text);overflow:hidden}.release-dialog[open]{display:flex;flex-direction:column}.release-dialog::backdrop{background:#000a}.release-dialog header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 20px;border-bottom:1px solid var(--line);flex:none}.release-dialog h2{font-size:22px;margin:0}.release-dialog header button{min-width:44px;font-size:26px;padding:0;flex:none}.release-body{overflow-y:auto;overscroll-behavior:contain;min-height:0;padding:0 20px 20px}.release-body>p{color:var(--muted)}.release-dialog details{border-bottom:1px solid var(--line);padding:12px 0}.release-dialog summary{cursor:pointer;min-height:44px;align-content:center;font-weight:650}.release-dialog p,.release-dialog li{overflow-wrap:anywhere}.release-dialog code{font-size:.9em}.release-open:focus-visible,.release-dialog :focus-visible{outline:3px solid var(--accent);outline-offset:3px}
@media (min-width:761px) and (max-width:1000px){.hero h1{grid-column:1 / -1;margin-bottom:24px}.hero .phone{grid-row:2}}
@media (max-width:760px){.hero h1,.hero-copy,.hero .phone{grid-column:auto;grid-row:auto}.hero{grid-template-columns:1fr;padding-top:16px}.hero .phone{width:min(260px,72vw)}.privacy{grid-template-columns:1fr}}`;

function page(t) {
  const shot = (name, i) => `<img src="${t.root}img/${t.lang}/${name}.png?v=2026-10-23-de-hu-04" alt="${t.shotAlt[i]}" width="1080" height="1920" loading="lazy">`;
  return `<!doctype html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t.title}</title>
<meta name="description" content="${t.description}">
${metadata({path:localizedPath(t.lang),lang:t.lang,title:t.title,description:t.description,translationBase:'/'})}
${structuredData(t)}
<link rel="icon" href="${t.root}img/icon.png">
<link rel="apple-touch-icon" href="${t.root}img/icon.png">
<style>${STYLE}</style>
</head>
<body>
<div class="wrap">
<header class="top"><a class="brand" href="./"><img src="${t.root}img/icon.png" alt="" width="36" height="36">SPino</a>${languagePicker(t.lang,t.root)}</header>
<main>
<section class="hero">
<h1>SPino<br><span>${t.tagline}</span></h1>
<div class="hero-copy"><p class="lead">${t.lead}</p>
${downloads(t)}<p><a href="#catalogue">${t.lang==='de'?'Katalog entdecken':t.lang==='hu'?'Katalógus böngészése':t.lang==='es'?'Explorar el catálogo':t.lang==='ca'?'Explorar el catàleg':'Explore the catalogue'} →</a> · <a href="#faq">${t.faqTitle}</a></p></div>
<img class="phone" src="${t.root}img/${t.lang}/01-today.png?v=2026-10-23-de-hu-04" alt="${t.shotAlt[0]}" width="1080" height="1920">
</section>
${catalogueSection(t)}
<section id="hanon" class="hanon-demo" aria-labelledby="hanon-title"><h2 id="hanon-title">${t.hanon.title}</h2><p>${t.hanon.description}</p><figure><video controls playsinline preload="none" width="1920" height="804" poster="${t.root}media/hanon-warmups-2026-10-20.jpg" aria-label="${t.hanon.label}" aria-describedby="hanon-caption"><source src="${t.root}media/hanon-warmups-2026-10-20.mp4" type="video/mp4"><a href="${t.root}media/hanon-warmups-2026-10-20.mp4">${t.hanon.fallback}</a></video><figcaption id="hanon-caption"><span>${t.hanon.caption}</span><a href="${t.root}media/hanon-warmups-2026-10-20-credits.txt">${t.hanon.credits}</a></figcaption></figure></section>
<section id="features"><h2>${t.featuresTitle}</h2><div class="features">${t.features.map(([k, h, p]) => `<article class="feature">${ICONS[k]}<h3>${h}</h3><p>${p}</p></article>`).join('')}</div></section>
<section><h2>${t.shotsTitle}</h2><p class="shots-note">${t.shotsNote}</p><div class="shots">${SHOTS.map(shot).join('')}</div>
<img class="wide" src="${t.root}img/${t.lang}/wide-reading.png?v=2026-10-23-de-hu-04" alt="${t.wideAlt}" width="2560" height="1600" loading="lazy">
<figure style="margin:24px 0 0"><img class="wide" src="${t.root}img/${t.lang}/landscape-reading.png?v=2026-10-23-de-hu-04" alt="${t.landscapeAlt}" width="844" height="390" loading="lazy"><figcaption>${t.landscapeAlt}</figcaption></figure></section>
${faqSection(t)}
<section><div class="privacy">${ICONS.lock}<div><h2>${t.privacyTitle}</h2><p>${t.privacy}</p><a href="${t.root}privacy/">${t.privacyLink}</a></div></div></section>
<section id="arcade"><div class="feature"><h2>Spino Arcade · ${t.lang==='de'?'Spiellabor':t.lang==='hu'?'Zenei játéklabor':t.lang==='ca'?'Laboratori de joc':t.lang==='en'?'Play lab':'Laboratorio de juego'}</h2><p>${t.lang==='de'?'Ein Musikspiel aus der SPino-Familie. Lies bewegte Noten, halte den Rhythmus und sammle Serien — mit gesampelten Instrumenten und schrittweisem Fortschritt.':t.lang==='hu'?'Zenei játék a SPino családból. Olvass mozgó hangjegyeket, tartsd a ritmust, és építs sorozatokat, mintavételezett hangszerekkel és fokozatos fejlődéssel.':t.lang==='ca'?'Un joc musical nascut de Spino: Smart Piano Notebook. Llegeix notes en moviment, segueix el ritme i encadena ratxes, amb instruments amb mostres i progressió gradual.':t.lang==='en'?'A musical game born from Spino: Smart Piano Notebook. Read moving notes, keep the rhythm and build streaks, with sampled instruments and gentle progression.':'Un juego musical nacido de Spino: Smart Piano Notebook. Lee notas en movimiento, sigue el ritmo y encadena rachas, con instrumentos con muestras y progresión gradual.'}</p><p><a href="${t.root+'arcade/'+(t.lang==='es'?'':(['de','hu'].includes(t.lang)?'en':t.lang)+'/')}">${t.lang==='de'?'Spino Arcade 1.0 entdecken (Englisch)':t.lang==='hu'?'Fedezd fel a Spino Arcade 1.0-t (angol)':t.lang==='ca'?'Descobreix Spino Arcade 1.0':t.lang==='en'?'Discover Spino Arcade 1.0':'Descubre Spino Arcade 1.0'} →</a></p></div></section></main>
<footer><span>© ${new Date().getFullYear()} ${t.footer}</span><span><a href="mailto:support@spinoapp.com">${t.contact}</a> · <a href="${t.root}privacy/">${t.privacyLink}</a></span></footer>
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
  for(const name of ['catalogue','period-author','preview']) await copyFile(`${SHOT_SOURCE}/${t.lang}/phone/catalogue-${name}.png`,join(OUT,'img',t.lang,`catalogue-${name}-beta8.png`));
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
await writeFile(join(OUT, 'privacy', 'index.html'), enhanceStaticPage(policy, {path:'/privacy/',lang:'en'}));
await writeFile(join(OUT, '_headers'), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
/img/*
  Cache-Control: public, max-age=604800
/downloads/*
  X-Robots-Tag: noindex
/robots.txt
  Content-Type: text/plain; charset=utf-8
  Cache-Control: public, max-age=3600
/sitemap.xml
  Content-Type: application/xml; charset=utf-8
  Cache-Control: public, max-age=3600
`);
await writeFile(join(OUT, '_headers'), (await readFile(join(OUT, '_headers'), 'utf8')) + "\n/downloads/*.apk\n  Content-Type: application/vnd.android.package-archive\n  Content-Disposition: attachment\n  Cache-Control: public, max-age=300\n");
await writeFile(join(OUT, '404.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Page not found | SPino</title><body style="margin:0;background:#14161a;color:#e8eaed;font:17px/1.6 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;text-align:center"><div><h1>Page not found</h1><p lang="es">Página no encontrada</p><p><a style="color:#4f8cff" href="/">SPino</a></p></div></body></html>\n`);
await writeFile(join(OUT, '_headers'), (await readFile(join(OUT, '_headers'), 'utf8')) + "\n/downloads/*.zip\n  Content-Type: application/zip\n  Content-Disposition: attachment\n  Cache-Control: public, max-age=300\n");
await cp('scripts/site/downloads' , join(OUT, 'downloads'), { recursive: true });
await cp('scripts/site/arcade', join(OUT, 'arcade'), { recursive: true });
for (const lang of ['es','en','ca']) {
  const path = localizedPath(lang, '/arcade/'), file = join(OUT, path, 'index.html');
  const html = await readFile(file, 'utf8');
  await writeFile(file, enhanceStaticPage(html, {path,lang,translationBase:'/arcade/',image:`/arcade/img/feature-${lang}.png`}));
}
const arcadePrivacy = join(OUT, 'arcade/privacy/index.html');
await writeFile(arcadePrivacy, enhanceStaticPage(await readFile(arcadePrivacy, 'utf8'), {path:'/arcade/privacy/',lang:'en'}));
await writeFile(join(OUT, 'robots.txt'), ROBOTS);
await writeFile(join(OUT, 'sitemap.xml'), sitemap());
await cp('scripts/site/media', join(OUT, 'media'), { recursive: true });
console.log('site/ built');

}
