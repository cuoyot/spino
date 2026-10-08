// SPDX-License-Identifier: GPL-3.0-only
let current='en';
try{const saved=localStorage.getItem('spino-game-language');current=['en','es','ca'].includes(saved)?saved:'en';}catch{}
export const language=()=>current;
export const t=(en,es)=>current==='ca'?(catalan[en]||en):current==='es'?es:en;
export function setLanguage(value){current=['en','es','ca'].includes(value)?value:'en';try{localStorage.setItem('spino-game-language',current);}catch{}}
export function applyLanguage(){
 document.documentElement.lang=current;
 document.querySelector('#test-release-note').textContent=current==='ca'?'Versió de prova 0.9. La versió oficial estarà disponible a Google Play.':current==='es'?'Versión de prueba 0.9. La versión oficial estará disponible en Google Play.':'Test version 0.9. The official version will be available on Google Play.';
 document.querySelector('#test-badge').textContent=current==='ca'?'PROVA · 0.9':current==='es'?'PRUEBA · 0.9':'TEST · 0.9';
 const text=(selector,en,es)=>{const el=document.querySelector(selector);if(el)el.textContent=t(en,es);};
 const origin=['This game is a spinoff of Spino: Smart Piano Notebook, turning casual practice into a musical game.','Este juego nace de Spino: Smart Piano Notebook y convierte su práctica casual en un juego musical.'];text('#game-origin',...origin);text('#about-origin',...origin);
 text('header a span','PLAY LAB','LABORATORIO DE JUEGO');
 text('#midi-status','Touch · keyboard · MIDI','Pantalla · teclado · MIDI');
 text('#home .eyebrow','SIGHT READING, IN MOTION','LECTURA A PRIMERA VISTA, EN MOVIMIENTO');
 document.querySelector('h1').innerHTML=t('Read it.<br>Play it.<br><em>Keep the rhythm.</em>','Lee.<br>Toca.<br><em>Sigue el ritmo.</em>');
 text('#home h1 + p','A little piano. A moving score. Three chances to find your flow.','Un piano. Una partitura en movimiento. Tres oportunidades para encontrar tu ritmo.');
 text('#difficulty-label','Starting difficulty','Dificultad inicial');text('#language-label','Language','Idioma');
 ['Easy','Medium','Hard','Expert'].forEach((en,i)=>text(`#difficulty option:nth-child(${i+1})`,en,['Fácil','Media','Difícil','Experto'][i]));
 text('#start','Play a new run →','Nueva partida →');text('#connect','Connect MIDI piano','Conectar piano MIDI');text('summary','How to play','Cómo jugar');
 const rules=[
 ['Play each note when its centre reaches the pink line. Choose your starting difficulty; every 24 hits increases the level, with faster rhythms and more pitches. Familiar tunes are connected by short harmonic bridges; play their notes to hear the melody. On Hard and Expert, a four-beat rest follows every two tunes.','Toca cada nota cuando su centro llegue a la línea rosa. Elige la dificultad inicial; cada 24 aciertos sube el nivel, con ritmos más rápidos y más notas. Las melodías conocidas se conectan mediante breves enlaces armónicos; toca sus notas para escuchar la melodía. En Difícil y Experto hay un descanso de cuatro tiempos cada dos melodías.'],
 ['Wrong pitches, early presses and missed notes count as mistakes. Early notes have extra protection. Every 10 consecutive hits earns 250 bonus points; every 20 restores one lost life, up to six hearts. The three extra gold hearts each absorb two mistakes and are used first. A recharge repairs a cracked gold heart before adding another. Mistakes reset the recharge meter. Perfect hits within ±60 ms earn 150 extra points. Use A–K for white keys and W E T Y U for black keys, or touch the piano. ','Las notas incorrectas, anticipadas o perdidas cuentan como fallos. Al inicio hay protección adicional. Cada 10 aciertos seguidos ganas 250 puntos extra; cada 20 recuperas una vida, hasta seis corazones. Los tres corazones dorados extra absorben dos errores cada uno y se usan primero. Una recarga repara un corazón dorado dañado antes de añadir otro. Los errores reinician la recarga. Los aciertos perfectos dentro de ±60 ms ganan 150 puntos extra. Usa A–K para las teclas blancas y W E T Y U para las negras, o toca la pantalla. '],
 ['Judge the note’s arrival; holding the key for its written duration is not required in this prototype.','Se evalúa la llegada de la nota; en este prototipo no es necesario mantener la tecla durante toda su duración.']];
 document.querySelectorAll('#home details p').forEach((p,i)=>p.textContent=t(...rules[i]));
 ['SCORE','LEVEL','LIVES'].forEach((en,i)=>text(`.hud > div:nth-child(${i+1}) small`,en,['PUNTOS','NIVEL','VIDAS'][i]));
 text('#pause','Pause','Pausar');text('#midi-game','Connect MIDI','Conectar MIDI');text('#quit','End run','Terminar partida');

 text('.bottom > span','C4 → C5 · exact pitches','Do4 → Do5 · notas exactas');
 document.querySelector('#piano').setAttribute('aria-label',t('Piano keyboard','Teclado de piano'));
 document.querySelector('#staff').setAttribute('aria-label',t('Notes move right to left. Play at the pink line.','Las notas se mueven de derecha a izquierda. Toca en la línea rosa.'));
 text('#pause-title','Take a breath.','Tómate un respiro.');text('#pause-copy','Your rhythm is waiting for you.','Tu ritmo te espera.');text('#resume','Continue →','Continuar →');
 text('#about-open','Version notes & credits','Notas de versión y créditos');text('#about-title','Version & credits','Versión y créditos');text('#about-close','Close','Cerrar');
 text('#learning-rules','First 20 notes: one heart hit per 4 mistakes. Next 20: per 3, then per 2, then every mistake. Missed notes count too.','Primeras 20 notas: un golpe al corazón cada 4 fallos. Siguientes 20: cada 3; después cada 2 y finalmente cada fallo. Las notas perdidas también cuentan.');
 const releases=[['Familiar tunes with harmonic transitions.','Melodías conocidas con transiciones armónicas.'],['Streak rewards, gold hearts and gentle progression.','Bonus por rachas, corazones dorados y progresión gradual.'],['English, Spanish and Catalan. Responsive Arcade design.','Inglés, español y catalán. Diseño Arcade adaptable.'],['Treble/bass clef changes with a pause and renewed note-name hints.','Cambios de clave sol/fa con pausa y nuevas ayudas de nombres.']];document.querySelectorAll('#release-notes li').forEach((el,i)=>el.textContent=t(...releases[i]));
 text('#result .eyebrow','RUN COMPLETE','PARTIDA TERMINADA');text('#result h2','Keep finding your flow.','Sigue encontrando tu ritmo.');text('#retry','Play again →','Volver a jugar →');text('#home-button','Game options','Opciones del juego');
}

const catalan={
'PLAY LAB':'LABORATORI DE JOC','SIGHT READING, IN MOTION':'LECTURA A VISTA, EN MOVIMENT',
'Read it.<br>Play it.<br><em>Keep the rhythm.</em>':'Llegeix.<br>Toca.<br><em>Segueix el ritme.</em>',
'A little piano. A moving score. Three chances to find your flow.':'Un piano. Una partitura en moviment. Troba el teu ritme.',
'Starting difficulty':'Dificultat inicial','Language':'Idioma','Easy':'Fàcil','Medium':'Mitjana','Hard':'Difícil','Expert':'Expert',
'Play a new run →':'Nova partida →','How to play':'Com es juga','SCORE':'PUNTS','LEVEL':'NIVELL','LIVES':'VIDES',
'Pause':'Pausa','Resume':'Continua','End run':'Acaba la partida','Take a breath.':'Pren-te un respir.','Your rhythm is waiting for you.':'El teu ritme t’espera.','Continue →':'Continua →',
'Piano keyboard':'Teclat de piano','Notes move right to left. Play at the pink line.':'Les notes van de dreta a esquerra. Toca dins del marc.',
'RUN COMPLETE':'PARTIDA ACABADA','Keep finding your flow.':'Segueix trobant el teu ritme.','Play again →':'Torna a jugar →','Game options':'Opcions del joc',
'Personal best':'Rècord personal','points':'punts','Get ready · first note in 3.5 seconds':'Prepara’t · primera nota en 3,5 segons','correct notes · Level':'notes correctes · Nivell','lives remaining':'vides restants','New personal best!':'Nou rècord personal!',
'Missed · heart hit':'Nota perduda · cor colpejat','Gold heart':'Cor daurat','lives':'vides','Whole':'Rodones','Half':'Blanques','Quarter':'Negres','notes':'notes','note streak':'notes seguides','to recharge':'per recarregar','Life recharge':'Recàrrega de vida',
'Take a breath · resumes in':'Respira · continuem en','Linking to':'Enllaç cap a','Read the notes · a familiar tune is coming':'Troba el ritme','PLAY HERE':'TOCA AQUÍ','PERFECT':'PERFECTE',
'Perfect!':'Perfecte!','Good!':'Molt bé!','Wrong note · heart hit':'Nota incorrecta · cor colpejat','Too early · heart hit':'Massa aviat · cor colpejat','Too late · heart hit':'Massa tard · cor colpejat','Game over':'Fi de la partida','Level':'Nivell','keep the flow!':'segueix el ritme!','♥ Heart recharged! · ':'♥ Cor recarregat! · ','note streak!':'notes seguides!','bonus':'de bonificació','Keep the rhythm':'Segueix el ritme','Paused · press Resume':'En pausa · prem Continua','Take a breath · no notes to play':'Respira · no hi ha notes per tocar',
'Sampled grand piano':'Piano de cua amb mostres','Loading piano samples…':'Carregant el piano…','Piano loading unavailable · synth fallback':'Mostres no disponibles · so de reserva','whole notes':'rodones','half notes':'blanques','quarter notes':'negres','pitches':'notes',
'Early':'Avançament','Late':'Retard','STREAK':'RATXA','Next heart':'Pròxim cor','+1 HEART':'+1 COR','STREAK BONUS':'BONUS DE RATXA',
};

catalan["Play each note when its centre reaches the pink line. Choose your starting difficulty; every 24 hits increases the level, with faster rhythms and more pitches. Familiar tunes are connected by short harmonic bridges; play their notes to hear the melody. On Hard and Expert, a four-beat rest follows every two tunes."]="Toca cada nota dins del marc. Cada 24 encerts puges de nivell. Les melodies s’uneixen amb enllaços harmònics. En els nivells difícils descanses quatre temps cada dues melodies. Pots anticipar-te més que endarrerir-te.";
catalan["Wrong pitches, early presses and missed notes count as mistakes. Early notes have extra protection. Every 10 consecutive hits earns 250 bonus points; every 20 restores one lost life, up to six hearts. The three extra gold hearts each absorb two mistakes and are used first. A recharge repairs a cracked gold heart before adding another. Mistakes reset the recharge meter. Perfect hits within ±60 ms earn 150 extra points. Use A–K for white keys and W E T Y U for black keys, or touch the piano. "]="Cada 10 encerts seguits guanyes 250 punts extra; cada 20 recarregues un cor. Pots tenir tres cors normals i tres de daurats. Cada cor daurat resisteix dos errors. Els errors reinicien la ratxa. Un encert perfecte dona 150 punts extra. Toca el piano de la pantalla o usa A–K i W E T Y U.";
catalan['Judge the note’s arrival; holding the key for its written duration is not required in this prototype.']='Una pulsació fa sonar tota la durada de la nota; no cal mantenir la tecla.';

catalan['Version notes & credits']='Notes de versió i crèdits';catalan['Version & credits']='Versió i crèdits';catalan['Close']='Tanca';catalan['Familiar tunes with harmonic transitions.']='Melodies conegudes amb transicions harmòniques.';catalan['Streak rewards, gold hearts and gentle progression.']='Bonus per ratxes, cors daurats i progressió gradual.';catalan['English, Spanish and Catalan. Responsive Arcade design.']='Anglès, castellà i català. Disseny Arcade adaptable.';

catalan['Bass clef']='Clau de fa';catalan['Treble clef']='Clau de sol';catalan['Get ready']='Prepara’t';

catalan['Treble/bass clef changes with a pause and renewed note-name hints.']='Canvis de clau sol/fa amb pausa i noves ajudes de noms.';

catalan['This game is a spinoff of Spino: Smart Piano Notebook, turning casual practice into a musical game.']='Aquest joc neix de Spino: Smart Piano Notebook i transforma la pràctica casual en un joc musical.';

catalan['mistakes / ♥']='errors / ♥';catalan['Missed']='Nota perduda';catalan['heart hit']='cor colpejat';catalan['protected']='protegit';catalan['First 20 notes: one heart hit per 4 mistakes. Next 20: per 3, then per 2, then every mistake. Missed notes count too.']='Primeres 20 notes: un cop al cor cada 4 errors. Les 20 següents, cada 3; després cada 2 i finalment cada error. Les notes perdudes també compten.';

catalan['New keyboard position']='Nova posició del teclat';

catalan['MIDI connected']='MIDI connectat';catalan['MIDI enabled · connect your keyboard']='MIDI activat · connecta el teclat';catalan['MIDI disabled']='MIDI desactivat';catalan['MIDI is unavailable in this browser']='MIDI no està disponible en aquest navegador';catalan['MIDI permission was not granted · try again']='Permís MIDI no concedit · torna-ho a provar';


catalan['Corrected! · half the penalty recovered']='Corregit! · recuperes la meitat de la penalització';catalan['Try again before the note leaves']='Repeteix abans que surti la nota';
