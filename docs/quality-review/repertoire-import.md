# Repertoire and score import

Active surfaces: REP-01 / REP-03 / REP-04; review continuing, not visually approved.

2026-10-06: owner approved D-030's presented minimal layout and requested D-031. Library now offers My repertoire/Catalogue top navigation with retained searches and scroll; routines belong to Practice. [Current 24-view browser gallery](captures/repertoire/2026-10-06-library-tabs-02/index.html). New navigation visual/native acceptance remains open; import D-028 remains separate.

Latest: owner rejected boxed-table presentation; D-030 supersedes its visual design. Advanced-model design consultation informed flat controls, typography-led rows, mobile composer/stage subtitles, collapsed secondary filters and removal of favorites UI. [Current minimal gallery](captures/repertoire/2026-10-06-repertoire-minimal-02/index.html). Browser verification is separate from owner visual/native acceptance. Older galleries below are historical.

Owner follow-up: a dedicated Stand column replaces textual add/remove actions. The music-stand icon is filled when active and outlined otherwise; pressing it toggles membership without opening the work. Accessible action labels and 44px targets retained. Latest responsive evidence: [stand icon gallery](captures/repertoire/2026-10-06-repertoire-stand-icons/index.html); native/owner acceptance remains open.

Owner-requested REP-01 refinement, 2026-10-06: Music stand first, followed by a compact collection filter bar and semantic table. Title/composer/stage headers toggle ascending/descending order. Free text matches words across title/composer (and existing tags), ignoring accents; collection filters do not hide the stand. Stable records and attachments are unchanged. Four unit checks and twelve responsive browser probes pass; visual/native acceptance remains open. Evidence: [table gallery](captures/repertoire/2026-10-06-repertoire-table-01/index.html). Import-format work remains separate.

2026-10-06 [sixteen responsive browser captures](captures/repertoire/2026-10-06-repertoire-import-baseline/index.html) show empty repertoire, new work, study details and selected synthetic PDF in phone/tablet portrait/landscape. Isolated disposable notebook; personal data untouched. No runtime errors. These initial-viewport captures do not cover lower form fields, saved work detail or native file pickers.

Current direct repertoire file picker accepts PDF only. D-028 requests MusicXML/MXL alongside PDF and a MuseScore-assisted authorized download/import/source-link flow. Catalogue edition attachment already has broader format support; reuse validation rather than creating a second parser. Direct account integration is not available.

Next proposal: a format-neutral Score file entry; preserve PDF metadata detection, use MusicXML title/composer metadata and offer part selection when needed. Test invalid files, cancellation, original bytes, stable work IDs and annotations before declaring implementation available. No product behavior changed in this baseline.
