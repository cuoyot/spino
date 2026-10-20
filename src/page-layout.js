// Reserve the key label and a real bottom margin, then centre a compact stack of systems.
export function pageSystemCount(height,grand,zoom) {
  return Math.max(1,Math.min(6,Math.floor(Math.max(1,height-48)/((grand?210:130)*zoom*0.85+8))));
}
export function pageRows(height,systems,logicalHeight,zoom) {
  const topPadding=Math.min(32,height*0.16),bottomPadding=Math.min(16,height*0.08);
  const available=Math.max(1,height-topPadding-bottomPadding);
  const rowHeight=Math.min(available/systems,logicalHeight*zoom*0.85+8);
  return {rowHeight,offset:topPadding+(available-rowHeight*systems)/2,available};
}

// Leave room for the clef/time header and a readable slot for each Hanon note and finger number.
export function pageBarCount(width,beatsPerBar,shortestBeat,zoom=1) {
  const available=Math.max(1,width-128*zoom);
  const barWidth=beatsPerBar/shortestBeat*28*zoom;
  return Math.max(1,Math.min(4,Math.floor(available/barWidth)));
}

// Centre rhythmic slots inside each measure. The same linear grid drives notes and the clock cursor.
export function pageBeatGrid(left,right,bars,beatsPerBar,shortestBeat) {
  const barWidth=(right-left)/bars;
  const pxPerBeat=barWidth/beatsPerBar;
  const inset=Math.min(shortestBeat,beatsPerBar)*pxPerBeat/2;
  return {barWidth,xAt:beat=>left+inset+beat*pxPerBeat};
}
