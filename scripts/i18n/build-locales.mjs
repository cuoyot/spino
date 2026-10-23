// Deterministic compilation of directly authored German and Hungarian UI copy.
import {readFile,writeFile} from 'node:fs/promises';
const dictionaries={de:{},hu:{}};
for(const [index,line] of (await readFile('scripts/i18n/new-languages.txt','utf8')).trim().split('\n').entries()){
 const values=line.split('|');if(values.length!==3)throw Error(`Invalid copy row ${index+1}`);
 const [source,de,hu]=values;
 for(const [lang,translation] of Object.entries({de,hu})){
  const tokens=s=>[...s.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort().join(',');
  if(tokens(source)!==tokens(translation))throw Error(`Placeholders changed: ${lang}: ${source}`);
  dictionaries[lang][source]=translation;
 }
}
for(const [lang,copy] of Object.entries(dictionaries))await writeFile(`src/companion/locale-${lang}.json`,JSON.stringify(copy,null,2)+'\n');
console.log(Object.keys(dictionaries.de).length+' entries per language');
