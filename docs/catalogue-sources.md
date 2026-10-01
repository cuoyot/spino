# Downloadable practice scores

The reviewed PDF catalogue in `src/companion/catalog.js` now contains ten editions: the original two entries and eight additions. These are downloadable scores for manual practice, local annotation and session tracking. They are not automatically evaluated sight-reading exercises. Downloading a PDF does not produce a MusicXML analysis or generated excerpts.

Downloads remain opt-in and use the existing foreground queue, network preference and annotation-preserving update behavior. Catalogue version 2 adds entries; all existing IDs and edition revisions remain unchanged. The eight additional files total **504,922 bytes**. No score was installed in the user's notebook as part of this source check.

## Edition evidence

On 30 September 2026, each new edition's official page and LilyPond source were checked. Each PDF URL returned HTTP 200, a PDF signature, and a parseable score through the web PDF reader. The exact downloaded bytes were hashed with SHA-256. The source page identifies the typesetter and the edition's permission; eligibility is not inferred from the composer's age. Download URLs, file names, byte counts, hashes and check dates are retained in the catalogue.

| Stable ID | Work | Typesetter | Edition permission | PDF pages |
| --- | --- | --- | --- | --- |
| `mutopia-202` | [La Candeur, Op. 100 No. 1](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=202) | Bas Wassink | Public Domain | 1 |
| `mutopia-203` | [l'Arabesque, Op. 100 No. 2](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=203) | Bas Wassink | Public Domain | 1 |
| `mutopia-218` | [La Pastorale, Op. 100 No. 3](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=218) | Bas Wassink | Public Domain | 1 |
| `mutopia-219` | [La Petite Réunion, Op. 100 No. 4](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=219) | Bas Wassink | Public Domain | 1 |
| `mutopia-214` | [Innocence, Op. 100 No. 5](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=214) | Bas Wassink | Public Domain | 1 |
| `mutopia-215` | [Progrès, Op. 100 No. 6](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=215) | Bas Wassink | Public Domain | 1 |
| `mutopia-40` | [Invention 1, BWV 772](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=40) | jeff covey | CC BY-SA 3.0 | 2 |
| `mutopia-354` | [Von fremden Ländern und Menschen, Op. 15 No. 1](https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=354) | Ying-Chun Liu | Public Domain | 1 |

The six Burgmüller engravings cite Collection Litolff; the Schumann engraving cites Leichte Stucke (1900). Their PDF footers explicitly dedicate the typesetter's contribution to the public domain. [Mutopia explains these edition permissions](https://www.mutopiaproject.org/legal.html). The Bach engraving cites Bach-Gesellschaft and carries a [Creative Commons Attribution-ShareAlike 3.0 license](https://creativecommons.org/licenses/by-sa/3.0/); keep its credit and license with the unchanged score. This is deliberately not labeled Public Domain.

## Practice metadata

The Burgmüller source files explicitly declare C major, A minor, G major, C major, F major and C major respectively; Schumann's declares G major. These support related lesson filters, not claims that every note belongs to the corresponding scale. A-minor associations cover related natural/harmonic lessons and explicitly mention accidentals. The Bach edition is available without a curriculum target assignment. No difficulty rating, automatically validated excerpt, performance grade or MusicXML availability is invented.

Practice notes are editorial suggestions. They do not define extracted segments. Users can select passages and annotate the complete PDFs themselves.

## Relationship to the research package

These are edition records with concrete PDF links, distinct from the canonical and candidate records under `Exercises_Library`. Adding them does not increase that package's 618 enabled records or imply 628 unique works. No key-based legacy ID is mapped to an ordinal ID. Existing repertoire references and annotations stay attached to their original stable IDs and asset IDs.

The research list is useful as a backlog for finding editions. An entry without a download URL does not become downloadable through approval. Runtime acquisition, score parsing and manual review remain separate capabilities for the MusicXML candidates.

## Rechecking

Run the regular catalogue contract checks with:

```powershell
node --test tests/catalog-sources.test.js
```

The optional live check fetches the new official PDFs into memory, checks the PDF signature, hash and byte length, and saves nothing to the notebook:

```powershell
$env:VERIFY_CATALOG_DOWNLOADS = '1'
node --test tests/catalog-sources.test.js
Remove-Item Env:VERIFY_CATALOG_DOWNLOADS
```

Source availability is an observed check, not a promise of permanent uptime. If a publisher replaces a file, review the changed edition evidence before updating its hash or revision.

The original two URLs were also fetched on the same date and returned HTTP 200 with PDF signatures. Their records and revision values remain unchanged:

| Stable ID | Bytes | SHA-256 |
| --- | ---: | --- |
| `mutopia-75` | 180708 | `6b34ba44122d9694156a113c749eee0bf3232f54ead431a44be6f2a1b6f32c8b` |
| `mutopia-1612` | 53687 | `86435e170268a04201966492e120371348abbc7d77712221e362b91d97832eeb` |

All ten live checks therefore transferred **739,317 bytes** for verification, without installing any score in the user's notebook.
