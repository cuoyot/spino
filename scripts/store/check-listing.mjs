// Checks the Google Play listing texts in docs/play-store/listing.md against the Play Console limits.
import { readFile } from 'node:fs/promises';
const LIMITS = { name: 30, short: 80, full: 4000, notes: 500 };
const text = await readFile('docs/play-store/listing.md', 'utf8');
let failed = false;
for (const [, lang, field, body] of text.matchAll(/<!-- field:(\w+):(\w+) -->\r?\n([\s\S]*?)\r?\n<!-- \/field -->/g)) {
  const length = [...body.trim()].length, limit = LIMITS[field];
  const ok = length <= limit;
  failed ||= !ok;
  console.log(`${ok ? 'ok  ' : 'LONG'} ${lang}.${field}: ${length}/${limit}`);
}
if (failed) process.exit(1);
