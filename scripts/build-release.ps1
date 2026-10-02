# Builds the signed Android App Bundle (.aab) for Google Play with the portable toolchain.
# Needs android/keystore.properties (scripts/create-upload-key.ps1). Raise versionCode in
# android/app/build.gradle before every upload: Play rejects a versionCode it has already seen.
$ErrorActionPreference = 'Stop'
$root = "$env:USERPROFILE\Android"
$env:JAVA_HOME = "$root\jdk"
$env:ANDROID_HOME = "$root\sdk"
New-Item -ItemType Directory -Force "$root\tmp" | Out-Null
$env:JAVA_TOOL_OPTIONS = "-Djdk.net.unixdomain.tmpdir=$root\tmp"
Set-Location (Split-Path $PSScriptRoot)
if (-not (Test-Path android\keystore.properties)) { throw 'android\keystore.properties is missing. Run scripts\create-upload-key.ps1 first.' }
npx vite build
if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
npx cap sync android
if ($LASTEXITCODE -ne 0) { throw 'Android synchronisation failed.' }
Push-Location android
try {
  .\gradlew.bat bundleRelease --console=plain
  if ($LASTEXITCODE -ne 0) { throw 'Release build failed.' }
} finally { Pop-Location }
$gradle = Get-Content android\app\build.gradle -Raw
$code = [regex]::Match($gradle, 'versionCode\s+(\d+)').Groups[1].Value
$name = [regex]::Match($gradle, 'versionName\s+"([^"]+)"').Groups[1].Value
$out = "SPino-$name-$code.aab"
Copy-Item android\app\build\outputs\bundle\release\app-release.aab $out -Force
Write-Host "Bundle: $(Resolve-Path $out)"
