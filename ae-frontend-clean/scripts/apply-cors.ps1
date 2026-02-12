param(
  [Parameter(Mandatory=$true)] [string]$BucketName,
  [Parameter(Mandatory=$false)] [string]$CorsFile = "$PSScriptRoot\cors.json"
)

function Write-Info($s){ Write-Host "[info] $s" }
function Write-Err($s){ Write-Error $s }

if (-not (Get-Command gsutil -ErrorAction SilentlyContinue)) {
  Write-Err "gsutil not found. Install Google Cloud SDK and authenticate: https://cloud.google.com/sdk/docs"
  exit 2
}

if (-not (Test-Path $CorsFile)) {
  Write-Err "CORS file not found: $CorsFile"
  exit 3
}

$target = if ($BucketName -like 'gs://*') { $BucketName } else { "gs://$BucketName" }

Write-Info "Applying CORS from $CorsFile to $target"

try {
  & gsutil cors set $CorsFile $target
  $code = $LASTEXITCODE
} catch {
  Write-Err "gsutil cors set failed: $_"
  exit 1
}

if ($code -ne 0) {
  Write-Err "gsutil exited with code $code"
  exit $code
}

Write-Info "CORS set successfully; current CORS config:"
& gsutil cors get $target

exit 0
