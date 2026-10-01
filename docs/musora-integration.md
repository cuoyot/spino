# Musora integration assessment

Research checked on 2026-09-30. No subscriber account was accessed and no request was sent to Musora.

## What is supported today

Musora documents downloadable sheet music and other lesson resources below the video player. Some licensed song tutorials permit on-screen viewing only and do not offer downloading or printing. A subscription therefore does not imply that every score can be exported. Offline video downloads are a feature of Musora's own mobile app.

- [Download resources, videos and sheet music](https://faq.musora.com/article/1208-how-do-i-download-resources-and-videos)
- [Songs membership access](https://help.musora.com/article/1293-what-are-songs)

SPino can already import PDFs that the user obtains through the provider's supported download flow. A future operating-system Share/Open with SPino entry point could remove the extra file-picker step. Saving a lesson URL alongside a repertoire item could also provide a direct return to the source. These improvements do not require a SPino server, but they are not an account connection or automatic access to the Musora library.

## Account-linked downloading is not confirmed

Musora publishes a [Musora Content Services repository](https://github.com/railroadmedia/musora-content-services). Its README describes utilities for Musora's Sanity backend and an internal development environment with internal credentials. It is not evidence of a supported subscriber OAuth flow, third-party application registration or permission to export licensed scores.

The public documentation reviewed did not establish a supported third-party integration contract for linking a subscriber account and downloading its scores. This is an unresolved provider dependency, not proof that an agreed integration is impossible. SPino must not advertise a working Musora account connection on this basis.

The [Ambassador Program](https://www.musora.com/ambassador) is an affiliate program; it does not document a score-download API. The [Terms of Use](https://www.musora.com/terms) describe personal use and restrict redistribution. Imported subscriber files must remain separate from SPino's distributable catalogue.

## Questions for Musora

Ask [Musora support](https://www.musora.com/contact), at `support@musora.com`, whether they support:

- Delegated subscriber authentication for a third-party mobile app.
- An API that identifies which lesson resources the subscriber may download.
- Local storage and display of those files in an independent practice notebook.
- A native app integration without a SPino backend or embedded client secret.
- A technical partnership with explicit permitted formats, retention rules and fees.

Until those points are confirmed, use supported downloads and local import. Do not implement a downloader by extracting session cookies, bypassing unavailable download controls or relying on undocumented authenticated endpoints.
