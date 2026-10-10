import { PDFDocument } from 'pdf-lib';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { ui } from './locale.js';

const Printer = registerPlugin('ScorePrinter');
export async function drawSVG(canvas, svg) {
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
  try { const image=new Image();image.src=url;await image.decode();canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height); }
  finally { URL.revokeObjectURL(url); }
}
export async function scorePDF(pages) {
  const pdf=await PDFDocument.create();
  for(const page of pages){const image=await pdf.embedPng(page.image);pdf.addPage([page.width,page.height]).drawImage(image,{x:0,y:0,width:page.width,height:page.height});}
  return pdf.save();
}
export async function printScore(pages, title='Score') {
  if(!pages.length)throw new Error('No printable pages.');
  if(Capacitor.isPluginAvailable('ScorePrinter')){
    const bytes=await scorePDF(pages);let binary='';
    for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
    await Printer.print({base64:btoa(binary),title});return;
  }
  const frame=document.createElement('iframe');frame.title=ui('Print score','Imprimir partitura');frame.style.cssText='position:fixed;width:1px;height:1px;left:-10000px;border:0';
  document.body.append(frame);
  const doc=frame.contentDocument;doc.open();doc.write('<!doctype html><html><head><title></title></head><body></body></html>');doc.close();doc.title=title;
  const style=doc.createElement('style');style.textContent='html,body{margin:0;padding:0}img{display:block;break-after:page}img:last-child{break-after:auto}'+pages.map((p,i)=>`@page score${i}{size:${p.width}pt ${p.height}pt;margin:0}`).join('');doc.head.append(style);
  for(const [i,p] of pages.entries()){const image=doc.createElement('img');image.src=p.image;image.style.cssText=`page:score${i};width:${p.width}pt;height:${p.height}pt`;doc.body.append(image);}
  const cleanup=()=>frame.remove();
  frame.contentWindow.addEventListener('afterprint',cleanup,{once:true});
  try { await Promise.all([...doc.images].map(image=>image.decode()));frame.contentWindow.focus();frame.contentWindow.print(); }
  catch(error){cleanup();throw error;}
  // Some mobile browsers never emit afterprint. Retain the document long enough for their print service.
  setTimeout(cleanup,300000);
}
