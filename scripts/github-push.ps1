param(
    [Parameter(Position = 0)]
    [string]$CommitMessage = ""
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
    param([string]$Name, [string]$InstallUrl)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name is required but was not found in PATH. Install it from: $InstallUrl"
    }
}

function Invoke-External {
    param([string]$Command, [string[]]$Arguments = @())

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
    param([string]$Command, [string[]]$Arguments = @())
    return ((Get-ExternalExitCode -Command $Command -Arguments $Arguments -Quiet) -eq 0)
}

try {
    Write-Host "ScamScent Build + Push" -ForegroundColor Magenta

    Require-Command "git" "https://git-scm.com/download/win"
    Require-Command "node" "https://nodejs.org/"
    Require-Command "npm" "https://nodejs.org/"

    if (-not (Test-Path ".git")) {
        throw "Git is not initialized. Run github-bootstrap.cmd first."
    }

    if (-not (Test-ExternalSuccess "git" @("remote", "get-url", "origin"))) {
        throw "origin remote is not configured. Run github-bootstrap.cmd first."
    }

    Write-Step "Installing dependencies and building"
    if (Test-Path "package-lock.json") {
        Invoke-External "npm" @("ci")
    }
    else {
        Invoke-External "npm" @("install")
    }
    Invoke-External "npm" @("run", "build")

    if (-not (Test-Path "dist/index.html")) {
        throw "Build completed without dist/index.html."
    }

    Write-Step "Staging changes"
    Invoke-External "git" @("add", "-A")
    $diffExit = Get-ExternalExitCode "git" @("diff", "--cached", "--quiet") -Quiet

    if ($diffExit -eq 1) {
        if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
            $entered = Read-Host "Commit message [Update ScamScent]"
            if ([string]::IsNullOrWhiteSpace($entered)) {
                $CommitMessage = "Update ScamScent"
            }
            else {
                $CommitMessage = $entered
            }
        }

        Write-Step "Committing"
        Invoke-External "git" @("commit", "-m", $CommitMessage)
    }
    elseif ($diffExit -eq 0) {
        Write-Host "No changed files to commit."
    }
    else {
        throw "Could not inspect staged Git changes."
    }

    Write-Step "Pushing main"
    Invoke-External "git" @("branch", "-M", "main")
    Invoke-External "git" @("push", "-u", "origin", "main")

    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Green
    Write-Host "PUSH COMPLETE" -ForegroundColor Green
    Write-Host "Remote: $((& git remote get-url origin).Trim())"

    if (Get-Command gh -ErrorAction SilentlyContinue) {
        & gh run list --limit 1
    }

    Write-Host "============================================================" -ForegroundColor Green
    exit 0
}
catch {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host "PUSH FAILED" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
    exit 1
}
