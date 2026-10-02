# Creates the Google Play upload key and android/keystore.properties. Run it yourself, once, in a terminal:
#   powershell -ExecutionPolicy Bypass -File scripts\create-upload-key.ps1
# Keep a copy of the .jks file and its password somewhere safe (password manager). Losing it means asking
# Google Play support to reset the upload key; the app signing key itself is kept by Play App Signing.
param([string]$KeyStore = "$env:USERPROFILE\Android\spino-upload.jks", [string]$Alias = 'spino-upload')
$ErrorActionPreference = 'Stop'
$keytool = "$env:USERPROFILE\Android\jdk\bin\keytool.exe"
$properties = Join-Path (Split-Path $PSScriptRoot) 'android\keystore.properties'
if (Test-Path $KeyStore) { throw "$KeyStore already exists. Reuse it, or move it away first." }
$secure = Read-Host 'Choose a keystore password (min. 6 characters)' -AsSecureString
$password = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
if ($password.Length -lt 6) { throw 'The password needs at least 6 characters.' }
$name = Read-Host 'Your name or organisation for the certificate (e.g. Miguel Coll)'
& $keytool -genkeypair -v -keystore $KeyStore -alias $Alias -keyalg RSA -keysize 2048 -validity 10000 `
  -storepass $password -keypass $password -dname "CN=$name, O=SPino, C=ES"
if ($LASTEXITCODE -ne 0) { throw 'keytool failed.' }
@"
storeFile=$($KeyStore.Replace('\', '/'))
storePassword=$password
keyAlias=$Alias
keyPassword=$password
"@ | Set-Content -Encoding ascii $properties
Write-Host "Upload key: $KeyStore"
Write-Host "Signing settings: $properties (ignored by git)"
