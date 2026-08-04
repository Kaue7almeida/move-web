# Exporta as pecas de marketing (/marketing/*) em PNG usando Chrome headless.
# Pre-requisito: dev server rodando (npm run dev) na porta 3000.
# Uso: powershell -File scripts\capture-marketing.ps1 [-BaseUrl http://localhost:3000]

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$OutDir = (Join-Path $PSScriptRoot "..\marketing")
)

$chrome = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $chrome) {
    Write-Error "Chrome nao encontrado."
    exit 1
}

$OutDir = [System.IO.Path]::GetFullPath($OutDir)
New-Item -ItemType Directory -Force $OutDir | Out-Null

# Perfil descartavel para nao conflitar com um Chrome ja aberto
$profileDir = Join-Path $env:TEMP "movexfit-marketing-capture"

$pieces = @(
    # Rodada 1
    @{ route = "/marketing/post";    file = "movexfit-post-institucional-1080x1080.png"; w = 1080; h = 1080 },
    @{ route = "/marketing/story";   file = "movexfit-story-aluno-1080x1920.png";        w = 1080; h = 1920 },
    @{ route = "/marketing/banner";  file = "movexfit-banner-geral-1920x1080.png";       w = 1920; h = 1080 },
    @{ route = "/marketing/feature"; file = "movexfit-feature-movescan-1080x1080.png";   w = 1080; h = 1080 },
    # Rodada 2 (premium)
    @{ route = "/marketing/premium/post";        file = "movexfit-2-post-dois-lados-1080x1080.png";      w = 1080; h = 1080 },
    @{ route = "/marketing/premium/story";       file = "movexfit-2-story-proxima-serie-1080x1920.png";  w = 1080; h = 1920 },
    @{ route = "/marketing/premium/banner";      file = "movexfit-2-banner-ecossistema-1920x1080.png";   w = 1920; h = 1080 },
    @{ route = "/marketing/premium/feature";     file = "movexfit-2-feature-movescan-1080x1080.png";     w = 1080; h = 1080 },
    @{ route = "/marketing/premium/carrossel-1"; file = "movexfit-2-carrossel-1-aluno-1080x1350.png";    w = 1080; h = 1350 },
    @{ route = "/marketing/premium/carrossel-2"; file = "movexfit-2-carrossel-2-personal-1080x1350.png"; w = 1080; h = 1350 },
    # Campanha Stories — Fase 1 (foco personal)
    @{ route = "/marketing/campanha/story-01"; file = "movexfit-3-story-01-descoberta-1080x1920.png";   w = 1080; h = 1920 },
    @{ route = "/marketing/campanha/story-02"; file = "movexfit-3-story-02-convite-1080x1920.png";      w = 1080; h = 1920 },
    @{ route = "/marketing/campanha/story-03"; file = "movexfit-3-story-03-treino-1080x1920.png";       w = 1080; h = 1920 }
)

foreach ($piece in $pieces) {
    $out = Join-Path $OutDir $piece.file
    Write-Host "Capturando $($piece.route) -> $out"
    & $chrome --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 `
        --user-data-dir="$profileDir" `
        --window-size="$($piece.w),$($piece.h)" `
        --virtual-time-budget=10000 `
        --screenshot="$out" `
        "$BaseUrl$($piece.route)" | Out-Null
    if (-not (Test-Path $out)) {
        Write-Error "Falha ao capturar $($piece.route)"
    }
}

Write-Host "PNGs gerados em $OutDir"
