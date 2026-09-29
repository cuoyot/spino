# Builds the debug APK using the portable toolchain in %USERPROFILE%\Android.
$ErrorActionPreference = 'Stop'
$root = "$env:USERPROFILE\Android"
$env:JAVA_HOME = "$root\jdk"
$env:ANDROID_HOME = "$root\sdk"
# JDK 21 on Windows needs a plain dir for its internal unix-domain socket pipe
New-Item -ItemType Directory -Force "$root\tmp" | Out-Null
$env:JAVA_TOOL_OPTIONS = "-Djdk.net.unixdomain.tmpdir=$root\tmp"
Set-Location (Split-Path $PSScriptRoot)
npx vite build
npx cap sync android
Push-Location android
.\gradlew.bat assembleDebug --console=plain
Pop-Location
Copy-Item android\app\build\outputs\apk\debug\app-debug.apk SightReader.apk -Force
Write-Host "APK: $(Resolve-Path SightReader.apk)"
