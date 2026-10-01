import { readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export async function writeGallery(folder, metadata) {
  const title = metadata.title || 'Today';
  const reviewHref = metadata.reviewHref || '../../../today.md';
  const data = JSON.stringify(metadata.results.map(({ state, id, label, width, height, frames }) => ({ state, id, label, width, height, frames }))).replaceAll('<', '\\u003c');
  const states = [...new Set(metadata.results.map(r => r.state))];
  const labels = { typical: 'Planned practice and results', empty: 'First use', pending: 'Unfinished session', ...metadata.stateLabels };
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SPino ${escape(title)} — ${escape(metadata.runId)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#eef0f4;color:#18202c;font:15px/1.5 system-ui,sans-serif}header,main{max-width:1380px;margin:auto;padding:24px}header{padding-bottom:8px}h1{font-size:30px;letter-spacing:-.04em;margin:4px 0 10px}p{margin:6px 0;color:#536172}.eyebrow{font-size:12px;letter-spacing:.09em;text-transform:uppercase}nav{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0 0}button,a{font:inherit}button{min-height:44px;border:1px solid #a9b3c2;background:white;border-radius:9px;padding:8px 14px;color:#18202c;cursor:pointer}button[aria-pressed=true]{background:#223856;color:white;border-color:#223856}button:focus-visible,a:focus-visible{outline:3px solid #4878c5;outline-offset:3px}button:disabled{opacity:.45;cursor:default}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}.card{background:white;border:1px solid #ccd2dc;border-radius:15px;overflow:hidden}.card header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 20px}.card h2{font-size:17px;margin:0}.card header p{font-size:12px}.shot{height:445px;background:#dfe4ed;display:flex;align-items:flex-start;justify-content:center;padding:14px;overflow:hidden}.shot img{display:block;max-height:100%;max-width:100%;object-fit:contain}.card footer{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:14px 20px;flex-wrap:wrap}.frame{font-size:12px;color:#536172}.card a{color:#275487;text-underline-offset:3px}.note{border-left:3px solid #8294ae;padding:0 16px;margin:20px 0}small{font-size:12px}.metadata{margin-top:24px;font-size:13px}a{color:#275487}@media(max-width:730px){.grid{grid-template-columns:1fr}header,main{padding:18px}.shot{height:auto;max-height:680px}.shot img{max-height:650px}}
</style>
<header><p class="eyebrow">SPino · preliminary release review · ${escape(metadata.runId)}</p><h1>${escape(title)}: current screen across four viewports</h1><p>Actual UI captures with the same synthetic notebook. Select a state, then use the frame buttons to inspect the rest of each scrollable screen.</p><p class="note">This is the baseline for discussion, not an approved redesign. Chromium responsive captures do not replace Android or iOS device acceptance.</p><nav aria-label="Notebook state">${states.map((state, i) => `<button data-state="${escape(state)}" aria-pressed="${i === 0}">${escape(labels[state] || state)}</button>`).join('')}</nav></header>
<main><div class="grid" id="views"></div><p class="metadata">Spanish UI · ${escape(metadata.date)} · Europe/Madrid · 1 CSS pixel per image pixel · <a href="capture.json">Capture metadata and functional probes</a> · <a href="${escape(reviewHref)}">${escape(title)} review</a></p></main>
<script>
const captures=${data};let state=${JSON.stringify(states[0])};const positions=new Map();
function render(){document.querySelectorAll('[data-state]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.state===state)));document.querySelector('#views').innerHTML=captures.filter(c=>c.state===state).map(c=>{const i=positions.get(state+c.id)||0,f=c.frames[i];return '<article class="card"><header><div><h2>'+c.label+'</h2><p>'+c.width+' × '+c.height+' CSS px</p></div><span class="frame">'+(i===0?'Initial viewport':'Scrolled '+Math.round(f.scrollTop)+' px')+'</span></header><a class="shot" href="'+f.path+'" target="_blank" rel="noopener"><img src="'+f.path+'" alt="${escape(title)}, '+state+', '+c.label+', frame '+(i+1)+'" /></a><footer><button data-device="'+c.id+'" data-step="-1" '+(i===0?'disabled':'')+' aria-label="Previous frame for '+c.label+'">← Previous</button><span class="frame">Frame '+(i+1)+' / '+c.frames.length+'</span><button data-device="'+c.id+'" data-step="1" '+(i===c.frames.length-1?'disabled':'')+' aria-label="Next frame for '+c.label+'">Next →</button><a href="'+f.path+'" target="_blank" rel="noopener">Open at full size</a></footer></article>';}).join('');}
document.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;if(b.dataset.state){state=b.dataset.state;render();}else if(b.dataset.device){const key=state+b.dataset.device;positions.set(key,(positions.get(key)||0)+Number(b.dataset.step));render();}});render();
</script></html>`;
  await writeFile(join(folder, 'index.html'), html);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const folder = resolve(process.argv[2]);
  await writeGallery(folder, JSON.parse(await readFile(join(folder, 'capture.json'), 'utf8')));
}
