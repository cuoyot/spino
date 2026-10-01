# SPino user manual source

This is the English source for a future help manual bundled with SPino. It is authored alongside the [release quality review](../quality-review/README.md) and describes actual behavior, not proposals. No help screen or runtime manual renderer has been added in this phase.

`index.json` supplies stable chapter IDs, order, local paths and editorial status. Chapter Markdown contains only user-facing instructions. Keep review IDs, unresolved design decisions and implementation notes in the index/review workspace rather than in the rendered chapter body.

| Status | Meaning |
| --- | --- |
| draft | Checked against the current implementation, but its screen review is still open. |
| reviewed | The screen's behavior and wording have been accepted and verified. |
| needs-update | A later decision changes behavior described in the chapter. |

Today and the session overview have draft chapters; the other topics are planned in the index. The manual is deliberately incomplete until those screens are reviewed. New chapters should explain the screen's purpose, how to perform its main tasks, the meaning of visible statuses, recovery/cancellation and useful next steps. Use stable headings, relative local links and semantic lists. Keep instructions concise enough for phone reading.

Future app integration can bundle these local assets during the existing build, render Markdown with safe link handling and navigate by chapter ID. It does not require a server, account, remote content service or runtime network request. English remains the authoring language; translated chapters should share IDs and be reviewed against the same accepted behavior. Review galleries are engineering evidence and should not be shipped as manual content.

After a shared UI decision, check all indexed chapters that reference the affected screen/component. Mark stale chapters `needs-update` until their instructions match the verified application. Never publish a proposed feature as an available task.
