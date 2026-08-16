<#
.SYNOPSIS
HN Space 一键发布脚本：新建文章 / 本地预览 / 构建 / 部署到服务器

.EXAMPLE
.\deploy.cmd new -Slug 03-python-tools -Title "Python 小工具系列"
.\deploy.cmd preview
.\deploy.cmd build
.\deploy.cmd          # 默认：构建 + 上传 + 服务器验证
#>
[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('new', 'preview', 'build', 'deploy')]
    [string]$Action = 'deploy',

    [string]$Slug,
    [string]$Title,
    # 服务器地址从环境变量读取（避免敏感信息入库）；也可用 -ServerHost 显式传入
    [string]$ServerHost = $env:HN_SERVER_HOST,
    [string]$RemoteDir = '/var/www/blog'
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$hugo = Join-Path $root '.tools\hugo\hugo.exe'
$tarFile = Join-Path $root '.tools\site.tar'
$pubDir = Join-Path $root 'public'

function Invoke-Hugo {
    param([string[]]$HugoArgs)
    & $hugo --source $root @HugoArgs
    if ($LASTEXITCODE -ne 0) { throw "hugo 命令失败: $HugoArgs" }
}

function New-Post {
    if (-not $Slug) {
        throw '新建文章需要提供 -Slug，例如：.\deploy.cmd new -Slug 03-python-tools -Title "Python 小工具系列"'
    }
    $file = Join-Path $root "content\posts\$Slug.md"
    if (Test-Path -LiteralPath $file) { throw "文章已存在: $file" }

    Invoke-Hugo @('new', 'content', "posts/$Slug.md")

    if ($Title) {
        $content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
        $content = $content -replace '(?m)^title: ".*"$', "title: `"$Title`""
        [System.IO.File]::WriteAllText($file, $content, (New-Object System.Text.UTF8Encoding($false)))
    }
    Write-Host "已创建草稿: $file" -ForegroundColor Green
    Write-Host '下一步：编辑文章 -> .\deploy.cmd preview 本地预览 -> .\deploy.cmd 发布' -ForegroundColor Cyan
}

function Start-Preview {
    Write-Host '本地预览: http://localhost:1313  （Ctrl+C 停止）' -ForegroundColor Cyan
    & $hugo server --source $root --bind 127.0.0.1 --port 1313
    if ($LASTEXITCODE -ne 0) { throw '本地预览启动失败' }
}

function Build-Site {
    Write-Host '构建站点...' -ForegroundColor Cyan
    Invoke-Hugo @('--cleanDestinationDir', '--quiet')
    Write-Host "构建完成: $pubDir" -ForegroundColor Green
}

function Deploy-Site {
    if ([string]::IsNullOrWhiteSpace($ServerHost)) {
        throw '未配置服务器地址：请设置环境变量 $env:HN_SERVER_HOST（如 root@你的服务器IP），或用 -ServerHost 参数传入'
    }

    Build-Site

    Write-Host '打包构建产物...' -ForegroundColor Cyan
    tar -C $pubDir -cf $tarFile .
    if ($LASTEXITCODE -ne 0) { throw '打包失败' }

    Write-Host '上传到服务器（自动重试）...' -ForegroundColor Cyan
    $ok = $false
    for ($i = 1; $i -le 4 -and -not $ok; $i++) {
        & scp -o StrictHostKeyChecking=accept-new -o ConnectTimeout=30 $tarFile "$ServerHost`:/tmp/site.tar"
        if ($LASTEXITCODE -eq 0) { $ok = $true }
        elseif ($i -lt 4) { Write-Host "上传失败，第 $i 次重试..." -ForegroundColor Yellow; Start-Sleep -Seconds 6 }
    }
    if (-not $ok) { throw '上传失败：多次重试后仍无法连接服务器' }

    Write-Host '服务器端解压、修正权限并验证...' -ForegroundColor Cyan
    $remote = "cd $RemoteDir && tar -xf /tmp/site.tar && rm -f /tmp/site.tar && chown -R www-data:www-data $RemoteDir && chmod -R a+rX $RemoteDir && curl -s --resolve blog.hn-space.cn:443:127.0.0.1 -o /dev/null -w 'HTTP %{http_code}`n' https://blog.hn-space.cn/"
    & ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=30 $ServerHost $remote
    if ($LASTEXITCODE -ne 0) { throw '服务器端执行失败' }

    Write-Host '发布完成 ✅ https://blog.hn-space.cn/' -ForegroundColor Green
}

switch ($Action) {
    'new' { New-Post }
    'preview' { Start-Preview }
    'build' { Build-Site }
    'deploy' { Deploy-Site }
}

