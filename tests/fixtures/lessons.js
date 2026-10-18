import {emptyData,localDate} from '../../src/companion/model.js';
export function lessonFixture(theme='light'){
 const data=emptyData();Object.assign(data.preferences,{language:'es',theme});
 data.works=[{id:'score-a',title:'Prélude — synthetic review',composer:'Example composer',stage:'En estudio',notes:'Preserve score notes',passage:'',target:null,bpm:60}];
 const date=localDate();data.events=[{id:'review-lesson',type:'Clase',date,time:'18:00',title:'Clase con profesor',place:'Studio',notes:'Preparar digitación y pedal',workIds:['score-a'],reminder:false,milestones:[],recurrence:{id:'review-lesson',frequency:'weekly',until:null,rule:true,excluded:[]}}];
 return data;
}
