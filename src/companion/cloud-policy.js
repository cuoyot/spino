// Closed dialogs retain their forms; only visible editing surfaces defer incoming data.
export function cloudApplyBlocker({active,allowPausedPractice=false,startingPractice=false,dialog,scoreViewer,openingScore,document}) {
  if(startingPractice||active&&(!allowPausedPractice||active.runningSince!=null))return 'practice';
  if(scoreViewer||openingScore)return 'score';
  if(dialog?.open)return 'dialog';
  if([...document.querySelectorAll('form')].some(form=>form.getClientRects().length && form.id!=='library-search'))return 'editor';
  return null;
}
