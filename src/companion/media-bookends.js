import {Capacitor} from '@capacitor/core';
import {getAppLanguage} from './locale.js';
import {trimNativeRecording} from './media-trim.js';
export const BOOKENDS={introMs:3000,outroMs:2000,fadeMs:300};
export function bookendLabels(record,locale=getAppLanguage()){
  const date=new Date(record.createdAt);
  return {title:record.workTitle||record.title||'SPino',date:Number.isFinite(date.getTime())?new Intl.DateTimeFormat(locale,{dateStyle:'long'}).format(date):''};
}
export function fadeOpacity(timeMs,durationMs){return Math.max(0,Math.min(1,timeMs/BOOKENDS.fadeMs,(durationMs-timeMs)/BOOKENDS.fadeMs));}
export async function createBookendCards(record,width,height){
  const logo=new Image();logo.src=new URL('../../assets/brand/spino-symbol-512.png',import.meta.url).href;await logo.decode();
  const {title,date}=bookendLabels(record),portrait=height>width,scale=width/(portrait?720:1280);
  return ['intro','outro'].map(kind=>{
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const c=canvas.getContext('2d');c.fillStyle='#14171b';c.fillRect(0,0,width,height);c.scale(scale,scale);
    const w=width/scale,h=height/scale,intro=kind==='intro',size=intro?170:230,y=intro?(portrait?h*.223:h*.167):(h-280)/2;
    c.drawImage(logo,(w-size)/2,y,size,size);c.textAlign='center';c.fillStyle='#a8b5c9';c.font='26px Arial';c.fillText('spinoapp.com',w/2,y+size+43);
    if(intro){
      const max=w-80;c.font=`${portrait?38:54}px Georgia`;const words=title.split(/\s+/),lines=[];let line='';
      for(const word of words){const next=line?line+' '+word:word;if(line&&c.measureText(next).width>max){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
      const top=portrait?h*.46:h*.54,lineHeight=portrait?48:62;const blockScale=Math.min(1,(h-top-70)/(Math.max(1,lines.length)*lineHeight+60));c.save();c.translate(w/2,top);c.scale(blockScale,blockScale);c.translate(-w/2,-top);c.fillStyle='#f3f4f7';
      lines.forEach((line,i)=>c.fillText(line,w/2,top+i*lineHeight,max));c.fillStyle='#a8b5c9';c.font='25px Arial';c.fillText(date,w/2,top+lines.length*lineHeight+32,max);c.restore();
    }
    return canvas;
  });
}
export async function exportRecording(record,options={}){
  if(record.kind!=='video')return record;
  if(!Number.isFinite(record.durationMs)||record.durationMs<200)throw Error('Invalid recording duration.');
  const range={startMs:0,endMs:record.durationMs,durationMs:record.durationMs};
  const opts={...options,bookends:bookendLabels(record)};
  const blob=Capacitor.getPlatform()==='android'&&Capacitor.isPluginAvailable('MediaTrim')
    ?await trimNativeRecording(record,range,opts)
    :await (await import('./media-trim-browser.js')).trimBrowserRecording(record,range,opts);
  return {...record,blob,durationMs:record.durationMs+BOOKENDS.introMs+BOOKENDS.outroMs};
}
