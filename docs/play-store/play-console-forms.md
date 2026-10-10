# Play Console forms: answers for SPino

Answers for the declarations in **Play Console → Policy and programs → App content**, based on the code as of
2 October 2026 (version 5.0.0, versionCode 29). Re-check them whenever a feature adds network access, accounts,
analytics, ads or new permissions.

## Privacy policy

`https://spino.pages.dev/privacy/` (support contact `support@spinoapp.com`). See README for hosting.

## Ads

**Does your app contain ads?** No.

## App access

**All functionality is available without special access.** No login, no account, no paid content.

## Content rating (IARC questionnaire)

| Question | Answer |
|---|---|
| Category | Reference, News, or Educational |
| Violence, blood, sexual content, nudity, profanity, drugs, alcohol, tobacco | No |
| Gambling or simulated gambling | No |
| Users can interact or exchange content with other users | No |
| Shares the user's location with other users | No |
| Allows purchases of digital goods | No |
| Unrestricted internet access (web browser, search) | No (only score downloads from fixed public sources; external links open the device browser) |
| Miscellaneous (horror, fear, crude humour) | No |

Expected result: PEGI 3 / ESRB Everyone / USK 0.

## Target audience and content

* **Target age groups:** 13–15, 16–17 and 18+ (recommended for the first release).
  Including ages under 13 brings the app into the **Families** policy (teacher-approved review, stricter
  requirements for third-party content and links). SPino collects no data, so it can qualify later, but the
  external licence/source links and downloads from third-party sites must then be reviewed first.
* **Could the app unintentionally appeal to children?** No: a practice tool without characters or game mechanics.

## Data safety

| Section | Answer | Why |
|---|---|---|
| Does your app collect or share any of the required user data types? | **No** | Notebook, scores and settings stay in app-private storage on the device; nothing is sent to the developer or to third parties. |
| Is all user data encrypted in transit? | Yes (no user data is transmitted; score downloads use HTTPS) | |
| Do you provide a way for users to request that their data is deleted? | Yes — in-app (*Profile → Manage local data*) and by uninstalling | |

Notes for the reviewer-facing answers:

* **Optional backup / shared notebook**: the user picks a file through Android's Storage Access Framework
  (`ACTION_CREATE_DOCUMENT` / `ACTION_OPEN_DOCUMENT`). The transfer is initiated by the user to a provider of
  their choice, which Google's Data safety guidance treats as user-initiated and not as collection or sharing.
* **Score downloads**: requests to public sources include no user data.
* **Bluetooth**: used only to connect MIDI keyboards; `BLUETOOTH_SCAN` declares `neverForLocation`.
* **Location**: `ACCESS_FINE_LOCATION` is limited to `maxSdkVersion 30` (Bluetooth scanning on Android ≤ 11).
  No location is collected; declare "Location: not collected".

## Government apps, financial features, health

Not applicable (answer No to each).

## News app

No.

## Permissions declarations

No sensitive-permission declaration form is needed: SPino does not request SMS, call log, all-files access,
exact alarms, background location, accessibility or query-all-packages.

| Permission | Purpose shown to users |
|---|---|
| `BLUETOOTH_SCAN` (`neverForLocation`), `BLUETOOTH_CONNECT` | Connect Bluetooth MIDI keyboards |
| `BLUETOOTH`, `BLUETOOTH_ADMIN`, `ACCESS_FINE_LOCATION` (all `maxSdkVersion 30`) | Bluetooth MIDI scanning on Android 11 and older |
| `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED` | Practice reminders, restored after a restart |
| `INTERNET`, `ACCESS_NETWORK_STATE` | Score downloads and the Wi-Fi-only setting |

## Content and copyright

* Hanon exercises: C.-L. Hanon, *The Virtuoso Pianist* (1873), public domain; patterns checked against the
  Mutopia Project edition.
* Downloadable scores come from their original public sources with their licences shown in the app.
  **Before release, confirm the redistribution status of catalogue entries marked "pending review"** (for example
  some MuseTrainer MusicXML files list the composer/transcriber as awaiting verification). Hide them in the
  catalogue if their licence cannot be confirmed: Play can remove apps over copyright complaints.
