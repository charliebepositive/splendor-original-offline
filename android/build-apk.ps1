param([switch]$SkipLint)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolRoot = Join-Path $projectRoot '.android-tools'
$jdkRoot = Get-ChildItem (Join-Path $toolRoot 'jdk-ready') -Directory | Select-Object -First 1
$gradleRoot = Join-Path $toolRoot 'gradle-ready/gradle-8.13'
$sdkRoot = Join-Path $toolRoot 'sdk'
if (-not $jdkRoot -or -not (Test-Path (Join-Path $gradleRoot 'bin/gradle.bat')) -or -not (Test-Path (Join-Path $sdkRoot 'build-tools/35.0.0/apksigner.bat'))) {
    throw 'Missing project-local JDK, Gradle or Android SDK. See android/README.md.'
}
$env:JAVA_HOME = $jdkRoot.FullName
$env:ANDROID_HOME = $sdkRoot
$env:GRADLE_USER_HOME = Join-Path $toolRoot 'gradle-cache'
$env:PATH = (Join-Path $env:JAVA_HOME 'bin') + ';' + $env:PATH
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'local.properties'), 'sdk.dir=' + $sdkRoot.Replace('\','/').Replace(':','\:') + "`n")
$tasks = @('assembleRelease')
if (-not $SkipLint) { $tasks += 'lintRelease' }
& (Join-Path $gradleRoot 'bin/gradle.bat') -p $PSScriptRoot --no-daemon --console=plain @tasks
if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
$artifact = Join-Path $PSScriptRoot 'app/build/outputs/apk/release/app-release.apk'
$dist = Join-Path $projectRoot 'dist'
New-Item -ItemType Directory -Force $dist | Out-Null
$target = Join-Path $dist 'Splendor-Offline-1.0.0.apk'
Copy-Item -LiteralPath $artifact -Destination $target -Force
& (Join-Path $sdkRoot 'build-tools/35.0.0/apksigner.bat') verify --verbose $target
if ($LASTEXITCODE -ne 0) { throw 'APK signature verification failed.' }
$hash = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLower()
[IO.File]::WriteAllText(($target + '.sha256'), $hash + '  ' + [IO.Path]::GetFileName($target) + "`n")
Write-Output ('APK ready: ' + $target)
