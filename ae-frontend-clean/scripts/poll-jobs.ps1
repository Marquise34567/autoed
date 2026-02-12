$max = 24
for ($i = 0; $i -lt $max; $i++) {
  try {
    $body = @{ fileUrl = 'https://example.com/test.mp4' } | ConvertTo-Json
    $resp = Invoke-RestMethod -Uri 'https://autoed-backend-production.up.railway.app/jobs' -Method Post -Body $body -ContentType 'application/json' -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    Write-Output "TRY:$i OK"
    Write-Output $resp
    break
  } catch {
    Write-Output "TRY:$i ERROR: $($_.Exception.Message)"
  }
  Start-Sleep -Seconds 5
}
