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
