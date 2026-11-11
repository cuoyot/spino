# Today weekly overview: 9 November source audit

Audited on 2026-11-11 at the owner's request. Reference: `d0cdbf012718e10255f422610e3406c072a5a12c`, final published beta124 source on 9 November. All twelve repository commits dated 9 November contain the same `todayWeeklyProgress` function. The current beta126 function is identical after line-ending/outer-whitespace normalization; `progress-metrics.js` and `progress-duration.js` are byte-identical. No application code changed during this audit.

## Verified behavior

- The weekly total sums positive elapsed time in saved sessions from Monday through today, rounded to minutes. Unfinished practice, planned time and future-dated records are excluded. Hours/minutes formatting is shared with Progress.
- An optional profile weekly goal adds a horizontal percentage bar, capped at 100%, and remaining minutes or Goal reached. Without a goal, target/bar/caption are absent.
- Seven days run Monday to Sunday. Each daily column represents saved elapsed time for that day, scaled against the busiest day that week. The tallest is 32 px; positive values have a 10% minimum fill. Future columns stay empty. Columns do not represent a daily target.
- Daily minutes appear below each bar. Activity/event marks describe calendar entries, including plans; they do not encode a completion score. Practice marks use the first block's activity type.
- Today has a filled circle. A day opens its selected week/day in Calendar; View calendar selects today; View progress opens the full Progress page.

## Exact visual differences

| Element | 9 November | Beta126 |
| --- | --- | --- |
| Daily fill | Bottom blue `#368ce8`, top green `#38c8ac` | Bottom `#9cabdc`, top `#8ac8bb` |
| Weekly goal | Left `#4f8cff`, right `#32c6ac` | Left `#9cabdc`, right `#8ac8bb` |
| Light card | `#ffffff`, 16 px corners, browse shadow | `#e9edf9`, 14 px corners, no shadow |
| Today circle, light | `#2563eb`, white text | `#dfe6f6`, dark text |
| Dark card | `#282e38` | `#35476b` |
| Today circle, dark | `#4f8cff`, white text | `#405779`, light text |

The daily gradient direction in beta126 is correct; its colors differ. Every daily bar uses the same fixed blue/green gradient. Neither its color nor the weekly gradient changes upon goal completion. Small activity markers use separate activity colors.

The 10 November appearance layer overrides the earlier fill and current-day colors. The scoped Today stylesheet also replaces the white/dark card with a tinted card. Thus restoring the old markup did not restore its full effective CSS.

## Review state

The owner likes the restored module's structure and requests verification of the previous colors and behavior. The historical palette is now verified; a color-only restoration has not been applied or published. Other current features remain unchanged. This is a source audit, not new native-device acceptance.

## Implementation follow-up

On 11 November the owner requested the APK and website publication. Beta127 restores the historical weekly-module palette only. See [verification](captures/today/2026-11-11-original-palette-01/README.md); the earlier audit-only status above is historical.
