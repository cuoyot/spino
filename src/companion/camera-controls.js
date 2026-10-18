// Camera settings belong to the current track/take, never to the shared notebook.
const range = value => !!value && Number.isFinite(value.min) && Number.isFinite(value.max) && value.max > value.min;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const cameraVideoConstraints = () => ({width:{ideal:1920},height:{ideal:1080},frameRate:{ideal:30,max:30},resizeMode:{ideal:'none'}});

export async function createCameraControls(track) {
  const capabilities = track.getCapabilities?.() || {};
  let settings = track.getSettings?.() || {};
  const hardwareZoom = range(capabilities.zoom) && typeof track.applyConstraints === 'function';
  const state = {
    hardwareZoom, minZoom:hardwareZoom?capabilities.zoom.min:1,
    maxZoom:hardwareZoom?capabilities.zoom.max:4, zoomStep:hardwareZoom?(capabilities.zoom.step||.1):.1,
    zoom:hardwareZoom?(settings.zoom??capabilities.zoom.min):1, brightness:100,
    canLock:typeof track.applyConstraints==='function' && capabilities.exposureMode?.includes('manual') && capabilities.exposureMode?.includes('continuous') && Number.isFinite(settings.exposureTime) && range(capabilities.exposureTime) || false,
    locked:settings.exposureMode==='manual',
  };
  const setZoom = async value => {
    const requested=clamp(state.minZoom+Math.round((Number(value)-state.minZoom)/state.zoomStep)*state.zoomStep,state.minZoom,state.maxZoom);
    if(state.hardwareZoom){
      await track.applyConstraints({advanced:[{zoom:requested}]});
      settings=track.getSettings();
      if(Number.isFinite(settings.zoom))state.zoom=settings.zoom;
      if(!Number.isFinite(settings.zoom)||Math.abs(settings.zoom-requested)>Math.max(state.zoomStep/2,.001))throw Error('Zoom unavailable');
    }else state.zoom=requested;
  };
  // Remove inherited digital magnification without choosing an ultra-wide lens for the user.
  if(hardwareZoom){try{await setZoom(clamp(1,state.minZoom,state.maxZoom));}catch{/* Keep the actual setting if the device rejects the reset. */}}
  return {
    state, setZoom,
    setBrightness(value){state.brightness=clamp(Number(value),50,150);},
    async setLocked(locked){
      if(!state.canLock)throw Error('Exposure lock unavailable');
      settings=track.getSettings();
      const constraint={exposureMode:locked?'manual':'continuous'};
      if(locked){
        if(!Number.isFinite(settings.exposureTime))throw Error('Exposure time unavailable');
        constraint.exposureTime=settings.exposureTime;
        if(range(capabilities.iso)&&Number.isFinite(settings.iso))constraint.iso=settings.iso;
      }
      await track.applyConstraints({advanced:[constraint]});
      settings=track.getSettings();state.locked=settings.exposureMode==='manual';
      if(state.locked!==locked)throw Error('Exposure mode unchanged');
    },
  };
}

export function cameraFrameRect(sourceWidth,sourceHeight,width,height,zoom=1) {
  const sw=sourceWidth/zoom,sh=sourceHeight/zoom,scale=Math.min(width/sw,height/sh);
  return [(sourceWidth-sw)/2,(sourceHeight-sh)/2,sw,sh,(width-sw*scale)/2,(height-sh*scale)/2,sw*scale,sh*scale];
}
