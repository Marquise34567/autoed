<#
apply-cors-auto.ps1

Automates: authenticate gcloud, set project, apply cors.json to bucket,
verify, retry, attempt fixes (create bucket if missing).

Usage (run locally):
  .\scripts\apply-cors-auto.ps1 -Project autoeditor-d4940 -Bucket autoeditor-d4940.firebasestorage.app -CorsFile .\scripts\cors.json

This script requires `gcloud` and `gsutil` installed and configured.
#>

param(
  [Parameter(Mandatory=$true)] [string]$Project,
  [Parameter(Mandatory=$true)] [string]$Bucket,
  [Parameter(Mandatory=$false)] [string]$CorsFile = "$PSScriptRoot\cors.json",
  [int]$MaxRetries = 3
)

function Info($s){ Write-Host "[info] $s" }
function Warn($s){ Write-Warning $s }
function Err($s){ Write-Error $s }

if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
  Err "gcloud CLI not found. Install Google Cloud SDK: https://cloud.google.com/sdk/docs"
  exit 2
}
if (-not (Get-Command gsutil -ErrorAction SilentlyContinue)) {
  Err "gsutil not found. Ensure Google Cloud SDK installed and in PATH."
  exit 2
}

Info "Ensuring gcloud authenticated (will prompt if not)."
try { & gcloud auth login --brief } catch { Info "gcloud auth login may require manual interaction." }

Info "Setting active project to $Project"
& gcloud config set project $Project
if ($LASTEXITCODE -ne 0) { Err "Failed to set project to $Project"; exit 3 }

Info "Checking bucket existence: gs://$Bucket"
function BucketExists() {
  try {
    & gsutil ls -b "gs://$Bucket" > $null 2>&1
    return $LASTEXITCODE -eq 0
  } catch { return $false }
}

if (-not (Test-Path $CorsFile)) { Err "CORS file not found: $CorsFile"; exit 4 }

$attempt = 0
while ($attempt -lt $MaxRetries) {
  $attempt++
  Info "Attempt $attempt/$MaxRetries"

  if (-not (BucketExists)) {
    Warn "Bucket gs://$Bucket not found. Attempting to create it (last resort)."
    try {
      & gsutil mb -p $Project -c STANDARD -l US "gs://$Bucket"
      if ($LASTEXITCODE -ne 0) { Warn "gsutil mb exited $LASTEXITCODE" } else { Info "Bucket created." }
    } catch {
      Warn "Bucket creation failed: $_"
    }
    Start-Sleep -Seconds 2
    if (-not (BucketExists)) { Warn "Bucket still missing after create attempt." } else { Info "Bucket exists now." }
  }

  if (-not (BucketExists)) {
    Warn "Bucket not found; retrying..."
    Start-Sleep -Seconds 2
    continue
  }

  Info "Applying CORS from $CorsFile to gs://$Bucket"
  & gsutil cors set $CorsFile "gs://$Bucket"
  $code = $LASTEXITCODE
  if ($code -ne 0) {
    Warn "gsutil cors set failed with exit code $code"
    # Attempt to diagnose common causes
    Info "Diagnosing permissions and project settings..."
    & gcloud config get-value project
    & gcloud auth list
    $attemptsLeft = $MaxRetries - $attempt
    if ($attemptsLeft -gt 0) { Info "Retrying in 3s..."; Start-Sleep -Seconds 3; continue } else { Err "Failed to apply CORS after $MaxRetries attempts"; exit 5 }
  }

  Info "CORS apply command succeeded; verifying..."
  & gsutil cors get "gs://$Bucket"
  if ($LASTEXITCODE -eq 0) {
    Info "CORS successfully applied to gs://$Bucket"
    exit 0
  } else {
    Warn "gsutil cors get returned exit code $LASTEXITCODE; retrying..."
    Start-Sleep -Seconds 2
  }
}

Err "Exhausted attempts; CORS not applied."
exit 6
