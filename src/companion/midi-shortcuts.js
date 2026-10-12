// Delegate to dynamically mounted indicators; a held press must not also reconnect.
export function bindMidiShortcuts(root,{connected,connect,settings,holdMs=550}) {
  const selector='[data-action="midi-settings"],#midi-pill,#practice-midi';
  let press=null,suppressUntil=0;
  const target=event=>event.target.closest?.(selector);
  const cancel=()=>{clearTimeout(press?.timer);press=null;};
  root.addEventListener('pointerdown',event=>{
    if(!target(event)||event.button!==0)return;
    cancel();press={x:event.clientX,y:event.clientY};
    press.timer=setTimeout(()=>{press=null;suppressUntil=Date.now()+1000;settings();},holdMs);
  },true);
  root.addEventListener('pointermove',event=>{if(press&&Math.hypot(event.clientX-press.x,event.clientY-press.y)>10)cancel();},true);
  root.addEventListener('pointerup',cancel,true);root.addEventListener('pointercancel',cancel,true);
  root.addEventListener('click',event=>{
    if(!target(event))return;
    event.preventDefault();event.stopImmediatePropagation();
    if(Date.now()<suppressUntil){suppressUntil=0;return;}
    if(connected())settings();else void connect();
  },true);
  root.addEventListener('contextmenu',event=>{if(!target(event))return;event.preventDefault();cancel();suppressUntil=Date.now()+1000;settings();},true);
}
