$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$base = Join-Path $env:LOCALAPPDATA 'DACS4/ai'
[IO.Directory]::CreateDirectory($base) | Out-Null

function Get-VerifiedFile([string]$Url, [string]$Name, [string]$Digest) {
  $target = Join-Path $base $Name
  if ((Test-Path -LiteralPath $target) -and (Get-FileHash -LiteralPath $target).Hash -eq $Digest) { return $target }
  $pending = Join-Path $base ([guid]::NewGuid().ToString() + '.download')
  try {
    Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $pending
    if ((Get-FileHash -LiteralPath $pending).Hash -ne $Digest) { throw "Invalid SHA-256: $Name" }
    Copy-Item -LiteralPath $pending -Destination $target -Force
  } finally {
    if (Test-Path -LiteralPath $pending) { Remove-Item -LiteralPath $pending }
  }
  return $target
}
$zip = Get-VerifiedFile 'https://github.com/ggml-org/llama.cpp/releases/download/b12602/llama-b12602-bin-win-cpu-x64.zip' 'llama-b12602.zip' '9957dab2f52e2599b85921ef3e2661287c1f3ad302bc0be07992e915cc6f7392'
Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $base 'b12602') -Force
$model = 'qwen2.5-0.5b-instruct-q4_k_m.gguf'
$url = 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/9217f5db79a29953eb74d5343926648285ec7e67/' + $model
Get-VerifiedFile $url $model '74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db' | Out-Null
Write-Output "DACS4 local AI installed in $base"
