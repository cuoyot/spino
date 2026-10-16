import {fixWebmDuration} from '@fix-webm-duration/fix';

// MediaRecorder leaves WebM duration unset. Native controls otherwise use the
// buffered range as their timeline, so a long take looks nearly finished early.
// Leave other containers and WebM files with an existing duration untouched.
export async function finalizeMediaDuration(blob, durationMs) {
  if (!/^(audio|video)\/webm(?:;|$)/i.test(blob.type) || !Number.isFinite(durationMs) || durationMs <= 0) return blob;
  return fixWebmDuration(blob, durationMs, {logger:false});
}
