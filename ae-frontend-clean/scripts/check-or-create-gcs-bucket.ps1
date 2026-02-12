<#
PowerShell helper: check-or-create-gcs-bucket.ps1

Usage examples:
  # Just check existence
  .\check-or-create-gcs-bucket.ps1 -BucketName my-bucket-name

  # Create if missing (requires appropriate permissions)
  .\check-or-create-gcs-bucket.ps1 -BucketName my-bucket-name -CreateIfMissing -Location US -Project my-gcp-project

Returns exit codes:
  0 = bucket exists (or was successfully created and verified)
  2 = gsutil not found
  3 = bucket does not exist
  4 = attempted creation failed
#>

param(
    [Parameter(Mandatory = $true)]
    [string]$BucketName,

    [switch]$CreateIfMissing,

    [string]$Location = "US",

    [string]$Project = ""
)

function Write-Info($s) { Write-Host "[info] $s" }
function Write-Warn($s) { Write-Warning $s }
function Write-Err($s) { Write-Error $s }

# Ensure gsutil exists
if (-not (Get-Command gsutil -ErrorAction SilentlyContinue)) {
    Write-Err "gsutil not found. Install Google Cloud SDK and authenticate (https://cloud.google.com/sdk/docs)."
    exit 2
}

$target = if ($BucketName -like 'gs://*') { $BucketName } else { "gs://$BucketName" }

Write-Info "Checking bucket: $target"

try {
    $out = & gsutil ls $target 2>&1
    $exit = $LASTEXITCODE
} catch {
    $out = $_.Exception.Message
    $exit = 1
}

if ($exit -eq 0) {
    Write-Info "Bucket exists. Listing (first lines):"
    $out -split "\r?\n" | Select-Object -First 10 | ForEach-Object { Write-Host "  $_" }
    exit 0
}

Write-Warn "Bucket not found or inaccessible: exit=$exit"
Write-Info "gsutil output:"
$out -split "\r?\n" | ForEach-Object { Write-Host "  $_" }

if (-not $CreateIfMissing) {
    Write-Err "Bucket missing. Rerun with -CreateIfMissing to attempt creation."
    exit 3
}

# Attempt creation
Write-Info "Attempting to create bucket: $target (location: $Location)"
$createArgs = @('mb')
if ($Project -ne '') { $createArgs += "-p"; $createArgs += $Project }
$createArgs += "-l"; $createArgs += $Location
$createArgs += $target

try {
    $createOutput = & gsutil @createArgs 2>&1
    $createExit = $LASTEXITCODE
} catch {
    $createOutput = $_.Exception.Message
    $createExit = 1
}

if ($createExit -ne 0) {
    Write-Err "Failed to create bucket (exit=$createExit)"
    $createOutput -split "\r?\n" | ForEach-Object { Write-Host "  $_" }
    exit 4
}

Write-Info "Creation command succeeded; verifying..."
try {
    $verifyOut = & gsutil ls $target 2>&1
    $verifyExit = $LASTEXITCODE
} catch {
    $verifyOut = $_.Exception.Message
    $verifyExit = 1
}

if ($verifyExit -eq 0) {
    Write-Info "Bucket created and verified successfully."
    exit 0
} else {
    Write-Err "Bucket created but verification failed (exit=$verifyExit)"
    $verifyOut -split "\r?\n" | ForEach-Object { Write-Host "  $_" }
    exit 4
}
