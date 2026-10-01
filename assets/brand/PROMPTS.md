# SPino image-generation record

Created: 2026-09-30. Mode: built-in `image_gen` tool through the imagegen skill; no CLI fallback or project API key. Artwork is raster, not an editable vector drawing. Final generated originals are copied into this directory; exports retain the artwork and adapt size, padding, alpha or background for their destination.

The initial draft and its transparency refinement developed the notebook/piano P symbol. `spino-symbol-master.png` is the selected refined source. `spino-feature-master.png` is the wide brand composition. The prompts below preserve the exact generation instructions.

## Initial symbol prompt

```text
Use case: logo-brand.
Asset type: primary logo symbol for an Android app and Google Play listing.
Primary request: Create a distinctive, professional logo symbol for "SPino: Smart Piano Notebook", a free, private, local piano-practice companion for scheduling practice, reading music and recording progress.
Style: very simple flat geometric graphic with crisp vector-like edges, restrained and mature, recognisable at 32 pixels. A single compact visual idea combining an upright pocket notebook and piano keys, subtly suggesting a capital P. A strong blue notebook spine curves into the top page; three clean ivory piano-key shapes with two dark negative-space black-key gaps form the interior. Harmonious proportions, confident thick forms, slightly softened corners and generous negative space.
Palette: the existing app uses charcoal #14161a, warm ivory #e8eaed and vivid but restrained blue #4f8cff. Use blue and ivory for the visible mark, with genuinely transparent negative spaces. It must work on a charcoal background.
Composition: one centered upright symbol only on a genuinely transparent square 1024x1024 canvas. The complete symbol occupies approximately the central 70% of width and height with even transparent padding. Transparent background, no enclosing tile, no baked-in rounded-square background.
Text: none; this is the symbol-only launcher asset, so do not add the name or letters as separate text.
Avoid: tiny detail, gradients, shadows, perspective, photorealism, music-note clip art, treble clefs, sparkles, mascots, mockups, multiple options, presentation boards, watermark.
```

## Selected symbol refinement

Reference: the initial generated symbol.

```text
Use case: precise-object-edit.
Asset type: production logo symbol for SPino.
Input image: the supplied logo is the edit target. Preserve its single blue notebook / P silhouette and ivory piano-key concept, proportions and placement.
Change only the rendering finish: redraw the mark with absolutely clean, smooth geometric edges and perfectly SOLID flat fills. Remove every speckle, white fleck, grain, mottled patch and stray pixel, particularly inside the two vertical key gaps and the horizontal opening at the top. Blue is solid #4f8cff, ivory solid #e8eaed. All cutout spaces and the outside background must be truly transparent, uniform zero alpha, with clean antialiased boundaries. The ivory key shapes themselves must stay opaque.
Use a square canvas. This is a carefully finished small app icon, not a textured ink print or photograph. NO texture, NO noise, NO gradients, NO shadows, NO separate text, NO new elements. Keep the notebook/P logo design recognizable.
```

## Feature graphic and wordmark

Reference: `play-store-icon-512.png`, exported from the selected symbol.

```text
Use case: logo-brand.
Asset type: finished Google Play feature graphic and horizontal brand lockup for SPino, final aspect ratio exactly 1024:500 (wide landscape). Render at 2048x1000 if possible.
Input image role: the supplied image is the approved SPino brand-symbol reference. Keep its notebook-and-piano P design and blue/ivory palette recognizable; do not include the reference's square tile as a separate card.
Composition: full-bleed solid charcoal #14161a canvas, sophisticated minimalist graphic design. Large beautifully typeset wordmark "SPino" as the primary focus, with the exact subtitle "Smart Piano Notebook" directly below it. Use a small version of the reference symbol beside the wordmark. Keep all text, the small symbol and important graphic elements comfortably inside the central 80% width and 70% height. To one side, a quiet abstract arrangement of three ivory piano-key shapes and subtle blue notebook ruled lines, visually extending the logo without a second giant icon. Airy negative space, balanced optical alignment, professional musical practice journal identity.
Text (verbatim): "SPino" (uppercase S and P, lowercase i n o), and "Smart Piano Notebook". Modern restrained humanist sans-serif lettering, ivory title, muted ivory subtitle, immaculate spacing and legibility. No additional words.
Constraints: Use only charcoal #14161a, blue #4f8cff and ivory #e8eaed with muted supporting grey. Opaque background. Sharp clean graphic contours. No textures, speckles, gradients, drop shadows, device mockups, photos, store badges, awards, prices, music notes, treble clefs, social symbols, extra text or watermarks. One finished wide asset, not a sheet of alternatives.
```
