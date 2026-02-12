$files = Get-ChildItem -Path . -Recurse -Filter *.js -File
foreach ($f in $files) {
  Write-Output '---'
  Write-Output $f.FullName
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = 'node'
  $psi.Arguments = "--check `"$($f.FullName)`""
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $p = [System.Diagnostics.Process]::Start($psi)
  $out = $p.StandardOutput.ReadToEnd() + $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  if ($p.ExitCode -eq 0) { Write-Output 'OK' } else { Write-Output $out }
}
