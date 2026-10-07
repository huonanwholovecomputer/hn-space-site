---
title: "哔哩哔哩视频下载的五种方式：实测画质、使用步骤与各自的限制"
slug: 05-bilibili-video-download
date: 2026-10-06
description: "从能拿到 1080P 的 BiliTools，到手机端的 1DM+，再到网页在线的 wn.run 系工具与 VideoFK：五种哔哩哔哩视频下载方式的具体步骤、配图实录，以及每一种实际能下到什么画质、有哪些限制。"
tags: ["哔哩哔哩", "视频下载", "B站", "教程", "工具"]
series: ["主流视频平台视频下载教程"]
draft: false
---

{{< toc >}}

哔哩哔哩的视频下载，麻烦的地方不在于「找不到工具」，而在于**每个工具能拿到的画质差得很远**——有的能到 1080P，有的只有 480P，手机上嗅探出来的甚至只有 360P。而画质的高低，基本取决于它是通过登录账号的接口取流，还是只能扒网页上以常规方式展示的那一路流。

这里记录我实测过的五种方式，按「能拿到的最高画质」从高到低排开，每一种都写清楚：怎么用、能下到什么画质、卡在哪里。

> 本文是「主流视频平台视频下载教程」的哔哩哔哩篇。整个教程覆盖哔哩哔哩、抖音、快手、小红书、视频号、YouTube，其余平台后续单独整理。

## 〇、太长不看：五种方式速览

| 方式 | 形态 | 实测最高画质 | 主要门槛 |
|---|---|---|---|
| BiliTools | 桌面客户端（Win / macOS / Linux） | 1080P | 720P 以上要登录 B 站账号；项目已归档 |
| Mediago | 桌面客户端（Win / macOS） | 480P | 无需登录 |
| 1DM+ | 安卓 App（内置浏览器嗅探） | 360P | 无需登录 |
| 万能命令 wn.run/ | 网页在线工具 | 720P | 有魔法上网要求、每日次数限制 |
| VideoFK | 网页在线工具 | 720P | 要注册登录，每天 1 个 |

一句话结论：**追画质就用 BiliTools（但它已归档，只能靠第三方下载和社区镜像）；不想装软件、能接受 720P，就走 wn.run 那条线；手机上随手存一个，1DM+ 够用，代价是只有 360P。**

## 一、BiliTools：唯一能到 1080P+ 的方式（已归档）

**简介**：开源，可下载哔哩哔哩视频、音频、漫画、字幕等资源，支持 Windows、macOS、Linux 系统。

需要先说明的是：该项目因收到来自 Bilibili 的法律通知，已于 **2026 年 7 月 6 日停止维护和归档**。

![BiliTools 的 GitHub 仓库首页：顶部标注 Public archive，README 已换成停止维护公告](/posts/05-bilibili-video-download/media/bilitools-repo-archived.webp)

<p style="text-align:center"><em>（仓库已被归档为只读状态，README 换成了停止维护公告）</em></p>

**开源地址（已归档）：**<https://github.com/btjawa/BiliTools>

**第三方下载：**<https://jpsmile.com/bilitools>

**社区镜像（fork）：**<https://github.com/hnztlyh/BiliTools->

### 使用方式

在浏览器中打开一个哔哩哔哩视频，复制地址栏的全部内容（或只复制 `?` 之前的部分，去掉 `spm_id_from` 这类跟踪参数），粘贴到该应用顶部的输入框中。

![浏览器里选中 bilibili 视频页的完整地址](/posts/05-bilibili-video-download/media/bilitools-01-copy-url.webp)

<p style="text-align:center"><em>（复制地址栏的链接即可，问号后面的跟踪参数可以不要）</em></p>

![粘贴到 BiliTools 顶部输入框后解析出的视频条目](/posts/05-bilibili-video-download/media/bilitools-02-paste.webp)

<p style="text-align:center"><em>（粘贴进输入框，下方会列出解析出的视频条目）</em></p>

然后点击右侧的「常规下载」。如果你没有别的需求、只是想下载视频，直接点击「下一步」即可。**720P 以上的视频需要登录你的哔哩哔哩账号**，软件会通过你的账号凭据获取 720P 以上画质的资源。

![下载参数页：分辨率、编码格式、比特率、流媒体格式，右下角为「下一步」](/posts/05-bilibili-video-download/media/bilitools-03-options.webp)

<p style="text-align:center"><em>（下载参数页：分辨率最高可选 1080P 高清，右下角进入「下一步」）</em></p>

接着界面会跳转到「下载 - 备选区」，点击「开始处理」。

![备选区列表与右上角的「开始处理」按钮](/posts/05-bilibili-video-download/media/bilitools-04-queue.webp)

<p style="text-align:center"><em>（备选区里已经有 1080P / AVC / 192K / DASH 格式的待处理条目）</em></p>

然后是等待：视频、音频资源下载完毕之后，软件会自动做音视频合并。

![下载进行中，视频、音频、音视频三条进度都到 100%](/posts/05-bilibili-video-download/media/bilitools-05-merging.webp)

<p style="text-align:center"><em>（视频、音频下载完成后自动合并为「音视频」）</em></p>

下载完成后，点击条目右侧的文件夹按钮，就可以打开文件所在位置。

![已完成列表里被标出的文件夹按钮](/posts/05-bilibili-video-download/media/bilitools-06-open-folder.webp)

<p style="text-align:center"><em>（点这个文件夹按钮直接跳到文件所在目录）</em></p>

![下载结果的文件属性：1920×1080、时长 00:03:32、总比特率约 2.7 Mbps](/posts/05-bilibili-video-download/media/bilitools-07-result-1080p.webp)

<p style="text-align:center"><em>（对着文件看一眼属性就能确认：1920×1080，确实是 1080P）</em></p>

它也是本文中唯一一个能稳定拿到 1080P 的方式，代价就是项目已经停更，后续能不能继续用只能看社区镜像的维护情况。

## 二、Mediago：开源跨平台，但只有 480P

**简介**：开源，跨平台视频提取工具，支持流媒体下载、视频下载、m3u8 下载及 B 站视频下载，支持 Windows 和 macOS。

**开源地址：**<https://github.com/mediago-dev/mediago>

**官方文档：**<https://mediago-docs.torchstellar.com/>

![MediaGo 主界面：左侧功能栏，右上角是「新建下载」](/posts/05-bilibili-video-download/media/mediago-overview.webp)

<p style="text-align:center"><em>（MediaGo v3.5.0 的主界面，右上角就是「新建下载」）</em></p>

使用方式：点击「新建下载」，然后粘贴视频链接，再点击「立即下载」。

![「新建下载」对话框：视频类型选哔哩哔哩，粘贴链接后点「立即下载」](/posts/05-bilibili-video-download/media/mediago-new-download.webp)

<p style="text-align:center"><em>（视频类型选「哔哩哔哩」，粘贴链接后点「立即下载」）</em></p>

![下载文件夹里的成品文件与 852×480 的属性页](/posts/05-bilibili-video-download/media/mediago-result-480p.webp)

<p style="text-align:center"><em>（下出来的文件是 852×480，也就是 480P）</em></p>

所以这条路的限制很直接：**此软件下载的哔哩哔哩视频只有 480P**，默认下载在主文件夹下的下载目录。

## 三、1DM+：手机端嗅探，360P

**简介**：一款支持多线程的资源下载工具，其内置浏览器支持网页广告拦截和资源嗅探等功能。

**下载方式：**

- Google Play：<https://play.google.com/store/apps/details?id=idm.internet.download.manager.plus>
- 异星软件空间：<https://www.yxssp.com/23740.html>

在该 APP 的浏览器中打开哔哩哔哩视频页，它会自动嗅探该网页以常规方式展示的视频和音频资源，你可以点击右上角的资源嗅探按钮，来选择嗅探到的资源并进行下载、播放等操作。

![手机浏览器打开 m.bilibili.com，右上角资源嗅探按钮被标出](/posts/05-bilibili-video-download/media/1dm-browser-sniff.webp)

<p style="text-align:center"><em>（右上角的资源嗅探按钮，角标数字是抓到的资源数量）</em></p>

点开之后会列出嗅探到的文件，勾选要下载的那一条。

![「查找到文件」列表，视频文件被红框标出](/posts/05-bilibili-video-download/media/1dm-sniff-list-r2.webp)

<p style="text-align:center"><em>（在「查找到文件」里勾选要下载的文件）</em></p>

然后在下载对话框里确认文件名与保存路径，点「开始」。

![下载对话框：文件名、大小、存储路径，右下角「开始」](/posts/05-bilibili-video-download/media/1dm-download-dialog-r2.webp)

<p style="text-align:center"><em>（确认文件名和保存路径后点「开始」）</em></p>

下完之后可以在文件信息里核对参数——这一步也能看出画质的天花板：

<img src="/posts/05-bilibili-video-download/media/1dm-result-360p.webp" style="width:65%" alt="下载完成的文件信息：640×360，10.52MB">

<p style="text-align:center"><em>（文件信息里写着 640×360，也就是 360P）</em></p>

**哔哩哔哩在手机网页上以常规方式展示的视频就是 360P 画质的，所以 1DM+ 只能下载到 360P 画质的视频。**

## 四、万能命令 wn.run/：不装软件的网页方案

![万能命令首页：一个把各类在线工具按站点聚合起来的跳转页](/posts/05-bilibili-video-download/media/wnrun-home.webp)

<p style="text-align:center"><em>（wn.run 的首页，它本身不提供解析，只负责把工具按站点聚合）</em></p>

**使用方式**：在任何网页的网址前面加上 `wn.run/`（wn 为「万能」的拼音简称，run 是运行、命令的意思），即可展示用于该网页的在线工具，并且点击工具时一般会直达针对该网页的功能详情页，无需再复制和粘贴网页链接。

例如：

<https://www.bilibili.com/video/BV1GJ411x7h7>

在网址前面加上 `wn.run/`，变为

`wn.run/https://www.bilibili.com/video/BV1GJ411x7h7`

![进入后列出针对 bilibili 站点可用的在线工具，Parsevideo 与 ibilibili 被标出](/posts/05-bilibili-video-download/media/wnrun-bilibili-tools.webp)

<p style="text-align:center"><em>（跳转后的工具列表，按站点自动筛出「视频音乐下载」这一类）</em></p>

比如，对于哔哩哔哩视频，你可以使用该站点收录的 **ParseVideo** 和 **ibilibili** 来进行视频下载操作。

### 注意事项一：ParseVideo

ParseVideo.com 可能需要魔法上网，并且该站点每天允许每位游客解析 5 个地址、允许每位注册用户解析 10 个地址；如果需要解除限制，需要开通会员。对于哔哩哔哩视频，**该站点解析出来的是 720P 画质**。

![ParseVideo 解析结果页：高清 720P 的直链与复制按钮](/posts/05-bilibili-video-download/media/parsevideo-720p.webp)

<p style="text-align:center"><em>（解析出 720P 的视频直链，用右侧按钮复制后，任何下载工具或浏览器都能直接下）</em></p>

如图，该站点解析出了这个哔哩哔哩视频的 720P 视频链接，你可以使用右侧的按钮复制该链接，然后用任何下载工具或者直接在浏览器中粘贴访问即可下载。

### 注意事项二：ibilibili 与「三叔工具箱」

ibilibili.com 之前提供了在线的哔哩哔哩视频解析和下载服务，但现在主要用于展示个人博客。该站点的作者「三叔」开发了一个工具箱，名为「三叔工具箱」，**提供了 71 个实用功能，其中 58 个是免费的**。

![爱哔哩页面：视频标识与「下载视频」按钮](/posts/05-bilibili-video-download/media/ibilibili-page.webp)

<p style="text-align:center"><em>（站点上能拿到 BV 号、AV 号、CID，「下载视频」按钮是入口）</em></p>

点击「下载视频」之后，会前往下载中转页。

![下载中转页：上方横幅通往新版工具箱，页内也列了操作步骤](/posts/05-bilibili-video-download/media/sanshu-transit-page.webp)

<p style="text-align:center"><em>（中转页：上方横幅可直达新版工具箱，页内还写了工具箱的操作步骤）</em></p>

顺着横幅进到工具箱页面，点「点击这里下载《三叔工具箱》」。

![三叔工具箱页面：红框标出下载入口](/posts/05-bilibili-video-download/media/sanshu-toolbox-download.webp)

<p style="text-align:center"><em>（工具箱页面，点这条下载 0.4.7 版本）</em></p>

接着跳转到蓝奏云网盘，把这个工具箱下载下来。

![蓝奏云页面：三个下载按钮，「普通下载」被标出](/posts/05-bilibili-video-download/media/sanshu-lanzou-download.webp)

<p style="text-align:center"><em>（149 MB 的压缩包，选「普通下载」即可）</em></p>

然后解压、打开「三叔工具箱.exe」、关注公众号，再进入插件市场。

![三叔工具界面：顶部「插件市场」菜单被标出](/posts/05-bilibili-video-download/media/sanshu-plugin-market.webp)

<p style="text-align:center"><em>（菜单栏里的「插件市场」）</em></p>

在插件市场中找到「B站下载」插件并下载。

![插件管理：搜索 B站，结果为「B站下载」，已下载并已启用](/posts/05-bilibili-video-download/media/sanshu-plugin-manager.webp)

<p style="text-align:center"><em>（搜「B站」就能找到「B站下载」，免费插件，下载后记得勾上启用）</em></p>

下载完，点击「更多工具 - 下载工具 - bilidown」。

![更多工具菜单展开：下载工具下的 bilidown](/posts/05-bilibili-video-download/media/sanshu-menu-bilidown.webp)

<p style="text-align:center"><em>（在「更多工具」里找到「下载工具 → bilidown」）</em></p>

最后填写视频地址、解析视频、下载视频。

![bilidown 界面：① 填写视频地址 ② 解析视频 ③ 下载视频](/posts/05-bilibili-video-download/media/sanshu-bilidown.webp)

<p style="text-align:center"><em>（① 填地址 → ② 解析 → ③ 下载，右侧能看到「下载完毕」）</em></p>

两点提醒：**B 站登录功能可能不可用**；该工具下载的哔哩哔哩视频的清晰度为 **720P**。

## 五、VideoFK：在线解析，每人每天 1 个

**官网链接：**<https://www.videofk.com/>

你可以在该站点的搜索框中输入视频链接，点击右侧的「Download」，即可开始解析。解析完成之后，**下载前需要先注册登录**，而且每个用户每天仅允许解析并下载 1 个哔哩哔哩视频。该站点解析 / 下载的哔哩哔哩视频为 **720P** 清晰度。

![VideoFK 的 Bilibili 下载页：解析结果与可选的画质](/posts/05-bilibili-video-download/media/videofk-720p.webp)

<p style="text-align:center"><em>（粘贴链接点「Download」，解析出视频信息后再选清晰度下载）</em></p>

## 六、小结：怎么选

- **要画质**：BiliTools，能稳定拿到 1080P；但它已归档，只能从第三方站或社区镜像获取，且 720P 以上需要登录账号。
- **要省事**：Mediago，开源、跨平台、不用登录，代价是画质锁死在 480P。
- **只有手机**：1DM+，用内置浏览器嗅探即可，代价是 360P。
- **不想装任何软件**：wn.run 那条线，ParseVideo 或 ibilibili / 三叔工具箱都能到 720P，但一个受魔法上网与每日次数限制，另一个要下载安装工具箱、关注公众号。
- **在线备选**：VideoFK，同样 720P，代价是必须注册、每天只有 1 个。

> 这些工具都只能用于个人学习与备份，请遵守平台协议与著作权规定，不要把下载到的内容二次传播。
