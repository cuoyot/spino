# Boots the SightReader emulator (if needed), installs the APK and launches the app.
$root = "$env:USERPROFILE\Android"
$adb = "$root\sdk\platform-tools\adb.exe"
if (-not (& $adb devices | Select-String "emulator-")) {
  Start-Process "$root\sdk\emulator\emulator.exe" -ArgumentList '-avd', 'SightReader', '-no-boot-anim'
  & $adb wait-for-device
  while ((& $adb shell getprop sys.boot_completed) -notmatch '1') { Start-Sleep 2 }
}
& $adb install -r (Join-Path (Split-Path $PSScriptRoot) 'SightReader.apk')
& $adb shell am start -n com.miguelcoll.sightreader/.MainActivity
