const key='spino.media-network.device.v1';

// Keep recording network permission on this device, outside the shared notebook.
export function readMediaWifiOnly(fallback=true,storage=localStorage){
  try{const value=JSON.parse(storage.getItem(key)||'null');if(typeof value?.wifiOnly==='boolean')return value.wifiOnly;}catch{}
  return fallback!==false;
}
export function saveMediaWifiOnly(wifiOnly,storage=localStorage){
  storage.setItem(key,JSON.stringify({wifiOnly:!!wifiOnly}));
}
