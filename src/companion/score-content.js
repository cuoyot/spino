import { digest } from './library.js';

// Content references identify immutable bytes; object property order is irrelevant.
export function sameScoreContent(a, b) {
  return !!a && !!b && Number.isSafeInteger(a.length) && a.length === b.length
    && Array.isArray(a.parts) && Array.isArray(b.parts) && a.parts.length === b.parts.length
    && a.parts.every((hash, index) => /^[a-f0-9]{64}$/.test(hash) && hash === b.parts[index]);
}

// Keep the current device's metadata and annotations when filling a deferred asset.
export function downloadedScore(current, expected, downloaded) {
  if (!current || current.id !== expected.id || downloaded.id !== expected.id
    || !sameScoreContent(current.remoteContent, expected.remoteContent)
    || !sameScoreContent(downloaded.remoteContent, expected.remoteContent)) {
    throw new Error('The score changed. Synchronize the notebook and open the score again.');
  }
  if (typeof downloaded.base64 !== 'string' || downloaded.base64.length !== expected.remoteContent.length) {
    throw new Error('The downloaded score is incomplete. Retry downloading.');
  }
  return { ...current, base64: downloaded.base64 };
}

// A first deferred sync may have no prior reference. Verify existing local chunks
// before retaining the cached bytes instead of downloading an identical score.
export async function scoreBytesMatch(base64, content) {
  if (typeof base64 !== 'string' || !sameScoreContent(content, content) || base64.length !== content.length) return false;
  const parts=[];
  for(let offset=0;offset<base64.length;offset+=524288)parts.push(await digest(JSON.stringify({kind:'score-bytes',value:base64.slice(offset,offset+524288)})));
  return sameScoreContent({length:base64.length,parts},content);
}
