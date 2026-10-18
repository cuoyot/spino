import test from 'node:test';
import assert from 'node:assert/strict';
import {createCameraControls,cameraFrameRect,cameraVideoConstraints} from '../src/companion/camera-controls.js';

test('camera resets inherited zoom and freezes current exposure time and ISO',async()=>{
  const settings={zoom:3,exposureMode:'continuous',exposureTime:120,iso:200},calls=[];
  const controls=await createCameraControls({getCapabilities:()=>({zoom:{min:.5,max:8,step:.1},exposureMode:['manual','continuous'],exposureTime:{min:1,max:1000},iso:{min:50,max:1600}}),getSettings:()=>({...settings}),applyConstraints:async c=>{calls.push(c);Object.assign(settings,c.advanced[0]);}});
  assert.equal(controls.state.zoom,1);assert.equal(settings.zoom,1);
  await controls.setZoom(.5);assert.equal(settings.zoom,.5);
  await controls.setLocked(true);assert.deepEqual(calls.at(-1).advanced[0],{exposureMode:'manual',exposureTime:120,iso:200});assert.equal(controls.state.locked,true);
  await controls.setLocked(false);assert.equal(settings.exposureMode,'continuous');
});
test('unsupported hardware offers bounded digital zoom and fixed image brightness without pretending to lock exposure',async()=>{
  const controls=await createCameraControls({getSettings:()=>({})});
  assert.equal(controls.state.canLock,false);assert.equal(controls.state.hardwareZoom,false);
  await controls.setZoom(100);assert.equal(controls.state.zoom,4);
  await controls.setZoom(-1);assert.equal(controls.state.zoom,1);
  controls.setBrightness(125);assert.equal(controls.state.brightness,125);
  await assert.rejects(controls.setLocked(true));
});
test('rejected and silently ignored hardware settings never report success',async()=>{
  const settings={zoom:2,exposureTime:50,exposureMode:'continuous'};
  const track={getCapabilities:()=>({zoom:{min:1,max:4},exposureMode:['manual','continuous'],exposureTime:{min:1,max:100}}),getSettings:()=>settings,applyConstraints:async()=>{}};
  const controls=await createCameraControls(track);
  assert.equal(controls.state.zoom,2);await assert.rejects(controls.setZoom(3));await assert.rejects(controls.setLocked(true));assert.equal(controls.state.locked,false);
  track.applyConstraints=async()=>{throw Error('busy');};await assert.rejects(controls.setZoom(1));assert.equal(controls.state.zoom,2);
});
test('portrait encoding preserves a landscape camera field of view at 1×; digital zoom crops symmetrically',()=>{
  const full=cameraFrameRect(1920,1080,1080,1920);
  assert.deepEqual(full.slice(0,4),[0,0,1920,1080]);assert.equal(full[4],0);assert.equal(full[6],1080);assert.ok(full[5]>0);
  assert.deepEqual(cameraFrameRect(1920,1080,1080,1920,2).slice(0,4),[480,270,960,540]);
  const constraints=cameraVideoConstraints();assert.equal(constraints.width.ideal,1920);assert.equal(constraints.resizeMode.ideal,'none');assert.equal(constraints.aspectRatio,undefined);
});
