let tail = Promise.resolve();
// Share one transfer slot across the legacy PDF and MusicXML queues.
export async function reserveDownload() {
  const previous = tail; let release;
  tail = new Promise(resolve => { release = resolve; });
  await previous; return release;
}
