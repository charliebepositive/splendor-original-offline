param([string]$ApkPath)
$ErrorActionPreference='Stop'
$workspace=Split-Path -Parent $PSScriptRoot
if (-not $ApkPath) { $ApkPath=Join-Path $workspace 'dist/Splendor-Offline-1.0.0.apk' }
$ApkPath=(Resolve-Path -LiteralPath $ApkPath).Path
$buildTools=Join-Path $workspace '.android-tools/sdk/build-tools/35.0.0'
$jdk=Get-ChildItem (Join-Path $workspace '.android-tools/jdk-ready') -Directory | Select-Object -First 1
$env:JAVA_HOME=$jdk.FullName
$env:PATH=(Join-Path $env:JAVA_HOME 'bin')+';'+$env:PATH
& (Join-Path $buildTools 'apksigner.bat') verify --verbose --print-certs $ApkPath
if ($LASTEXITCODE -ne 0) { throw 'Invalid APK signature.' }
& (Join-Path $buildTools 'zipalign.exe') -c -P 16 4 $ApkPath
if ($LASTEXITCODE -ne 0) { throw 'APK alignment check failed.' }
$permissions=& (Join-Path $buildTools 'aapt.exe') dump permissions $ApkPath
if ($LASTEXITCODE -ne 0) { throw 'Could not read APK permissions.' }
if (($permissions -join "`n") -match 'android.permission.INTERNET') { throw 'Offline APK must not request INTERNET.' }
$badging=& (Join-Path $buildTools 'aapt.exe') dump badging $ApkPath
if ($LASTEXITCODE -ne 0) { throw 'Could not read APK metadata.' }
if (($badging -join "`n") -notmatch "package: name='com.local.splendor'") { throw 'Unexpected package identity.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip=[IO.Compression.ZipFile]::OpenRead($ApkPath)
try {
    $names=@($zip.Entries | ForEach-Object FullName)
    $cards=@($names | Where-Object { $_ -match '^assets/www/assets/cards/[^/]+\.png$' })
    if ($cards.Count -ne 90) { throw ('Expected 90 card images; got '+$cards.Count) }
    foreach($name in @('classes.dex','AndroidManifest.xml','assets/www/index.html','assets/www/js/platform.js','assets/www/js/engine.js','assets/www/css/android.css','assets/www/docs/rules.html','assets/www/docs/Splendor-EN.pdf')) {
        if ($name -notin $names) { throw ('Missing required packaged file: '+$name) }
    }
    if ('assets/www/sw.js' -in $names) { throw 'Android package must not ship a redundant Service Worker cache.' }
} finally { $zip.Dispose() }
$report=[ordered]@{
    file=[IO.Path]::GetFileName($ApkPath)
    sizeBytes=(Get-Item -LiteralPath $ApkPath).Length
    sha256=(Get-FileHash -LiteralPath $ApkPath -Algorithm SHA256).Hash.ToLower()
    cards=90
    signatureVerified=$true
    alignmentVerified=$true
    internetPermission=$false
    metadata=@($badging | Where-Object { $_ -match '^package:|^sdkVersion:|^targetSdkVersion:|^launchable-activity:' })
    deviceTest='No Android device connected; real-device installation/runtime not tested.'
}
$report | ConvertTo-Json -Depth 4 | Set-Content -Encoding utf8 (Join-Path (Split-Path $ApkPath) 'apk-verification.json')
$report | ConvertTo-Json -Depth 4
