import test from 'node:test';
import assert from 'node:assert/strict';
import {readMediaWifiOnly,saveMediaWifiOnly} from '../src/companion/media-network.js';

test('recording network permission initially inherits the existing policy and then remains device-local',()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  assert.equal(readMediaWifiOnly(true,storage),true);
  assert.equal(readMediaWifiOnly(false,storage),false);
  saveMediaWifiOnly(false,storage);
  assert.equal(readMediaWifiOnly(true,storage),false);
  saveMediaWifiOnly(true,storage);
  assert.equal(readMediaWifiOnly(false,storage),true);
  assert.equal(readMediaWifiOnly(true,{getItem:()=>'{invalid'}),true);
  assert.equal(readMediaWifiOnly(false,{getItem:()=>'{"wifiOnly":"false"}'}),false);
});
