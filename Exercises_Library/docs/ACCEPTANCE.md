# App acceptance criteria

## Language and import

- Use English as the base language for documentation, default UI states, operational messages and editorial labels. Preserve original musical titles, names and source metadata.
- A clean installation displays 618 records from enabled manifests: 563 main works and 55 candidate editions. Show the initial count of 0 playable pieces separately.
- Enabling the optional manifest and source adds 1,462 accompaniment editions, for 2,080 total records. Keep the solo-piano view distinct.
- Importing twice does not duplicate IDs, erase progress or reset completed analysis to pending.
- Updating from the Spanish package matches the existing IDs and updates editorial labels without creating new records.
- Records without assets, downloads or levels stay visible with their states. An invalid manifest produces a contextual error rather than a silent omission.
- Do not index null as zero, empty, C major or beginner difficulty. “Unknown level” is a separate filter.

## Acquisition and rights

- For an observed URL, preserve the original file, actual SHA-256, origin, revision and download state.
- Exercise 404, timeout, 429, HTML responses and interrupted downloads: records must survive and retries must not duplicate them.
- Test a valid MXL whose container.xml rootfile is not the first XML in the archive.
- Reject XML external references, ZIP entries escaping the output directory and decompression exceeding configured limits.
- A repository-wide or software license does not approve an individual edition. Pending rights prevent publishing the score, but not showing its catalogue entry.

## Analysis and segments

- Use independent synthetic fixtures covering a pickup, key change, courtesy accidental, multiple voices with backup/forward, tied notes, triplet and cross-staff writing. Label them as fixtures; do not add them to the public repertoire.
- Verify known fixture notes/durations and compare visual samples against their sources. Check at least one real piece for every implemented format.
- Do not infer hands solely from clef or staff. Keep hand ranges pending when ambiguous.
- For a lied containing voice and piano, piano range must exclude the voice. If piano cannot be identified, do not create a ready exercise.
- Reject out-of-range segments, end <= start, or assets belonging to another parent. Boundaries use indices, not printed numbers.
- Recalculate segment metrics. An accidental outside the excerpt must not be counted inside it, except for genuinely inherited musical context.
- Changes to score content, algorithm or selected parts invalidate dependent analyses.

## Development-agent delivery report

Report imported records by group, downloaded assets, assets approved for distribution, completed analyses, ready pieces, pending items and failures. State concrete blockers for pieces that cannot yet be practiced. Do not advertise “2,080 playable pieces” merely because the JSON was imported.
