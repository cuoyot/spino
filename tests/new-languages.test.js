import {test} from 'node:test';
import assert from 'node:assert/strict';
import {APP_LANGUAGES,setAppLanguage,localize,localizeMessage} from '../src/companion/locale.js';
import {EXTRA_COPY,extraCopy} from '../src/companion/locale-extra.js';
import {emptyData,validateData} from '../src/companion/model.js';
import {identityMarkup} from '../src/companion/profile-view.js';
import {languageForLocale,setLanguage,t} from '../src/i18n.js';
import {COPY,page} from '../scripts/site/build-site.mjs';
import {sitemap} from '../scripts/site/seo.mjs';

test('German and Hungarian persist while notebook IDs and original content remain intact',()=>{
 const data=emptyData();data.works.push({id:'private-id',title:'My original musical title',composer:'Béla Bartók',stage:'En estudio',notes:'Private notes',passage:'Private passage',bpm:80,target:null});
 for(const [lang,label] of [['de','Sprache'],['hu','Nyelv']]){
  data.preferences.language=lang;assert.equal(validateData(data).preferences.language,lang);setAppLanguage(lang);
  const markup=identityMarkup(data.preferences,lang);
  assert.ok(markup.includes(label));assert.match(markup,new RegExp(`value="${lang}" selected`));
  assert.notEqual(localize('Practice','Práctica'), 'Practice');
  assert.equal(data.works[0].id,'private-id');assert.equal(data.works[0].title,'My original musical title');
  assert.equal(localizeMessage('Béla Bartók · My original musical title',lang),'Béla Bartók · My original musical title');
  assert.notEqual(localizeMessage('El archivo no es un PDF válido.',lang),'El archivo no es un PDF válido.');
 }
 setAppLanguage('en');
});

test('new dictionaries preserve interpolation, markup attributes and unknown user values',()=>{
 for(const [lang,copy] of Object.entries(EXTRA_COPY)){
  for(const [source,value] of Object.entries(copy)){
   const tokens=s=>[...s.matchAll(/\{\w+\}/g)].map(m=>m[0]).sort();
   assert.deepEqual(tokens(value),tokens(source),`${lang}: ${source}`);
  }
  assert.ok(extraCopy('Block 7 of 11',lang).includes('11'));
  assert.ok(extraCopy('<label>Title<input name="title" value="My original title"></label>',lang).includes('value="My original title"'));
  assert.equal(extraCopy('My original title',lang),'My original title');
 }
});

test('reader follows regional German and Hungarian locales',()=>{
 globalThis.document={documentElement:{lang:''}};
 try{for(const lang of ['de','hu']){assert.equal(languageForLocale(lang+'-'+lang.toUpperCase()),lang);setLanguage(lang);assert.notEqual(t('settings'),'Settings');assert.equal(document.documentElement.lang,lang);assert.ok(!t('lineDone',{ok:3,total:4}).includes('{'));}}
 finally{delete globalThis.document;}
});

test('new website routes have localized navigation, metadata and no nonexistent Arcade alternates',()=>{
 for(const lang of ['de','hu']){
  const html=page(COPY[lang]);assert.ok(html.includes(`<html lang="${lang}">`));
  assert.ok(html.includes(`https://spinoapp.com/${lang}/`));assert.ok(!html.includes('undefined'));
  assert.ok(html.includes(APP_LANGUAGES[lang]));
 }
 const xml=sitemap();assert.ok(xml.includes('https://spinoapp.com/de/'));assert.ok(xml.includes('https://spinoapp.com/hu/'));assert.ok(!xml.includes('/arcade/de/'));assert.ok(!xml.includes('/arcade/hu/'));
});

test('all known persisted diagnostic messages have German and Hungarian copy',async()=>{
 const {MESSAGE_PAIRS}=await import('../src/companion/locale-messages.js');
 for(const [source]of MESSAGE_PAIRS)for(const lang of ['de','hu'])assert.notEqual(localizeMessage(source,lang),source,`${lang}: ${source}`);
});

test('long practice durations use German and Hungarian hour labels',async()=>{
 const {formatProgressDuration}=await import('../src/companion/progress-duration.js');
 try{setAppLanguage('de');assert.equal(formatProgressDuration(90*60000),'1 Std. 30 min');setAppLanguage('hu');assert.equal(formatProgressDuration(90*60000),'1 óra 30 perc');}finally{setAppLanguage('en');}
});
