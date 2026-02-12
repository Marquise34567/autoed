Write-Host "Running git push script in: $(Get-Location)"
Write-Host "--- git rev-parse --show-toplevel ---"
$top = git rev-parse --show-toplevel 2>&1
Write-Host $top
if ($LASTEXITCODE -ne 0) {
  Write-Host "Not a git repo - initializing..."
  git init
  git branch -M main
  try {
    git remote add origin https://github.com/Marquise34567/autoeddd.git 2>$null
  } catch {
    Write-Host "Remote add may have failed or origin exists."
  }
} else {
  Write-Host "Already in a git repo."
}

Write-Host "--- git status ---"
git status

Write-Host "--- git add . ---"
git add .

Write-Host "--- git commit ---"
# Try to commit; allow no-op
try {
  git commit -m 'Fix auth redirect, remove api/auth calls, connect backend via NEXT_PUBLIC_BACKEND_URL'
} catch {
  Write-Host 'Commit step returned non-zero (likely no changes to commit).'
}

Write-Host "--- git remote -v ---"
git remote -v

Write-Host '--- git push -u origin main ---'
$pushOutput = git push -u origin main 2>&1
Write-Host $pushOutput
if ($LASTEXITCODE -ne 0) {
  Write-Host "Push failed with exit code $LASTEXITCODE. Attempting git pull --rebase origin main..."
  $pull = git pull --rebase origin main 2>&1
  Write-Host $pull
  Write-Host 'Retrying git push...'
  $push2 = git push -u origin main 2>&1
  Write-Host $push2
}

Write-Host 'Script finished.'