import {emptyData, localDate, addDays, block, beginSession, saveSession} from '../../src/companion/model.js';

export function eventDetailFixture() {
  const data=emptyData();
  data.preferences={...data.preferences,language:'es',theme:'light',name:'Alex'};
  data.works=[['review-ballade','Balada Para Adelina','Paul de Senneville'],['review-elise','FÜR ELISE','Ludwig van Beethoven']].map(([id,title,composer])=>({id,title,composer,onStand:true,stage:'En estudio',tags:[],notes:'',passage:'',bpm:60,target:null}));
  for (const [index,minutes] of [95,42].entries()) {
    const active=beginSession({title:'Repertoire practice',context:'piano',blocks:[block('repertoire',{workId:data.works[index].id,minutes})]});
    active.elapsedMs=active.blockElapsedMs=minutes*60000;
    saveSession(data,active,{title:'Repertoire practice',workIds:[data.works[index].id]});
  }
  data.events=[{id:'review-audition',title:'Audicion de nadal',type:'Audición',date:addDays(localDate(),41),time:'18:00',place:'',notes:'',workIds:data.works.map(w=>w.id),reminder:false,milestones:['Primera lectura','Resolver pasajes','Tocar de principio a fin','Simular la actuación'].map((title,i)=>({title,done:i>0}))}];
  data.active=beginSession({title:'Práctica libre',context:'piano',blocks:[block('free',{minutes:10})]});
  data.active.elapsedMs=data.active.blockElapsedMs=60000;
  data.active.runningSince=null;
  return data;
}
