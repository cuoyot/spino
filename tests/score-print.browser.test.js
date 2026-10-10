import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdir,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser.js';
import {scorePDF} from './pdf-fixture.js';

test('complete PDF/XML printing includes marks and leaves source/viewer unchanged', {timeout:120000},async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
  const files=await readdir('dist/assets');
  const moduleURL=name=>'/assets/'+files.find(file=>file.startsWith(name+'-')&&file.endsWith('.js'));
  const wait=c=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${c}){clearInterval(timer);resolve();}else if(++n>1000){clearInterval(timer);reject(Error('Print timeout'));}},20);})`);
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    const getter=Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype,'contentWindow').get;
    Object.defineProperty(HTMLIFrameElement.prototype,'contentWindow',{get(){
      const child=getter.call(this);if(child)child.print=()=>{
        window.__printPages=[...child.document.images].map(image=>image.src);
        window.__printCSS=child.document.querySelector('style').textContent;
        child.dispatchEvent(new Event('afterprint'));
      };return child;
    }});
  `});
  await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
  const asset={base64:scorePDF(),annotations:{version:1,marks:[{id:'print-finger',page:1,type:'fingering',text:'3',color:'#d64545',fontSize:.04,width:.0035,points:[{x:.2,y:.2}]}]}};
  await evaluate(`(async()=>{window.viewer=await (await import('${moduleURL('pdf-viewer')}')).openScore({asset:${JSON.stringify(asset)},title:'Synthetic print',save:async()=>{}});})()`);
  await wait(`document.querySelector('.pdf-paper').getAttribute('aria-busy')==='false'`);
  await evaluate(`document.querySelector('[data-pdf=tools]').click();document.querySelector('[data-pdf=print]').click()`);
  await wait(`window.__printPages?.length===2`);
  assert.equal(await evaluate(`!!document.querySelector('.score-print-preview')`),false);
  const pdfCSS=await evaluate('window.__printCSS');
  assert.match(pdfCSS,/size:595pt 842pt/);assert.match(pdfCSS,/size:792pt 612pt/);
  const red=await evaluate(`(async()=>{const image=new Image();image.src=window.__printPages[0];await image.decode();const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;c.getContext('2d').drawImage(image,0,0);const bytes=c.getContext('2d').getImageData(c.width*.15,c.height*.15,c.width*.1,c.height*.1).data;let red=0;for(let i=0;i<bytes.length;i+=4)if(bytes[i]>150&&bytes[i+1]<130&&bytes[i+2]<130)red++;return red;})()`);
  assert.ok(red>20,'Printed PDF includes red fingering');
  await evaluate(`(async()=>{await viewer.close();window.__printPages=null;})()`);
  const note=(step,octave,staff=1)=>`<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>1</duration><voice>${staff}</voice><type>quarter</type><staff>${staff}</staff></note>`;
  const measures=piano=>Array.from({length:64},(_,i)=>`<measure number="${i+1}">${i===0?`<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time>${piano?'<staves>2</staves>':''}<clef number="1"><sign>G</sign><line>2</line></clef>${piano?'<clef number="2"><sign>F</sign><line>4</line></clef>':''}</attributes>`:''}${['C','D','E','F'].map(step=>note(step,piano?4:6)).join('')}${piano?'<backup><duration>4</duration></backup>'+['C','D','E','F'].map(step=>note(step,3,2)).join(''):''}</measure>`).join('');
  const xml=`<score-partwise version="4.0"><work><work-title>Printing test score</work-title></work><part-list><score-part id="V"><part-name>Voice</part-name></score-part><score-part id="P"><part-name>Piano</part-name></score-part></part-list><part id="V">${measures(false)}</part><part id="P">${measures(true)}</part></score-partwise>`,base64=Buffer.from(xml).toString('base64'),sha256=createHash('sha256').update(xml).digest('hex');
  await evaluate(`(async()=>{window.viewer=await (await import('${moduleURL('musicxml-viewer')}')).openMusicScore({asset:{base64:${JSON.stringify(base64)},format:'musicxml',sha256:${JSON.stringify(sha256)},musicxmlMarks:[{key:'P:0:0:0:0:0',type:'finger',digit:'5',color:'#d94848',fontSize:.04}]},selection:['P'],start:2,end:4});})()`);
  await evaluate(`document.querySelector('[data-xml=options]').click();document.querySelector('[data-xml=print]').click()`);
  await wait(`window.__printPages?.length>1 || document.querySelector('.xml-status').dataset.error`);
  assert.equal(await evaluate(`document.querySelector('.xml-status').dataset.error`),undefined,await evaluate(`document.querySelector('.xml-status').textContent`));
  const xmlCSS=await evaluate('window.__printCSS');
  assert.ok((xmlCSS.match(/size:595.2756pt 841.8898pt/g)||[]).length>1);
  assert.equal(await evaluate(`!!document.querySelector('.score-print-preview')`),false);
  const xmlRed=await evaluate(`(async()=>{const image=new Image();image.src=window.__printPages[0];await image.decode();const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;c.getContext('2d').drawImage(image,0,0);const bytes=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let red=0;for(let i=0;i<bytes.length;i+=4)if(bytes[i]>150&&bytes[i+1]<130&&bytes[i+2]<130)red++;return red;})()`);
  assert.ok(xmlRed>20,'Print includes a fingering outside the open excerpt');
  await mkdir('docs/quality-review/captures/printing/2026-10-07-print-score',{recursive:true});
  const images=await evaluate(`window.__printPages`);
  for(const [index,image] of images.entries())await writeFile(`docs/quality-review/captures/printing/2026-10-07-print-score/xml-a4-${index+1}.png`,Buffer.from(image.split(',')[1],'base64'));
  await evaluate(`(async()=>{await viewer.close();window.__printPages=null;})()`);
  assert.deepEqual(errors,[]);
});
