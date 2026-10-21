# Isaac Albéniz priority acquisition

Checked 2026-10-21. No app source was modified by this research subtask.

## Which exact original piano work is ready for integration?

### Takeaway
One strong first addition is ready for the coordinator's integration: **Rumores de la Caleta, Malagueña, Recuerdos de viaje Op.71 No.6**, original piano solo. The complete engraving source explicitly identifies the collection, number, instrument, editor and public-domain dedication. This is not a guitar arrangement. [Mutopia898 record](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=898).

### Cited Findings
- Exact edition: typeset by **David Surtees**, based on **Union Musical Española**, footer **Mutopia-2006/12/29-898**, LilyPond2.10.4; the source does not specify the historical UME publication year. [Full LilyPond source](https://www.mutopiaproject.org/ftp/AlbenizIMF/O71/Rumores_de_la-caleta/Rumores_de_la-caleta.ly).
- Exact full PDF: **153,976 bytes, 8 pages**, signature `%PDF-1.4`, unencrypted, parsed successfully by pdfinfo; all eight pages rendered and inspected in a contact sheet, including final cadence and typesetter attribution on the last page. [PDF](https://www.mutopiaproject.org/ftp/AlbenizIMF/O71/Rumores_de_la-caleta/Rumores_de_la-caleta-a4.pdf).
- PDF SHA-256: `6b8eac839458eddb4e1dd463be2b518a48b8f725798fc31cd974a7ade0e16328`; source LY **23,120 bytes**, SHA-256 `43881448fd59b1f6dfe29e595e786d4a9ebbc3ce9920e697808170518b9e8190`. These are direct local binary measurements of the linked assets, not catalog estimates.
- The source and PDF identify **Public Domain**, explicitly dedicated by the typesetter; retain David Surtees/Mutopia provenance and the original footer. [Edition-level record](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=898), [Mutopia reuse terms](https://www.mutopiaproject.org/legal.html).
- A separate historical publisher catalog also lists Rumores as **Recuerdos de viaje No.6**, in a **PIANO SOLO** section. [Sibley-hosted UME catalog page](https://urresearch.rochester.edu/fileDownloadForInstitutionalItem.action?itemFileId=9998&itemId=6273).

### Inferences
- This is the strongest low-friction Albéniz acquisition: exact edition rights and instrumentation are established and complete assets were fetched. Its historical UME year should remain unspecified.
- Coordinator integration should still run existing-catalog duplicate checks and retain the stable canonical identity for Op.71 No.6.

### Gaps
- No worldwide legal guarantee is made. The institutional/engraving provenance must be considered alongside destination-country composition rights.
- No difficulty grade was assigned.

## Which related original piano editions should remain on hold?

### Takeaway
Tango in D Op.165 No.2 is a concrete university-held original piano score with an explicit public-domain item statement, but editorial attribution requires a separate rights check. Other titles should remain candidates until an exact edition is acquired.

### Cited Findings
- **Tango in D, España Op.165 No.2**: Sibley record dates Boston Music Co. edition **1911**, identifies piano music and declares the item public domain. [Institutional record](https://urresearch.rochester.edu/institutionalPublicationPublicView.action?institutionalItemId=19692&versionNumber=1), [persistent handle](https://hdl.handle.net/1802/20125).
- Exact fetched file is **343,086 bytes, 4 PDF pages**: one cover/catalog page and three score pages. The music title reads **“TANGO, in D (Original Version)”**, grand staff marked PIANO, **“Edited by Hugo Ries”**, copyright1911 G.Schirmer, Boston, plate **B.M.Co.2583 F**. This differs from the often surfaced Hugo Riesenfeld edition; do not conflate them. [Exact Sibley PDF](https://urresearch.rochester.edu/fileDownloadForInstitutionalItem.action?itemId=20052&itemFileId=66514).
- The university's metadata reports3 music pages; the actual4-page PDF includes its cover. No LY/XML source is available from this record. [Record](https://hdl.handle.net/1802/20125).
- España Op.165 is a solo-piano set, and its No.2 is Tango. [PTNA set record](https://enc.piano.or.jp/en/musics/6), [Tango record](https://enc.piano.or.jp/en/musics/20880).
- Historical acquisition leads for **Granada Op.47 No.1**, **Sevilla Op.47 No.3**, **Asturias Op.47 No.5 / Chants d’Espagne Op.232 No.1** exist, but this subtask did not acquire their exact reusable full files. The publisher catalog distinguishes piano solo from arrangements. [Historical UME catalog](https://urresearch.rochester.edu/fileDownloadForInstitutionalItem.action?itemFileId=9998&itemId=6273).
- Asturias/Leyenda was originally the Prelude of Chants d’Espagne and was later inserted into Suite espagnole under another title; count it once. [Henle historical source discussion](https://www.henle.de/media/bb/31/2c/1697725863/0800-1697725863-sync.pdf). This source is used for historical identification, not permission to redistribute the modern Henle score.

### Inferences
- Keep Tango out of ready-to-import `results.json` until Hugo Ries's identity/editorial term has been checked. Do not mistake the source's “Original Version” for proof that all editorial material is unprotected everywhere.
- The next practical search order is Tango, Granada, Sevilla, Asturias, then other Op.165 pieces, using original piano historical editions rather than guitar arrangements.

### Gaps
- Tango editor biography/rights have not been checked, nor has the scan's full three-page music sequence been visually inspected beyond its first music page. It remains held.
- No additional cleared Albéniz works are claimed merely to meet a numeric target.

## Where are the acquisition evidence files?

### Takeaway
Machine-readable integration input and disposable proof files are at `/tmp/spino-albeniz-acquisition/`.

### Cited Findings
- `results.json`: one ready Mutopia898 item in the same field shape as the coordinator's previous acquisition batch, with additional instrumentation/source/license URLs.
- `mutopia-898-a4.pdf`, `mutopia-898.ly`: full original downloaded files and hashes listed above. [Remote PDF](https://www.mutopiaproject.org/ftp/AlbenizIMF/O71/Rumores_de_la-caleta/Rumores_de_la-caleta-a4.pdf), [remote LY](https://www.mutopiaproject.org/ftp/AlbenizIMF/O71/Rumores_de_la-caleta/Rumores_de_la-caleta.ly).
- `mutopia-898-first.png`:1500px full first-page preview; `mutopia-898-page-1.png` through `-8.png`:450px render of every page; `mutopia-898-contact.png`: inspected all-page contact sheet.
- `sibley-tango.pdf`, `sibley-tango-first.png`, `sibley-tango-music-first.png`, `sibley-tango-page-*.png`: held candidate evidence, separate from ready results. [Source](https://hdl.handle.net/1802/20125).

### Inferences
- Temporary proof paths should be copied into a dated repository evidence directory if the coordinator needs persistent release/review evidence.

### Gaps
- No app import, score count change, publication or release was performed by this subtask.
