<#
.SYNOPSIS
HN Space 一键发布脚本：新建文章 / 本地预览 / 构建 / 部署到服务器
不依赖 GitHub Actions：本地构建 -> scp 上传 -> 服务器全量替换。

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
    # 服务器地址：默认走本机 ~/.ssh 密钥直连 root@82.156.66.18（免密）。
    [string]$ServerHost = '',
    [string]$RemoteDir = '/var/www/blog'
)

# 服务器地址解析：-ServerHost 参数 > 环境变量 > 默认公网 IP
if ([string]::IsNullOrWhiteSpace($ServerHost)) {
    if (-not [string]::IsNullOrWhiteSpace($env:HN_SERVER_HOST)) {
        $ServerHost = $env:HN_SERVER_HOST
    } else {
        $ServerHost = 'root@82.156.66.18'
    }
}

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
        throw '新建文章需要提供 -Slug，例如 .\deploy.cmd new -Slug 03-python-tools'
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
        throw '未配置服务器地址：请用 -ServerHost root@服务器IP 或设 $env:HN_SERVER_HOST'
    }

    # 本机零依赖部署：tar 打包 -> scp 上传 tar -> 服务器端全量替换 + 修权 + 验证。
    # 不依赖本机 rsync；全量替换等同 rsync --delete，可清掉已删的残留（含废弃的 /admin）。
    # 注意：-o 必须拆成独立数组元素，scp/ssh 才能逐个识别（拼接成单个字符串会让 scp 报
    # "keyword ... extra arguments at end of line"）。
    $sshOpts = @(
        '-o', 'StrictHostKeyChecking=accept-new',
        '-o', 'ConnectTimeout=30',
        '-o', 'ServerAliveInterval=30',
        '-o', 'ServerAliveCountMax=4'
    )

    Build-Site

    Write-Host '打包构建产物...' -ForegroundColor Cyan
    tar -C $pubDir -cf $tarFile .
    if ($LASTEXITCODE -ne 0) { throw '打包失败' }

    Write-Host '上传到服务器（自动重试）...' -ForegroundColor Cyan
    $ok = $false
    for ($i = 1; $i -le 4 -and -not $ok; $i++) {
        & scp @sshOpts $tarFile "$ServerHost`:/tmp/site.tar"
        if ($LASTEXITCODE -eq 0) { $ok = $true }
        elseif ($i -lt 4) { Write-Host "上传失败，第 $i 次重试..." -ForegroundColor Yellow; Start-Sleep -Seconds 6 }
    }
    if (-not $ok) { throw '上传失败：多次重试后仍无法连接服务器' }

    Write-Host '服务器端全量替换，修正权限并验证...' -ForegroundColor Cyan
    # 远程命令：用字符串数组 + 换行拼接，避开 heredoc 与 &&/|| 在 PS5.1 的解析坑。
    $remoteLines = @(
        'set -e'
        "rm -rf $RemoteDir"
        "mkdir -p $RemoteDir"
        "tar -xf /tmp/site.tar -C $RemoteDir"
        'rm -f /tmp/site.tar'
        "rm -rf $RemoteDir/admin 2>/dev/null; true"
        "chown -R www-data:www-data $RemoteDir"
        "chmod -R a+rX $RemoteDir"
        "curl -sk -o /dev/null -w '%{http_code}' https://blog.hn-space.cn/ ; echo"
    )
    $remote = [string]::Join("`n", $remoteLines)
    & ssh @sshOpts $ServerHost $remote
    if ($LASTEXITCODE -ne 0) { throw '服务器端执行失败' }

    Write-Host '发布完成 ✅ https://blog.hn-space.cn/' -ForegroundColor Green
}

switch ($Action) {
    'new' { New-Post }
    'preview' { Start-Preview }
    'build' { Build-Site }
    'deploy' { Deploy-Site }
}
