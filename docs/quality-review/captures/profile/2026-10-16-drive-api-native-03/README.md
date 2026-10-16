# Beta10 native menu and retention review

Replacement-installed Android beta10/build63 on the existing emulator, preserving app storage. Navigation uses namespaced disposable IndexedDB/localStorage. Original logical stores and all previously present immutable blobs are compared before/after; no Google account is connected and no remote notebook is read or written. The installed native DriveNotebook plugin rejects external endpoints and unauthorized account requests before authorization. The actual Backup & sync menu shows Google connection and native local-file restore/export options.

[Native checks](native.json) are distinct from [synthetic API/browser flows](../2026-10-16-drive-api-02/verification.json). The final relaunch leaves MainActivity in the foreground on the isolated recording review route, avoiding initialization of the personal notebook. Real Google notebook migration and synchronization remain physical-device acceptance work.
