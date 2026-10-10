import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { drawSVG } from './score-print.js';

// Render the entire source independently of the viewer's excerpt, zoom and screen width.
export async function musicXMLPrintPages(xml, marks=[]) {
  const host=document.createElement('div');host.style.cssText='position:fixed;left:-20000px;top:0;width:794px;background:white';document.body.append(host);
  const display=new OpenSheetMusicDisplay(host,{backend:'svg',autoResize:false,pageFormat:'A4_P',drawTitle:true,drawingParameters:'default'});
  try {
    // OSMD's string loader requires an XML declaration to identify inline XML reliably.
    await display.load(xml.trimStart().startsWith('<?xml')?xml:'<?xml version="1.0"?>'+xml);display.Zoom=1;display.render();
    for(const mark of marks.filter(mark=>mark.type==='finger')){
      const [parts,m,s,e,v,n]=mark.key.split(':'),selected=new Set(parts.split(','));
      const staves=display.Sheet.Staves.filter(staff=>selected.has(staff.ParentInstrument.IdString));
      const staffIndex=display.Sheet.Staves.indexOf(staves[Number(s)]);
      const note=display.GraphicSheet.MeasureList[Number(m)]?.[staffIndex]?.staffEntries[Number(e)]?.graphicalVoiceEntries[Number(v)]?.notes[Number(n)];
      const element=note?.getSVGGElement?.(),svg=element?.closest('svg');if(!element||!svg)continue;
      const r=element.getBoundingClientRect(),base=svg.getBoundingClientRect();
      const text=document.createElementNS('http://www.w3.org/2000/svg','text'),size=720*(mark.fontSize??.025);
      for(const [key,value] of Object.entries({x:r.left-base.left-4,y:r.top-base.top-6,'font-size':size,'font-family':'system-ui','font-weight':'bold',fill:mark.color,'data-printed-finger':mark.digit}))text.setAttribute(key,String(value));
      text.textContent=mark.digit;svg.append(text);
    }
    const pages=[];
    for(const svg of host.querySelectorAll('svg')){
      const buffer=document.createElement('canvas');buffer.width=1786;buffer.height=2526;
      buffer.getContext('2d').fillStyle='#fff';buffer.getContext('2d').fillRect(0,0,buffer.width,buffer.height);
      await drawSVG(buffer,svg);pages.push({width:595.2756,height:841.8898,image:buffer.toDataURL('image/png')});buffer.width=buffer.height=0;
    }
    return pages;
  } finally { display.AutoResizeEnabled=false;display.clear();host.remove(); }
}
