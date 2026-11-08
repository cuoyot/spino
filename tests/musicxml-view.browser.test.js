import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readdir, mkdir, writeFile, readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser.js';
import {musicXMLFixture} from './musicxml-fixture.js';

const hash=value=>createHash('sha256').update(value).digest('hex');
test('MusicXML view zoom, reversible labels, mark retention and reopening work across orientations', {timeout:120000}, async t=>{
  const {send,evaluate,url,errors}=await openBrowser(t,{companion:true});
  const files=await readdir('dist/assets'),chunk=files.find(n=>/^musicxml-viewer-.*\.js$/.test(n));
  const xml=musicXMLFixture().replaceAll('<part-name>Piano</part-name>','<part-name>Long concert grand piano instrument</part-name>');
  const asset={base64:Buffer.from(xml).toString('base64'),format:'musicxml',sha256:hash(xml),musicxmlMarks:[{key:'P:0:0:0:0:0',type:'finger',digit:'5',color:'#d64545'}]};
  const wait=c=>evaluate(`new Promise((resolve,reject)=>{let n=0;const timer=setInterval(()=>{if(${c}){clearInterval(timer);resolve();}else if(++n>1000){clearInterval(timer);reject(Error('MusicXML view timeout'));}},20);})`);
  const folder=process.env.XML_REVIEW_CAPTURE;
  if(folder)await mkdir(folder,{recursive:true});
  const results=[];
  await send('Page.navigate',{url});await wait(`document.querySelector('.cp-today')`);
  const css=files.filter(n=>/^pdf-viewer-.*\.css$/.test(n));
  await evaluate(`Promise.all(${JSON.stringify(css)}.map(name=>new Promise(resolve=>{const l=document.createElement('link');l.rel='stylesheet';l.href='/assets/'+name;l.onload=resolve;document.head.append(l);})))`);
  for(const [width,height] of [[390,844],[844,390],[768,1024],[1024,768]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});
    await evaluate(`(async()=>{localStorage.removeItem('spino.musicxml-view.${asset.sha256}');window.testAsset=${JSON.stringify(asset)};window.testViewer=await(await import('/assets/${chunk}')).openMusicScore({asset:testAsset,selection:['P'],end:8});})()`);
    await wait(`document.querySelector('.xml-score svg')`);
    assert.equal(await evaluate(`document.querySelector('.xml-score svg').textContent.includes('Long concert')`),false);
    assert.equal(await evaluate(`document.querySelector('.xml-score span')?.textContent`),'5');
    const shot=async state=>{
      if(!folder)return;
      const name=`${state}-${width}x${height}.png`,bytes=Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64');
      await writeFile(`${folder}/${name}`,bytes);results.push({state,width,height,path:name,sha256:hash(bytes)});
    };
    await shot('reading');
    await evaluate(`{document.querySelector('[data-xml=options]').click();const z=document.querySelector('[data-xml-zoom]');z.value='40';z.dispatchEvent(new Event('change',{bubbles:true}));}`);
    assert.equal(await evaluate(`document.querySelector('[data-xml-zoom]').value`),'40');
    await evaluate(`document.querySelector('[data-xml-show=names]').click()`);
    assert.equal(await evaluate(`document.querySelector('.xml-score svg').textContent.includes('Long concert')`),true);
    await shot('labels');
    await evaluate(`document.querySelector('[data-xml-show=names]').click();document.querySelector('[data-xml-show=heading]').click();document.querySelector('[data-xml-show=marks]').click()`);
    assert.equal(await evaluate(`document.querySelector('.xml-score svg').textContent.includes('Synthetic piano')`),false);
    assert.equal(await evaluate(`document.querySelector('.xml-score span')`),null);
    assert.equal(await evaluate(`testAsset.musicxmlMarks.length`),1);
    await shot('options');
    await evaluate(`testViewer.close();`);await wait(`!document.querySelector('.xml-score-viewer')`);
    await evaluate(`(async()=>{window.testViewer=await(await import('/assets/${chunk}')).openMusicScore({asset:testAsset,selection:['P'],end:8});})()`);
    await wait(`document.querySelector('.xml-score svg')`);
    await evaluate(`document.querySelector('[data-xml=options]').click()`);
    assert.equal(await evaluate(`document.querySelector('[data-xml-zoom]').value`),'40');
    assert.equal(await evaluate(`document.querySelector('[data-xml-show=heading]').checked`),false);
    await evaluate(`{document.querySelector('[data-xml-show=marks]').click();const z=document.querySelector('[data-xml-zoom]');z.value='160';z.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('[data-xml=done]').click();}`);
    assert.equal(await evaluate(`document.querySelector('.xml-score span')?.textContent`),'5');
    await shot('zoom160');
    await evaluate(`document.querySelector('[data-xml=close]').click()`);await wait(`!document.querySelector('.xml-score-viewer')`);
  }
  assert.deepEqual(errors,[]);
  if(folder){await writeFile(`${folder}/fixture.musicxml`,xml);await writeFile(`${folder}/capture.json`,JSON.stringify({date:'2026-11-08',surface:'Responsive production browser; not native-device acceptance',fixtureSha256:asset.sha256,sourceSha256:hash(await readFile('src/companion/musicxml-viewer.js')),buildSha256:hash(await readFile('dist/assets/'+chunk)),results,runtimeErrors:errors},null,2));}
});
