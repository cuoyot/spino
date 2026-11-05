import { emptyData, beginSession, block } from '../../src/companion/model.js';
import { scorePDF } from '../../tests/pdf-fixture.js';
export function flexiblePracticeFixture() {
 const data=emptyData();data.preferences.language='en';data.preferences.theme='light';
 data.works=[{id:'synthetic-bach',title:'Invention No. 1',composer:'J. S. Bach',stage:'En estudio',notes:'',passage:'Bars 5–12 · hands together',target:null,bpm:60,assetId:'synthetic-pdf-bach'},{id:'synthetic-satie',title:'Gymnopédie No. 1',composer:'Erik Satie',stage:'En estudio',notes:'',passage:'Opening · left-hand balance',target:null,bpm:60,assetId:'synthetic-pdf-satie'}];
 data.active=beginSession({title:'Afternoon practice',context:'piano',blocks:[block('warmup',{id:'synthetic-warmup',target:'hanon-1',exercises:['hanon-1'],hand:'both',minutes:5}),...data.works.map((work,i)=>block('repertoire',{id:i?'synthetic-satie-block':'synthetic-bach-block',workId:work.id,minutes:i?10:15,passage:work.passage}))]});
 Object.assign(data.active,{id:'synthetic-flexible-session',flexibleBlocks:true,blockIndex:1,elapsedMs:780000,blockElapsedMs:480000,blockRuntime:[{blockId:'synthetic-warmup',context:'piano',elapsedMs:300000,measurement:null,readerSnapshot:null}]});
 const assets=data.works.map(work=>({id:work.assetId,name:work.title+'.pdf',type:'application/pdf',base64:scorePDF(),annotations:{version:1,marks:[{id:'synthetic-mark-'+work.id,page:1,type:'fingering',color:'#2878c8',width:.002,points:[{x:.25,y:.3}],text:'3',fontSize:.025}]}}));
 return {data,assets};
}
