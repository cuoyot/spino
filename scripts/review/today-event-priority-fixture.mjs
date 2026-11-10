import {emptyData,validateData} from '../../src/companion/model.js';

export const REVIEW_NOW='2026-11-10T10:00:00.000Z';
export function todayEventPriorityFixture({concert=false}={}) {
  const data=emptyData();
  data.preferences.language='es';data.preferences.theme='light';
  const event=(id,title,type,date,time)=>({id,title,type,date,time,place:'',notes:'',workIds:[],reminder:false,milestones:[]});
  data.events=[
    {...event('review-lessons','Weekly piano lesson','Clase','2026-11-10','15:30'),recurrence:{id:'review-lessons',frequency:'weekly',rule:true,until:null,excluded:[]}},
    event('review-audition','Audicion de nadal','Audición','2026-12-17','18:00'),
  ];
  if(concert)data.events.push(
    event('review-concert','Winter concert','Concierto','2026-12-05','19:00'),
    event('review-later-concert','Spring concert','Concierto','2027-03-01','19:00'),
    event('review-later-audition','Spring audition','Audición','2027-03-15','18:00'),
    ...['Ensayo','Otro'].flatMap((type,index)=>[1,2,3].map(day=>event(`review-secondary-${index}-${day}`,`${type} ${day}`,type,`2026-11-${10+day}`,'17:00'))),
  );
  return validateData(data);
}
