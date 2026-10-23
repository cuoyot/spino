// Translate supplied UI copy only. User text and persistent identifiers stay intact.
import german from './locale-de.json' with { type: 'json' };
import hungarian from './locale-hu.json' with { type: 'json' };
export const EXTRA_COPY = { de: german, hu: hungarian };
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const templates = Object.fromEntries(Object.entries(EXTRA_COPY).map(([lang,copy])=>[lang,Object.entries(copy).filter(([key])=>key.includes('{')).map(([key,translation])=>({
 pattern:new RegExp('^'+key.split(/\{\w+\}/).map(escapePattern).join('([\\s\\S]*?)')+'$'),
 names:[...key.matchAll(/\{(\w+)\}/g)].map(match=>match[1]),translation,
}))]));
export function extraCopy(value, lang) {
 const copy=EXTRA_COPY[lang];
 if(!copy)return value;
 if(Array.isArray(value))return value.join(',')==='M,T,W,T,F,S,S'?(lang==='de'?['Mo','Di','Mi','Do','Fr','Sa','So']:['H','K','Sze','Cs','P','Szo','V']):value.map(item=>extraCopy(item,lang));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,extraCopy(item,lang)]));
 if(typeof value!=='string')return value;
 if(Object.hasOwn(copy,value))return copy[value];
 const trimmed=value.trim();
 if(trimmed&&Object.hasOwn(copy,trimmed))return value.replace(trimmed,copy[trimmed]);
 for(const {pattern,names,translation} of templates[lang]) {
  const match=value.match(pattern);
  if(match)return translation.replace(/\{(\w+)\}/g,(_,name)=>match[names.indexOf(name)+1]??'');
 }
 // HTML here is trusted supplied copy, never a post-render pass over user content.
 if(/<[^>]*>/.test(value))return value.split(/(<[^>]*>)/g).map(part=>part.startsWith('<')?part.replace(/(placeholder|aria-label|title)="([^"]*)"/g,(_,attr,text)=>`${attr}="${extraCopy(text,lang)}"`):extraCopy(part,lang)).join('');
 return value;
}
