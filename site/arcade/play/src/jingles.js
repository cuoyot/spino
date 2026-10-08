// SPDX-License-Identifier: GPL-3.0-only
// Short monophonic phrases, arranged in the game's C4–C5 register.
export const jingles=[
 {id:'mary',title:['Mary Had a Little Lamb','Mary tenía un corderito'],notes:[[64,1],[62,1],[60,1],[62,1],[64,1],[64,1],[64,2]]},
 {id:'ode',title:['Ode to Joy','Oda a la alegría'],notes:[[64,1],[64,1],[65,1],[67,1],[67,1],[65,1],[64,1],[62,1],[60,1],[60,1],[62,1],[64,1],[64,1],[62,1],[62,2]]},
 {id:'twinkle',title:['Twinkle, Twinkle, Little Star','Estrellita, ¿dónde estás?'],notes:[[60,1],[60,1],[67,1],[67,1],[69,1],[69,1],[67,2],[65,1],[65,1],[64,1],[64,1],[62,1],[62,1],[60,2]]},
 {id:'frere',title:['Frère Jacques','Frère Jacques'],notes:[[60,1],[62,1],[64,1],[60,1],[60,1],[62,1],[64,1],[60,1],[64,1],[65,1],[67,2],[64,1],[65,1],[67,2]]},
 {id:'london',title:['London Bridge','El puente de Londres'],notes:[[67,1],[69,1],[67,1],[65,1],[64,1],[65,1],[67,2],[62,1],[64,1],[65,2],[64,1],[65,1],[67,2]]},
 {id:'birthday',title:['Happy Birthday','Cumpleaños feliz'],notes:[[60,1],[60,1],[62,2],[60,2],[65,2],[64,4],[60,1],[60,1],[62,2],[60,2],[67,2],[65,4],[60,1],[60,1],[72,2],[69,2],[65,2],[64,2],[62,4],[70,1],[70,1],[69,2],[65,2],[67,2],[65,4]]},
 // Original dance motif with six-note groups; this is not a named traditional tune.
 {id:'tarantella',title:['Tarantella-style dance','Danza estilo tarantela'],notes:[[69,1],[71,1],[72,1],[71,1],[69,1],[67,1],[69,1],[71,1],[72,1],[71,1],[69,1],[67,1],[65,1],[67,1],[69,1],[67,1],[65,1],[64,1],[62,1],[64,1],[65,1],[64,1],[62,1],[60,2]]},
];
export function eligibleJingles(pitches){return jingles.filter(j=>j.notes.every(([midi])=>pitches.includes(midi)));}
