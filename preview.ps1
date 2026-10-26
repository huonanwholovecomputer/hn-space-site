# 本地预览启动器（双击 preview.cmd 触发）
# 作用：启动 hugo server，并自动打开浏览器。关闭窗口 = 停止服务。
# 额外参数会原样透传给 hugo，例如：preview.cmd -D （连草稿一起预览）

$ErrorActionPreference = 'Stop'

$root  = $PSScriptRoot
$hugo  = Join-Path $root '.tools\hugo\hugo.exe'
$url   = 'http://127.0.0.1:1313/'
$port  = 1313

if (-not (Test-Path -LiteralPath $hugo)) {
    Write-Host "[错误] 找不到 Hugo：$hugo" -ForegroundColor Red
    Write-Host '       请确认 .tools\hugo\hugo.exe 存在。' -ForegroundColor Red
    Read-Host '按回车退出'
    exit 1
}

# 端口已在监听 → 预览已经跑着，只补开一个浏览器，避免起第二个实例
if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
    Write-Host '预览已在运行，正在打开浏览器…' -ForegroundColor Yellow
    Start-Process $url
    Start-Sleep -Milliseconds 800
    exit 0
}

Write-Host '==================================================' -ForegroundColor DarkGray
Write-Host "  本地预览   $url" -ForegroundColor Cyan
Write-Host '  关闭本窗口 = 停止服务' -ForegroundColor DarkGray
Write-Host '==================================================' -ForegroundColor DarkGray
Write-Host ''

# 延迟 3 秒再开浏览器：等 Hugo 首次编译完，否则首屏可能是空白的
$openJob = Start-Job -ScriptBlock {
    param($u)
    Start-Sleep -Seconds 3
    Start-Process $u
} -ArgumentList $url

try {
    & $hugo server --source $root --bind 127.0.0.1 --port $port --baseURL $url @args
}
finally {
    Remove-Job $openJob -Force -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host '预览已停止。' -ForegroundColor DarkGray
