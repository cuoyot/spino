import { emptyData, STAGES, validateBackup } from '../../src/companion/model.js';
import { scorePDF } from '../../tests/pdf-fixture.js';
import { WARMUP_DEFAULTS } from '../../src/companion/warmups.js';

export function cloudRecoveryFixture(language = 'es') {
  const data = emptyData();
  data.preferences = { ...data.preferences, language, name: 'Synthetic sync review', theme: 'light', warmup: { ...WARMUP_DEFAULTS, enabled: false } };
  data.works = [{ id: 'synthetic-work', title: 'Synthetic score', composer: '', stage: STAGES[0], target: null, bpm: 60, passage: '', notes: 'Preserve this local note.', assetId: 'synthetic-pdf', assetFormat: 'pdf' }];
  const assets = [{ id: 'synthetic-pdf', name: 'Synthetic score.pdf', type: 'application/pdf', base64: scorePDF(), annotations: { version: 1, marks: [{ id: 'synthetic-mark', page: 1, type: 'fingering', color: '#2878c8', width: .002, points: [{ x: .2, y: .3 }], text: '3' }] } }];
  const fixture = { format: 'cuaderno-piano', version: 1, data, assets, ...(language === 'ca' ? {legacy:{'sr.settings':JSON.stringify({clef:'treble',lang:'ca'})}} : {}), cloudBackup: { sharedNotebookId: '713f8775-9831-4e98-957e-d53ad5ff8807' } };
  // A real acknowledged baseline contains the validator's normalized reader settings.
  return language === 'ca' ? validateBackup(JSON.stringify(fixture)) : fixture;
}

// Synthetic provider only; no installed notebook or actual provider file is touched.
export function cloudRecoveryBootstrap(mode = 'missing') {
  const fixture = cloudRecoveryFixture(['catalan','join-catalan'].includes(mode) ? 'ca' : 'es');
  return `{
    const fixture=${JSON.stringify(fixture)};
    window.__cloudReview={mode:${JSON.stringify(mode)},statusCalls:0,reads:0,writes:0,picks:0,linked:${mode !== 'join-catalan'},text:JSON.stringify(fixture)};
    window.CapacitorCustomPlatform={name:'android'};
    window.Capacitor={PluginHeaders:[{name:'CloudBackup',methods:[...['status','readLinked','write','saveRecovery','pickBackup','acknowledgeSetup','disconnect'].map(name=>({name,rtype:'promise'})),{name:'addListener'},{name:'removeListener'}]}],
      nativeCallback:()=> 'synthetic-listener',
      nativePromise:async(plugin,method,args)=>{
        const state=window.__cloudReview;
        if(method==='status'){state.statusCalls++;return {linked:state.linked,mode:'sync',name:'Synthetic-shared.json'};}
        if(method==='readLinked'){
          state.reads++;
          if(state.mode==='stalled')await new Promise(resolve=>state.release=resolve);
          if(state.mode==='missing')throw Object.assign(Error('Shared notebook could not be read: No content provider: content://com.google.android.apps.docs.storage/document/synthetic'),{code:'PROVIDER_ERROR'});
          return {text:state.text};
        }
        if(method==='write'){state.writes++;state.text=args.text;return {providerAccepted:true};}
        if(method==='disconnect'){state.linked=false;return {};}
        if(method==='pickBackup'){state.picks++;state.pickOptions=args;if(state.cancelPick)return {cancelled:true};if(state.failPick)throw Error('Synthetic file provider unavailable');state.mode='ok';state.linked=true;return {text:state.text,name:'Synthetic-shared.json'};}
        return {};
      }};
    window.__cloudReady=(async()=>{
      if(sessionStorage.getItem('cloud-recovery-seeded'))return;
      if(__cloudReview.linked)localStorage.setItem('spino.cloud-sync.device.v1',JSON.stringify({mode:'sync',enabled:true,status:'saved',name:'Synthetic-shared.json',notebookId:fixture.cloudBackup.sharedNotebookId}));
      await new Promise((resolve,reject)=>{const q=indexedDB.open('cuaderno-piano',1);q.onupgradeneeded=()=>{q.result.createObjectStore('state');q.result.createObjectStore('assets',{keyPath:'id'});};q.onsuccess=()=>{const db=q.result,tx=db.transaction(['state','assets'],'readwrite');tx.objectStore('state').put(fixture.data,'current');tx.objectStore('state').put(fixture,'cloud-sync-base-v1');for(const asset of fixture.assets)tx.objectStore('assets').put(asset);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};q.onerror=()=>reject(q.error);});
      sessionStorage.setItem('cloud-recovery-seeded','1');
    })();
  }`;
}
