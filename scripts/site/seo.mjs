// Shared public URLs keep HTML metadata, language alternates and the sitemap aligned.
export const ORIGIN = 'https://spinoapp.com';
export const LANGUAGES = ['es', 'en', 'ca', 'de', 'hu'];
const ARCADE_LANGUAGES = ['es','en','ca'];
export const STABLE_RELEASE = { version: '6.1.3', code: '91' };
export const localizedPath = (lang, base = '/') => base + (lang === 'es' ? '' : `${lang}/`);
export const absoluteUrl = path => new URL(path, ORIGIN).href;
export const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export const jsonLd = value => `<script type="application/ld+json">${JSON.stringify(value).replace(/</g, '\\u003c')}</script>`;

export function metadata({ path, lang, title, description, image = '/img/feature.png', translationBase }) {
  const languages = translationBase === '/arcade/' ? ARCADE_LANGUAGES : LANGUAGES;
  const url = absoluteUrl(path), locales = { es: 'es_ES', en: 'en_US', ca: 'ca_ES', de: 'de_DE', hu: 'hu_HU' };
  return `<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large">
${translationBase === undefined ? '' : [...languages, 'x-default'].map(language => `<link rel="alternate" hreflang="${language}" href="${absoluteUrl(localizedPath(language === 'x-default' ? 'es' : language, translationBase))}">`).join('\n')}
<meta property="og:type" content="website">
<meta property="og:site_name" content="SPino">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${locales[lang]}">
${translationBase === undefined ? '' : languages.filter(language => language !== lang).map(language => `<meta property="og:locale:alternate" content="${locales[language]}">`).join('\n')}
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${absoluteUrl(image)}">
<meta property="og:image:alt" content="${escapeHtml(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${absoluteUrl(image)}">
<meta name="twitter:image:alt" content="${escapeHtml(title)}">`;
}

export function structuredData(t) {
  const url = absoluteUrl(localizedPath(t.lang)), appId = `${ORIGIN}/#app`;
  return jsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': `${ORIGIN}/#website`, url: `${ORIGIN}/`, name: 'SPino', alternateName: 'Smart Piano Notebook', inLanguage: LANGUAGES },
      { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: t.title, description: t.description, inLanguage: t.lang,
        isPartOf: { '@id': `${ORIGIN}/#website` }, about: { '@id': appId }, mainEntity: { '@id': appId }, hasPart: { '@id': `${url}#faq` } },
      { '@type': 'SoftwareApplication', '@id': appId, name: 'SPino: Smart Piano Notebook', url: `${ORIGIN}/`,
        description: t.lead, operatingSystem: 'Android', applicationCategory: 'EducationalApplication',
        inLanguage: LANGUAGES, isAccessibleForFree: true, softwareVersion: STABLE_RELEASE.version,
        image: `${ORIGIN}/img/icon.png`, screenshot: `${ORIGIN}/img/${t.lang}/01-today.png`,
        downloadUrl: `${ORIGIN}/downloads/spino-${STABLE_RELEASE.version}-${STABLE_RELEASE.code}-android.apk`,
        license: 'https://www.gnu.org/licenses/gpl-3.0.html',
        sameAs: ['https://github.com/cuoyot/spino', 'https://play.google.com/store/apps/details?id=com.miguecoll.spino'],
        featureList: t.features.map(([, title, description]) => `${title}: ${description}`),
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR', url: `${url}#downloads` } },
      { '@type': 'FAQPage', '@id': `${url}#faq`, url: `${url}#faq`, name: t.faqTitle, inLanguage: t.lang,
        isPartOf: { '@id': `${url}#webpage` }, about: { '@id': appId },
        mainEntity: t.faq.map(([question, answer], index) => ({ '@type': 'Question', '@id': `${url}#faq-${index + 1}`, name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) },
    ],
  });
}

export function faqSection(t) {
  return `<section id="faq" class="faq" aria-labelledby="faq-title"><h2 id="faq-title">${escapeHtml(t.faqTitle)}</h2>${t.faq.map(([question, answer], index) => `<article id="faq-${index + 1}"><h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer)}</p></article>`).join('')}</section>`;
}

// Existing Arcade and privacy documents keep their reviewed content and receive the same metadata.
export function enhanceStaticPage(html, options) {
  const title = html.match(/<title>([^<]+)<\/title>/)[1];
  const description = html.match(/<meta name="description" content="([^"]*)"/i)?.[1] || title;
  const url = absoluteUrl(options.path);
  return html.replace(/<link rel="alternate" hreflang="[^"]+" href="[^"]+">/g, '')
    .replace('<title>', `${metadata({ ...options, title, description })}\n${jsonLd({ '@context': 'https://schema.org', '@type': 'WebPage', '@id': `${url}#webpage`, url, name: title, description, inLanguage: options.lang, isPartOf: { '@id': `${ORIGIN}/#website` } })}\n<title>`);
}

export function sitemap() {
  const groups = ['/', '/arcade/'];
  const entries = groups.flatMap(base => (base === '/arcade/' ? ARCADE_LANGUAGES : LANGUAGES).map(lang => ({ path: localizedPath(lang, base), base })));
  entries.push({ path: '/privacy/' }, { path: '/arcade/privacy/' });
  // No build-time lastmod: rebuilding assets alone does not change a page's content.
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.map(({ path, base }) => `  <url><loc>${absoluteUrl(path)}</loc>${base === undefined ? '' : [...(base === '/arcade/' ? ARCADE_LANGUAGES : LANGUAGES), 'x-default'].map(lang => `\n    <xhtml:link rel="alternate" hreflang="${lang}" href="${absoluteUrl(localizedPath(lang === 'x-default' ? 'es' : lang, base))}"/>`).join('')}\n  </url>`).join('\n')}
</urlset>\n`;
}

// Search and answer-engine crawlers can retrieve the same public content as people.
export const ROBOTS = `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`;
