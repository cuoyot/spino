# Pending session visibility — 2026-10-21

Responsive browser evidence only, using a disposable synthetic notebook. No personal notebook, APK, native-device acceptance or publication is included.

The owner requested consistent unfinished-session presentation on Today, Practice and Calendar, plus a persistent indicator on the Practice menu icon. The existing Today/Practice focus card now also replaces the generic notice on other browsing destinations. It displays the same title, elapsed time, context and Resume session action. Session overview and active practice retain their controls. The icon dot has an accessible pending-session description and clears when the session is discarded.

Production build, four agenda unit checks and three browser checks pass: pending-session, today-focus and profile-navigation. The new regression visits Today, Practice, Calendar, Library, Progress and Profile at phone/tablet portrait/landscape, checks one matching card, accessible indicator and no horizontal overflow, resumes the original session and checks removal after discard. Twelve screenshots cover the three requested destinations. `verification.json` retains the synthetic fixture and results; `source.json` records source and screenshot hashes.

Owner visual acceptance and native verification remain open.
