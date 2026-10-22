import {escapeHTML as esc} from './views.js';
import {getAppLanguage} from './locale.js';

export function driveRecoveryCopy(lang=getAppLanguage()){
 return ({
  en:{rename:'Rename Drive notebook',name:'Notebook name',save:'Save name',cancel:'Cancel',help:'Renames this connected notebook in Drive. History, scores, recordings and other copies are kept.',export:'Save a local copy',sessions:'Saved sessions',week:'Practice this week',last:'Latest practice',works:'Works',goal:'Weekly goal',unique:'Sessions absent from the other copies',none:'None',unavailable:'Contents could not be checked. Retry before choosing.',choose:'Compare the contents before selecting a notebook. Nothing is connected until you confirm.',reference:'Drive file'},
  es:{rename:'Cambiar nombre del cuaderno de Drive',name:'Nombre del cuaderno',save:'Guardar nombre',cancel:'Cancelar',help:'Cambia el nombre de este cuaderno conectado en Drive. Se conservan el historial, las partituras, las grabaciones y las otras copias.',export:'Guardar una copia local',sessions:'Sesiones guardadas',week:'Práctica esta semana',last:'Última práctica',works:'Obras',goal:'Objetivo semanal',unique:'Sesiones que no están en las otras copias',none:'Ninguna',unavailable:'No se ha podido comprobar el contenido. Reintenta antes de elegir.',choose:'Compara el contenido antes de elegir un cuaderno. No se conecta nada hasta que confirmes.',reference:'Archivo de Drive'},
  ca:{rename:'Canvia el nom del quadern de Drive',name:'Nom del quadern',save:'Desa el nom',cancel:'Cancel·la',help:'Canvia el nom d’aquest quadern connectat a Drive. Es conserven l’historial, les partitures, les gravacions i les altres còpies.',export:'Desa una còpia local',sessions:'Sessions desades',week:'Pràctica aquesta setmana',last:'Darrera pràctica',works:'Obres',goal:'Objectiu setmanal',unique:'Sessions que no són a les altres còpies',none:'Cap',unavailable:'No s’ha pogut comprovar el contingut. Torna-ho a provar abans de triar.',choose:'Compara el contingut abans de triar un quadern. No es connecta res fins que ho confirmis.',reference:'Fitxer de Drive'}
 })[lang]||driveRecoveryCopy('en');
}
export function driveRenameMarkup(name,lang=getAppLanguage()){
 const t=driveRecoveryCopy(lang);
 return `<form data-drive-rename><p>${esc(t.help)}</p><label>${esc(t.name)}<input name="name" value="${esc(name.replace(/\.json$/i,''))}" maxlength="200" required autocomplete="off"></label><div class="cp-actions"><button type="button" data-action="close-dialog">${esc(t.cancel)}</button><button type="submit" class="primary">${esc(t.save)}</button></div></form>`;
}
export function driveComparisonMarkup(file,files,lang=getAppLanguage(),now=new Date()){
 const t=driveRecoveryCopy(lang),s=file.summary;
 const reference=`<small>${esc(t.reference)}: <span style="overflow-wrap:anywhere">${esc(file.id)}</span></small>`;
 if(!s)return reference+(file.previewError?`<small role="status">${esc(t.unavailable)}</small>`:'');
 const day=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate());monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
 const start=day(monday),end=day(now),sessions=s.sessions||[],week=sessions.filter(v=>v.date>=start&&v.date<=end).reduce((n,v)=>n+v.elapsedMs,0);
 const dates=sessions.map(v=>v.date).filter(Boolean).sort(),others=files.filter(f=>f.id!==file.id);
 const ids=new Set(others.flatMap(f=>(f.summary?.sessions||[]).map(v=>v.id)));
 const rows=[[t.sessions,sessions.length],[t.week,Math.round(week/60000)+' min'],[t.last,dates.at(-1)||t.none],[t.works,s.works],[t.goal,s.weeklyMinutes+' min']];
 if(others.length&&others.every(f=>f.summary))rows.push([t.unique,sessions.filter(v=>!ids.has(v.id)).length]);
 return reference+rows.map(([label,value])=>`<small>${esc(label)}: <strong>${esc(String(value))}</strong></small>`).join('');
}
