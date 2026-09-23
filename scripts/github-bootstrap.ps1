param(
    [Parameter(Position = 0)]
    [string]$RepositoryName = "",

    [Parameter(Position = 1)]
    [string]$Visibility = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version 2.0

$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $ProjectRoot

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Require-Command {
    param(
        [string]$Name,
        [string]$InstallUrl
    )

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name is required but was not found in PATH. Install it from: $InstallUrl"
    }
}

function Invoke-External {
    param(
        [string]$Command,
        [string[]]$Arguments = @()
    )

    # Native tools such as gh/git can write to stderr for ordinary failures.
    # With ErrorActionPreference=Stop, Windows PowerShell can turn that stderr
    # into a terminating PowerShell error before we can inspect LASTEXITCODE.
    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        & $Command @Arguments
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    if ($exitCode -ne 0) {
        throw "Command failed with exit code ${exitCode}: $Command $($Arguments -join ' ')"
    }
}

function Get-ExternalExitCode {
    param(
        [string]$Command,
        [string[]]$Arguments = @(),
        [switch]$Quiet
    )

    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "SilentlyContinue"
        if ($Quiet) {
            & $Command @Arguments *> $null
        }
        else {
            & $Command @Arguments
        }
        $exitCode = $LASTEXITCODE
    }
    catch {
        # A probe command is allowed to fail. Convert any PowerShell-level
        # native-command error into a normal non-zero exit code.
        if ($LASTEXITCODE -is [int] -and $LASTEXITCODE -ne 0) {
            $exitCode = $LASTEXITCODE
        }
        else {
            $exitCode = 1
        }
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    return [int]$exitCode
}

function Test-ExternalSuccess {
    param(
        [string]$Command,
        [string[]]$Arguments = @()
    )

    return ((Get-ExternalExitCode -Command $Command -Arguments $Arguments -Quiet) -eq 0)
}

function Get-ExternalOutput {
    param(
        [string]$Command,
        [string[]]$Arguments = @()
    )

    $previousPreference = $ErrorActionPreference
    try {
        $ErrorActionPreference = "Continue"
        $output = @(& $Command @Arguments)
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousPreference
    }

    if ($exitCode -ne 0) {
        throw "Command failed with exit code ${exitCode}: $Command $($Arguments -join ' ')"
    }

    return $output
}

function Get-OriginRepositoryName {
    if (-not (Test-Path ".git")) {
        return $null
    }

    if (-not (Test-ExternalSuccess "git" @("remote", "get-url", "origin"))) {
        return $null
    }

    $origin = ((Get-ExternalOutput "git" @("remote", "get-url", "origin")) -join "`n")
    if ([string]::IsNullOrWhiteSpace($origin)) {
        return $null
    }

    $origin = $origin.Trim()
    if ($origin -match "github\.com[:/](?<owner>[^/]+)/(?<repo>[^/]+?)(?:\.git)?$") {
        return $Matches.repo
    }

    return $null
}

function Write-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Text
    )

    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Text, $encoding)
}

try {
    Write-Host "ScamScent GitHub Bootstrap" -ForegroundColor Magenta
    Write-Host "Project: $ProjectRoot"

    Write-Step "Checking required tools"
    Require-Command "git" "https://git-scm.com/download/win"
    Require-Command "node" "https://nodejs.org/"
    Require-Command "npm" "https://nodejs.org/"
    Require-Command "gh" "https://cli.github.com/"

    $nodeVersion = ((Get-ExternalOutput "node" @("--version")) -join "`n").Trim()
    $gitVersion = ((Get-ExternalOutput "git" @("--version")) -join "`n").Trim()
    $ghVersion = (Get-ExternalOutput "gh" @("--version") | Select-Object -First 1).Trim()
    Write-Host "Node: $nodeVersion"
    Write-Host "Git : $gitVersion"
    Write-Host "GH  : $ghVersion"

    Write-Step "Checking GitHub authentication"
    if (-not (Test-ExternalSuccess "gh" @("auth", "status", "--hostname", "github.com"))) {
        Write-Host "GitHub login is required. A browser sign-in will open." -ForegroundColor Yellow
        Invoke-External "gh" @("auth", "login", "--hostname", "github.com", "--git-protocol", "https", "--web", "--scopes", "workflow")
    }

    Invoke-External "gh" @("auth", "setup-git")

    # Existing logins are left unchanged here. If a workflow-scope issue blocks push,
    # the push step refreshes that scope once and retries.

    $owner = ((Get-ExternalOutput "gh" @("api", "user", "--jq", ".login")) -join "`n").Trim()
    if ([string]::IsNullOrWhiteSpace($owner)) {
        throw "Could not determine the authenticated GitHub username."
    }

    $userId = ((Get-ExternalOutput "gh" @("api", "user", "--jq", ".id")) -join "`n").Trim()

    if ([string]::IsNullOrWhiteSpace($RepositoryName)) {
        $RepositoryName = Get-OriginRepositoryName
    }
    if ([string]::IsNullOrWhiteSpace($RepositoryName)) {
        $entered = Read-Host "Repository name [scamscent]"
        if ([string]::IsNullOrWhiteSpace($entered)) {
            $RepositoryName = "scamscent"
        }
        else {
            $RepositoryName = $entered.Trim()
        }
    }

    if ($RepositoryName -match '[\\/:*?"<>|]') {
        throw "Repository name contains an invalid character: $RepositoryName"
    }

    if ([string]::IsNullOrWhiteSpace($Visibility)) {
        $enteredVisibility = Read-Host "Visibility [public/private, default public]"
        if ([string]::IsNullOrWhiteSpace($enteredVisibility)) {
            $Visibility = "public"
        }
        else {
            $Visibility = $enteredVisibility.Trim().ToLowerInvariant()
        }
    }
    else {
        $Visibility = $Visibility.Trim().ToLowerInvariant()
    }

    if ($Visibility -notin @("public", "private")) {
        throw "Visibility must be 'public' or 'private'."
    }

    $fullRepository = "$owner/$RepositoryName"
    if ($RepositoryName.ToLowerInvariant() -eq "$owner.github.io".ToLowerInvariant()) {
        $siteUrl = "https://$owner.github.io/"
    }
    else {
        $siteUrl = "https://$owner.github.io/$RepositoryName/"
    }

    Write-Host ""
    Write-Host "Repository : $fullRepository"
    Write-Host "Visibility : $Visibility"
    Write-Host "Site URL   : $siteUrl"

    Write-Step "Preparing the local Git repository"
    if (-not (Test-Path ".git")) {
        Invoke-External "git" @("init")
    }
    Invoke-External "git" @("branch", "-M", "main")

    if (-not (Test-ExternalSuccess "git" @("config", "user.name"))) {
        Invoke-External "git" @("config", "user.name", $owner)
    }

    if (-not (Test-ExternalSuccess "git" @("config", "user.email"))) {
        $noreply = "$userId+$owner@users.noreply.github.com"
        Invoke-External "git" @("config", "user.email", $noreply)
    }

    Write-Step "Creating or connecting the GitHub repository"
    $repoExists = Test-ExternalSuccess "gh" @("repo", "view", $fullRepository, "--json", "nameWithOwner")

    if (-not $repoExists) {
        $createArgs = @("repo", "create", $fullRepository, "--description", "ScamScent - privacy-friendly scam risk signal analyzer")
        if ($Visibility -eq "private") {
            $createArgs += "--private"
        }
        else {
            $createArgs += "--public"
        }
        Invoke-External "gh" $createArgs
        Write-Host "Created: https://github.com/$fullRepository" -ForegroundColor Green
    }
    else {
        Write-Host "Existing repository found: https://github.com/$fullRepository"
    }

    if (-not (Test-ExternalSuccess "git" @("remote", "get-url", "origin"))) {
        Invoke-External "git" @("remote", "add", "origin", "https://github.com/$fullRepository.git")
    }
    else {
        Invoke-External "git" @("remote", "set-url", "origin", "https://github.com/$fullRepository.git")
    }

    Invoke-External "gh" @("repo", "set-default", $fullRepository)

    Write-Step "Writing the real GitHub Pages URL"
    $configPath = Join-Path $ProjectRoot "site.config.json"
    if (-not (Test-Path $configPath)) {
        throw "site.config.json was not found."
    }

    $config = Get-Content -Raw -LiteralPath $configPath | ConvertFrom-Json
    $config.siteUrl = $siteUrl
    $configJson = ($config | ConvertTo-Json -Depth 20) + [Environment]::NewLine
    Write-Utf8NoBom $configPath $configJson

    if (-not (Test-ExternalSuccess "gh" @("repo", "edit", $fullRepository, "--homepage", $siteUrl))) {
        Write-Host "NOTE: Could not set the repository homepage URL. This does not block deployment." -ForegroundColor DarkYellow
    }

    Write-Step "Installing dependencies and building"
    if (Test-Path "package-lock.json") {
        Invoke-External "npm" @("ci")
    }
    else {
        Invoke-External "npm" @("install")
    }

    $oldSiteUrl = $env:SITE_URL
    try {
        $env:SITE_URL = $siteUrl
        Invoke-External "npm" @("run", "build")
    }
    finally {
        if ($null -eq $oldSiteUrl) {
            Remove-Item Env:SITE_URL -ErrorAction SilentlyContinue
        }
        else {
            $env:SITE_URL = $oldSiteUrl
        }
    }

    if (-not (Test-Path "dist/index.html")) {
        throw "Build completed without dist/index.html."
    }

    # If this ZIP is unpacked into a new folder while the GitHub repository already
    # exists, the local repository starts with unrelated history. Re-anchor HEAD to
    # origin/main while leaving the current project files untouched. This preserves
    # the remote history and turns the current ZIP contents into a normal update
    # commit instead of requiring a force push.
    $remoteMainExit = Get-ExternalExitCode "git" @("ls-remote", "--exit-code", "--heads", "origin", "main") -Quiet
    $remoteMainExists = ($remoteMainExit -eq 0)

    if ($remoteMainExists) {
        Write-Step "Syncing with the existing GitHub history"
        Invoke-External "git" @("fetch", "origin", "main")

        $localHeadExists = Test-ExternalSuccess "git" @("rev-parse", "--verify", "HEAD")
        $canFastForward = $false
        if ($localHeadExists) {
            $ancestorExit = Get-ExternalExitCode "git" @("merge-base", "--is-ancestor", "origin/main", "HEAD") -Quiet
            $canFastForward = ($ancestorExit -eq 0)
        }

        if (-not $canFastForward) {
            Write-Host "Existing remote history detected. Keeping the current project files and attaching them to origin/main." -ForegroundColor Yellow
            Invoke-External "git" @("reset", "--mixed", "origin/main")
        }
    }

    Write-Step "Committing project files"
    Invoke-External "git" @("add", "-A")
    $diffExit = Get-ExternalExitCode "git" @("diff", "--cached", "--quiet") -Quiet

    if ($diffExit -eq 1) {
        $commitMessage = if ($remoteMainExists) { "Update ScamScent project" } else { "Initial ScamScent GitHub Pages setup" }
        Invoke-External "git" @("commit", "-m", $commitMessage)
    }
    elseif ($diffExit -ne 0) {
        throw "Could not inspect staged Git changes."
    }
    else {
        Write-Host "No new files to commit."
    }

    Write-Step "Pushing main to GitHub"
    $pushExit = Get-ExternalExitCode "git" @("push", "-u", "origin", "main")
    if ($pushExit -ne 0) {
        Write-Host "Initial push failed. Refreshing the GitHub workflow scope once, then retrying..." -ForegroundColor Yellow
        Invoke-External "gh" @("auth", "refresh", "--hostname", "github.com", "--scopes", "workflow")
        Invoke-External "gh" @("auth", "setup-git")
        Invoke-External "git" @("push", "-u", "origin", "main")
    }

    Write-Step "Enabling GitHub Pages with GitHub Actions"
    $pagesExists = Test-ExternalSuccess "gh" @("api", "repos/$fullRepository/pages")
    if ($pagesExists) {
        Invoke-External "gh" @("api", "-X", "PUT", "repos/$fullRepository/pages", "-f", "build_type=workflow")
    }
    else {
        Invoke-External "gh" @("api", "-X", "POST", "repos/$fullRepository/pages", "-f", "build_type=workflow")
    }

    Write-Step "Starting the deployment workflow"
    if (-not (Test-ExternalSuccess "gh" @("workflow", "run", "deploy.yml", "--repo", $fullRepository))) {
        Write-Host "NOTE: The manual workflow trigger failed, but the push itself also triggers deployment." -ForegroundColor DarkYellow
    }

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "BOOTSTRAP COMPLETE" -ForegroundColor Green
    Write-Host "Repository: https://github.com/$fullRepository"
    Write-Host "Website   : $siteUrl"
    Write-Host "Actions   : https://github.com/$fullRepository/actions"
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "For later updates, run push.cmd."
    exit 0
}
catch {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host "BOOTSTRAP FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Fix the message above and run github-bootstrap.cmd again."
    exit 1
}
