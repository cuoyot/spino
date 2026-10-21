import { ui } from './locale.js';

// Preview pixels and notation are temporary. This module never writes score assets or reviews.
export async function renderCataloguePreview(target, asset, { signal } = {}) {
  const active = () => target.isConnected && !signal?.aborted;
  const sheet = document.createElement('div');
  sheet.className = 'cp-catalogue-preview-sheet';
  sheet.setAttribute('aria-label', ui('Score preview','Vista previa de la partitura'));
  if(asset.previewURL) {
    const image=new Image();image.alt=ui('First page of the score','Primera página de la partitura');
    await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error(ui('Could not load the score preview.','No se ha podido cargar la vista previa de la partitura.')));image.src=asset.previewURL;});
    if(active()){sheet.append(image);target.replaceChildren(sheet);}return;
  }
  if (asset.format === 'pdf' || asset.type === 'application/pdf') {
    const { loadPDF } = await import('./pdf-document.js');
    const task = loadPDF(asset.base64);
    const abort = () => { void task.destroy().catch(() => {}); };
    signal?.addEventListener('abort', abort, { once: true });
    try {
      const pdf = await task.promise, page = await pdf.getPage(1);
      if (!active())return;
      const viewport = page.getViewport({ scale: Math.min(2,1200/page.getViewport({scale:1}).width) });
      const canvas = document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
      if (!active())return;
      canvas.setAttribute('role','img');canvas.setAttribute('aria-label',ui('First page of the score','Primera página de la partitura'));
      sheet.append(canvas);target.replaceChildren(sheet);
    } finally { signal?.removeEventListener('abort',abort);await task.destroy(); }
    return;
  }
  const [{OpenSheetMusicDisplay},{readMusicXML,bytesFromBase64,children},{excerptXML}] = await Promise.all([
    import('opensheetmusicdisplay'),import('./musicxml-document.js'),import('./musicxml-segments.js'),
  ]);
  if(!active())return;
  const validated=readMusicXML(bytesFromBase64(asset.base64),asset.format);
  const parts=children(validated.document.documentElement,'part');
  const end=Math.min(12,...parts.map(part=>children(part,'measure').length));
  if(!parts.length||!end)throw Error(ui('No written measures are available to preview.','No hay compases escritos que previsualizar.'));
  const host=document.createElement('div');host.style.width='760px';sheet.append(host);target.replaceChildren(sheet);
  const display=new OpenSheetMusicDisplay(host,{backend:'svg',autoResize:false,drawTitle:true,pageFormat:'Endless'});
  try {
    await display.load(excerptXML(validated.xml,parts.map(part=>part.getAttribute('id')),0,end));
    if(!active())return;
    display.render();
    for(const svg of host.querySelectorAll('svg')) {svg.setAttribute('role','img');svg.setAttribute('aria-label',ui('Opening measures of the score','Primeros compases de la partitura'));}
  } catch(error) { display.clear();throw error; }
}
