// Deterministic virtual cameras for disposable browser review. No device access.
export const syntheticCameraSource = `
window.cameraRequests=[];window.cameraTracks=[];window.cameraReject=false;
Object.defineProperty(navigator.mediaDevices,'enumerateDevices',{configurable:true,value:async()=>[
 {kind:'videoinput',deviceId:'front',label:'Synthetic camera · hardware controls'},
 {kind:'videoinput',deviceId:'rear',label:'Synthetic camera · digital controls'}
]});
Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async constraints=>{
 cameraRequests.push(constraints);
 const deviceId=constraints.video.deviceId?.exact||'front',hardware=deviceId==='front';
 const source=document.createElement('canvas');source.width=1920;source.height=1080;
 const s=source.getContext('2d');s.fillStyle='#b02020';s.fillRect(0,0,1920,1080);
 s.fillStyle='#505050';s.fillRect(80,80,1760,920);
 s.fillStyle='#f5eee4';s.fillRect(220,600,1480,320);
 for(let n=0;n<18;n++){s.strokeStyle='#444';s.strokeRect(220+n*82,600,82,320);if(n%7!==2&&n%7!==6){s.fillStyle='#191919';s.fillRect(275+n*82,600,35,180);}}
 for(const [x,y,color] of [[0,0,'#f02020'],[1760,0,'#20e020'],[1760,920,'#e0e020'],[0,920,'#2020e0']]){s.fillStyle=color;s.fillRect(x,y,160,160);}
 const canvas=document.createElement('canvas');canvas.width=window.cameraPortraitSensor?1080:1920;canvas.height=window.cameraPortraitSensor?1920:1080;
 const ctx=canvas.getContext('2d'),settings={deviceId,zoom:hardware?3:1,exposureMode:'continuous',exposureTime:100,iso:200};
 const paint=()=>{const z=hardware?settings.zoom:1;ctx.drawImage(source,(1920-1920/z)/2,(1080-1080/z)/2,1920/z,1080/z,0,0,canvas.width,canvas.height);};paint();const timer=setInterval(paint,33);
 const track=canvas.captureStream(30).getVideoTracks()[0],originalSettings=track.getSettings.bind(track),originalStop=track.stop.bind(track);
 track.getSettings=()=>({...originalSettings(),...settings});
 track.getCapabilities=()=>hardware?{zoom:{min:1,max:4,step:.1},exposureMode:['continuous','manual'],exposureTime:{min:1,max:1000},iso:{min:50,max:1600}}:{};
 track.applyConstraints=async c=>{if(cameraReject)throw new DOMException('Synthetic setting rejected','OverconstrainedError');Object.assign(settings,c.advanced?.[0]||{});paint();};
 track.stop=()=>{clearInterval(timer);originalStop();};cameraTracks.push(track);
 return new MediaStream([track]);
}});
`;
