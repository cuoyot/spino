import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Capacitor } from '@capacitor/core';
import { downloadScore } from '../src/companion/score-transfer.js';
import { downloadPDF } from '../src/companion/platform.js';
import { createDownloads } from '../src/companion/downloads.js';
import { downloadMarkup } from '../src/companion/download-view.js';
import { emptyData } from '../src/companion/model.js';
import { CATALOG } from '../src/companion/catalog.js';
const url='https://raw.githubusercontent.com/musetrainer/library/'+'a'.repeat(40)+'/scores/test.xml';

test('iOS ignores saved Wi-Fi-only preference for XML and PDF transfers and hides the toggle', async t => {
  const originalPlatform=Capacitor.getPlatform, originalFetch=globalThis.fetch;
  Capacitor.getPlatform=()=> 'ios';t.after(()=>{Capacitor.getPlatform=originalPlatform;globalThis.fetch=originalFetch;});
  const data=emptyData();assert.equal(data.preferences.wifiOnly,true);assert.doesNotMatch(downloadMarkup(data,false),/id="wifi-only"/);
  const receipt=await downloadScore(url,{wifiOnly:true,network:async()=>({online:true,wifi:null,metered:true}),fetcher:async()=>new Response('<score-partwise/>')});assert.equal(receipt.complete,true);
  globalThis.fetch=async()=>new Response('%PDF-1.4\n%%EOF');assert.ok((await downloadPDF(url,{wifiOnly:true})).startsWith('JVBERi0'));
  let policy;
  const manager=createDownloads({getData:()=>data,persist:async()=>{},changed:()=>{},isVisible:()=>true,store:{asset:async()=>null,commitAsset:async()=>{}},platform:{networkStatus:async()=>({online:true,wifi:null,metered:true}),downloadPDF:async(_,options)=>{policy=options.wifiOnly;return btoa('%PDF-1.4\n%%EOF');}}});
  await manager.enqueue(CATALOG[0].id);assert.equal(data.downloadJobs[0].status,'complete');assert.equal(policy,false);assert.equal(data.preferences.wifiOnly,true);
});

test('Android keeps the Wi-Fi policy and offline iOS does not start transfers', async t => {
  const original=Capacitor.getPlatform;t.after(()=>{Capacitor.getPlatform=original;});
  Capacitor.getPlatform=()=> 'android';assert.match(downloadMarkup(emptyData(),true),/id="wifi-only"/);
  const blocked=await downloadScore(url,{wifiOnly:true,network:async()=>({online:true,wifi:null,metered:false}),fetcher:async()=>{throw Error('Must not download');}});assert.match(blocked.error,/WIFI_REQUIRED/);
  Capacitor.getPlatform=()=> 'ios';const offline=await downloadScore(url,{network:async()=>({online:false,wifi:null}),fetcher:async()=>{throw Error('Must not download');}});assert.match(offline.error,/Offline/);
});
