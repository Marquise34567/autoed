# fix-git-and-push.ps1
# Locate git repo root, commit if needed, ensure origin, and push current branch.
Set-StrictMode -Version Latest

function Write-Status {
  param([string]$msg)
  Write-Host "[STATUS] $msg"
}

function Write-ErrorExit {
  param([string]$msg)
  Write-Host "[ERROR] $msg" -ForegroundColor Red
  exit 1
}

function Convert-ToHttpsGithubBase {
  param([string]$url)
  if (-not $url) { return $null }

  $u = $url.Trim()

  # git@github.com:owner/repo.git
  if ($u -match '^git@github\.com:(.+)/(.+?)(\.git)?$') {
    $owner = $Matches[1]
    $repo = $Matches[2]
    return "https://github.com/$owner/$repo"
  }

  # https://github.com/owner/repo(.git)
  if ($u -match '^https?://github\.com/(.+)/(.+?)(\.git)?$') {
    $owner = $Matches[1]
    $repo = $Matches[2]
    return "https://github.com/$owner/$repo"
  }

  # ssh://git@github.com/owner/repo(.git)
  if ($u -match '^ssh://git@github\.com/(.+)/(.+?)(\.git)?$') {
    $owner = $Matches[1]
    $repo = $Matches[2]
    return "https://github.com/$owner/$repo"
  }

  return $null
}

# 1) Try git rev-parse --show-toplevel
Write-Status "Checking current directory for git repository..."
$top = git rev-parse --show-toplevel 2>$null
if ($LASTEXITCODE -eq 0 -and $top) {
  $repoRoot = ($top).Trim()
  Write-Status "Found repo root: $repoRoot"
  Set-Location $repoRoot
} else {
  Write-Status "Not in a git repo. Searching for .git folders in current, Downloads, and Documents..."
  $searchPaths = @((Get-Location).Path, (Join-Path $env:USERPROFILE 'Downloads'), (Join-Path $env:USERPROFILE 'Documents')) | Select-Object -Unique

  $found = @()
  foreach ($p in $searchPaths) {
    if (-not (Test-Path $p)) { continue }
    Write-Status "Searching: $p"
    try {
      $items = Get-ChildItem -Path $p -Directory -Recurse -Force -Filter ".git" -ErrorAction SilentlyContinue
      foreach ($it in $items) {
        $full = $it.FullName
        if (-not ($found -contains $full)) { $found += $full }
      }
    } catch {
      # ignore errors per search
    }
  }

  if (-not $found -or $found.Count -eq 0) {
    Write-ErrorExit "No .git directories found in current location, Downloads, or Documents."
  }

  # Build candidate list (parent of .git) and score them; require package.json
  $candidates = @()
  foreach ($g in $found) {
    $parent = Split-Path $g -Parent
    $score = 0
    $hasPackage = Test-Path (Join-Path $parent 'package.json')
    if ($hasPackage) { $score += 100 } else { $score += 0 }
    if (Test-Path (Join-Path $parent 'routes')) { $score += 10 }
    if (Test-Path (Join-Path $parent 'services')) { $score += 10 }
    if (Test-Path (Join-Path $parent 'index.js')) { $score += 5 }
    if (Test-Path (Join-Path $parent 'server.js')) { $score += 5 }
    $candidates += [PSCustomObject]@{ Path = $parent; Score = $score; HasPackage = $hasPackage }
  }

  # Filter to only those that contain package.json (per requirement)
  $withPackage = $candidates | Where-Object { $_.HasPackage } | Sort-Object -Property Score -Descending
  if ($withPackage -and $withPackage.Count -gt 0) {
    $best = $withPackage | Select-Object -First 1
    $repoRoot = $best.Path
    Write-Status "Selected candidate with package.json: $repoRoot (score $($best.Score))"
    Set-Location $repoRoot
  } else {
    Write-Host ""
    Write-Host "Found .git parents (no candidate contained package.json):"
    foreach ($c in $candidates) { Write-Host " - $($c.Path)" }
    Write-ErrorExit "No candidate repository root containing 'package.json' found. Aborting."
  }
}

# 2) After Set-Location, run git status and determine current branch
Write-Status "Running 'git status' to validate repository..."
$gitStatus = git status 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host $gitStatus
  Write-ErrorExit "'git status' failed in the selected directory. Ensure this is a git repository."
}
Write-Host $gitStatus

# Determine branch using required method: 'git branch --show-current'
$branchRaw = git branch --show-current 2>$null
if (-not $branchRaw -or $branchRaw.Trim().Length -eq 0) {
  # Detached HEAD — per requirement use 'HEAD'
  $branch = 'HEAD'
  $branchDisplay = 'HEAD (detached)'
} else {
  $branch = $branchRaw.Trim()
  $branchDisplay = $branch
}
Write-Status "Current branch: $branchDisplay"

# 3) Ensure origin exists early so we can print it alongside other info
Write-Status "Checking for 'origin' remote..."
$originUrl = git remote get-url origin 2>$null
if ($LASTEXITCODE -ne 0 -or -not $originUrl) {
  $repoUrl = Read-Host "Origin remote missing. Paste GitHub repo URL to add as 'origin' (e.g. https://github.com/owner/repo.git or git@github.com:owner/repo.git)"
  if (-not $repoUrl -or $repoUrl.Trim().Length -eq 0) {
    Write-ErrorExit "No URL provided for origin. Aborting."
  }
  git remote add origin $repoUrl
  if ($LASTEXITCODE -ne 0) { Write-ErrorExit "Failed to add origin remote." }
  $originUrl = $repoUrl
  Write-Status "Added origin: $originUrl"
} else {
  Write-Status "Origin remote found: $originUrl"
}

# 4) Show diagnostic info required by user
$repoRootResolved = (git rev-parse --show-toplevel 2>$null)
if (-not $repoRootResolved) { $repoRootResolved = (Get-Location).Path }

Write-Host "";
Write-Host "Repository root: $repoRootResolved"
Write-Host "Branch: $branchDisplay"
Write-Host "Origin URL: $originUrl"

Write-Host "\nLast 3 commits:" 
$last3 = git log -3 --oneline 2>$null
if ($LASTEXITCODE -ne 0 -or -not $last3) { Write-Host "  (unable to show commits)" } else { Write-Host $last3 }

Write-Host "\nCurrent git status (porcelain):"
$porcelain = git status --porcelain 2>$null
if ($porcelain -and $porcelain.Trim().Length -gt 0) { Write-Host $porcelain } else { Write-Host "  (clean)" }

# 5) Stage + commit only if there are changes
if ($porcelain -and $porcelain.Trim().Length -gt 0) {
  Write-Status "Changes detected. Staging all changes..."
  git add .
  if ($LASTEXITCODE -ne 0) { Write-ErrorExit "git add failed." }

  Write-Status "Committing changes with message 'sync'..."
  git commit -m "sync"
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "git commit failed. 'git status --porcelain' output:"
    Write-Host $porcelain
    Write-ErrorExit "Commit failed. Resolve issues and re-run the script."
  } else {
    Write-Status "Commit created."
    # update porcelain after commit
    $porcelain = git status --porcelain 2>$null
  }
} else {
  Write-Status "No changes to commit."
}

# 6) Push: if we have a branch name, push it; else push HEAD
if ($branch -and $branch -ne 'HEAD') {
  Write-Status "Pushing branch '$branch' to origin..."
  git push -u origin $branch
} else {
  Write-Status "Detached HEAD; pushing current HEAD to origin..."
  git push -u origin HEAD
}

if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Push failed. Repository: $repoRootResolved"
  Write-Host "Branch (push ref): $branch"
  Write-Host "Origin: $originUrl"
  Write-Host "Last git status (porcelain):"
  if ($porcelain -and $porcelain.Trim().Length -gt 0) { Write-Host $porcelain } else { Write-Host "  (clean)" }
  Write-ErrorExit "git push returned a non-zero exit code. Check authentication/network/permissions."
}
Write-Status "Push successful."

# 6) Print final info: repo root, branch, branch URL
$repoRootResolved = (git rev-parse --show-toplevel 2>$null)
if (-not $repoRootResolved) { $repoRootResolved = (Get-Location).Path }

$base = Convert-ToHttpsGithubBase $originUrl
if ($base) {
  $branchUrl = "$base/tree/$branch"
  Write-Host ""
  Write-Host "Repository root: $repoRootResolved"
  Write-Host "Branch: $branch"
  Write-Host "Branch URL: $branchUrl"
} else {
  Write-Host ""
  Write-Host "Repository root: $repoRootResolved"
  Write-Host "Branch: $branch"
  Write-Host "Origin URL (unrecognized as GitHub SSH/HTTPS): $originUrl"
}

Write-Host ""
Write-Host "DONE"
exit 0
