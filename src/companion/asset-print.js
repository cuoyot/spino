import { printScore } from './score-print.js';

export async function printScoreAsset(asset,title='Score') {
  if(!asset)throw new Error('Score unavailable');
  let pages;
  if(asset.format==='musicxml'||asset.format==='mxl'){
    const {readMusicXML,bytesFromBase64}=await import('./musicxml-document.js');
    const {digest}=await import('./library.js');const bytes=bytesFromBase64(asset.base64);
    if(await digest(bytes)!==asset.sha256)throw new Error('Score hash mismatch');
    const {musicXMLPrintPages}=await import('./musicxml-print.js');pages=await musicXMLPrintPages(readMusicXML(bytes,asset.format).xml,asset.musicxmlMarks||[]);
  } else { const {pdfPrintPages}=await import('./pdf-print.js');pages=await pdfPrintPages(asset); }
  await printScore(pages,title);
}
