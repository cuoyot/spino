// Optional MIDI follow mode for MusicXML scores: the OSMD cursor waits on each chord until every expected key has
// been played, then moves on. Wrong keys are counted but never move the cursor, like wait mode in the reader.
const FOLLOW_KEY = 'spino.xmlFollow.v1';
export const FOLLOW_HANDS = ['both', 'right', 'left'];

export function readFollowPreference() {
  try {
    const value = JSON.parse(localStorage.getItem(FOLLOW_KEY) || '{}');
    return { enabled: value.enabled === true, hands: FOLLOW_HANDS.includes(value.hands) ? value.hands : 'both' };
  } catch { return { enabled: false, hands: 'both' }; }
}
export function saveFollowPreference(value) {
  try { localStorage.setItem(FOLLOW_KEY, JSON.stringify({ enabled: !!value.enabled, hands: FOLLOW_HANDS.includes(value.hands) ? value.hands : 'both' })); } catch { /* Browser storage is optional. */ }
}

// OSMD counts half tones from C0 = 0 with MusicXML octave 4 stored as 1, so middle C (MIDI 60) is 48.
export const noteMidi = note => note.halfTone + 12;

// In a two-staff piano part the upper staff is the right hand and the lower staff the left hand.
export function staffHand(note) {
  const staff = note.ParentStaff, staves = staff?.ParentInstrument?.Staves || [];
  if (staves.length < 2) return 'both';
  return staves.indexOf(staff) === 0 ? 'right' : 'left';
}

// Keys to press at the cursor: sounding notes that start here (not rests, grace notes or tied continuations).
export function expectedKeys(notes, hands = 'both') {
  const keys = new Set();
  for (const note of notes || []) {
    if (!note || note.isRest?.() || note.ParentVoiceEntry?.IsGrace) continue;
    if (note.NoteTie && note.NoteTie.StartNote && note.NoteTie.StartNote !== note) continue;
    if (hands !== 'both' && staffHand(note) !== hands && staffHand(note) !== 'both') continue;
    keys.add(noteMidi(note));
  }
  return keys;
}

// `cursor` is an OSMD cursor (or a test double with NotesUnderCursor/next/reset and Iterator.EndReached).
export function createFollower(cursor, { hands = 'both', correct = 0, wrong = 0, onMove = () => {}, onChange = () => {} } = {}) {
  let pending = new Set(), played = new Set(), finished = false;
  const state = () => ({ correct, wrong, finished, pending: [...pending], hands });
  function settle() {
    // Skip rests and other-hand material so the cursor always waits on something to play.
    while (!cursor.Iterator.EndReached) {
      pending = expectedKeys(cursor.NotesUnderCursor(), hands);
      if (pending.size) break;
      cursor.next();
    }
    played = new Set();
    finished = cursor.Iterator.EndReached;
    if (finished) pending = new Set();
    onMove(state());
    onChange(state());
  }
  return {
    start() { settle(); return state(); },
    press(midi) {
      if (finished) return state();
      if (pending.has(midi)) {
        pending.delete(midi); played.add(midi); correct++;
        if (!pending.size) { cursor.next(); settle(); return state(); }
      } else if (!played.has(midi)) wrong++;
      onChange(state());
      return state();
    },
    restart() { cursor.reset(); finished = false; settle(); return state(); },
    setHands(value) { hands = FOLLOW_HANDS.includes(value) ? value : 'both'; settle(); return state(); },
    get state() { return state(); },
  };
}
