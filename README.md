# HN Space 个人网站

> 技术向个人网站：开发环境配置、Windows 系统重装教程与编程实践。
>
> 在线地址：<https://blog.hn-space.cn>

基于 [Hugo](https://gohugo.io/) + [PaperMod](https://github.com/adityatelange/hugo-PaperMod) 构建的纯静态个人博客，使用自定义布局、CSS 与原生 JS 做了深度定制：首页带 DeepSeek 风格的液态渐变背景与交互网格，关于页采用卡片化布局与滚动逐卡「磁吸」入场动画，并自托管了 Umami 访问统计。

## ✨ 功能特性

- **首页 Hero**：WebGL2 液态渐变背景 + 弹簧质点交互网格 + 文字反色光标（DeepSeek 官网效果原理级移植，`static/js/deepseek-effects.js`）
- **悬浮灵动岛导航**：滚动超过 80px 收缩成玻璃胶囊（`site.css` + `site.js`）
- **关于页**：个人信息卡片化 —— 办公软件品牌图标行、编程方向、成长经历、竞赛时间线；卡片随滚动从左到右逐个「磁吸」入位（`layouts/about/list.html` + `about.css`）
- **全站动效**：卡片 3D 倾斜 + 手电筒光晕、滚动入场动画、鼠标拖尾（均支持 `prefers-reduced-motion` 降级）
- **深浅色主题**：自动跟随系统，可手动切换，全站配色统一（浅色/深色各一套变量）
- **访问统计**：自托管 [Umami](https://umami.is/)（PostgreSQL），看板独立子域名，脚本 `defer` 加载不影响性能
- **内容管理**：接入 Sveltia CMS（GitHub 登录），支持 Markdown 写作与图片上传
- **自动部署**：`deploy.cmd` 一键构建 + 上传 + 服务器验证

## 🚀 快速开始

### 环境要求

- [Hugo](https://gohugo.io/installation/) ≥ 0.146（本项目使用 Hugo 扩展版构建）
- Git

### 本地预览

```bash
# 1. 克隆仓库
git clone https://github.com/huonanwholovecomputer/hn-space-site.git
cd hn-space-site

# 2. 获取主题（themes/PaperMod 为 git 仓库，不在本仓库内）
git clone --depth 1 https://github.com/adityatelange/hugo-PaperMod.git themes/PaperMod

# 3. 本地预览（默认 http://localhost:1313）
hugo server -D
```

> 若已有一份 PaperMod 克隆，也可以直接拷贝到 `themes/PaperMod`。

### 构建

```bash
hugo --gc --cleanDestinationDir
# 静态文件输出到 public/
```

## 📝 内容维护

### 文章

新增文章放在 `content/posts/`，以 Markdown 编写，front matter 示例如下：

```yaml
---
title: "文章标题"
date: 2026-08-14
description: "一句话摘要"
tags: ["教程"]
---
```

### 数据文件（首页 / 关于页文案）

| 文件 | 作用 |
|---|---|
| `data/profile.yaml` | 首页个人资料、技能、项目精选（单数据源） |
| `data/about.yaml` | 关于页个人信息：办公软件、编程方向、经历、竞赛 |

修改文案只需编辑 YAML，无需动模板。图标 key 对应 `layouts/_partials/icon.html`（品牌 SVG 路径 + 线性图标）。

### 自定义项

- **布局**：`layouts/`（`index.html` 首页、`about/list.html` 关于页、`_partials/` 组件）
- **样式**：`assets/css/extended/`（Hugo 自动合并；`home.css` 首页、`about.css` 关于页、`site.css` 全站、`mobile.css` 移动端）
- **脚本**：`static/js/`（`site.js` 动效、`deepseek-effects.js` 流体/网格、`mouse-trail.js` 拖尾）

## 🚢 部署

```powershell
# 构建 + 上传 + 服务器验证（默认动作）
.\deploy.cmd

# 或单独构建
.\deploy.cmd build

# 本地预览
.\deploy.cmd preview
```

部署脚本使用 `scp`/`ssh` 将 `public/` 打包上传到服务器 `/var/www/blog` 并修正权限、验证线上可访问性。

## 📁 目录结构

```
hn-space-site/
├── archetypes/            # 文章模板
├── assets/css/extended/   # 自定义样式（自动合并）
├── content/               # 内容（posts 文章 / about 关于 / projects 项目等）
├── data/                  # 结构化数据（profile.yaml / about.yaml）
├── layouts/               # 自定义布局与组件
├── static/                # 静态资源（js / 头像 / 图片）
├── themes/PaperMod/       # Hugo 主题（独立 git 仓库，clone 获取）
├── hugo.toml              # 站点配置
├── deploy.ps1 / deploy.cmd  # 一键部署脚本
└── 个人网站搭建指导.md       # 服务器 / 域名 / 证书部署手册
```

## 🛠️ 技术栈

- **框架**：Hugo（静态站点生成器）
- **主题**：PaperMod（深度定制）
- **动效**：原生 JavaScript + CSS（WebGL2 / Canvas 2D / IntersectionObserver / CSS 变量）
- **统计**：Umami + PostgreSQL（Docker 自托管）
- **部署**：nginx + scp/ssh 脚本

## 📄 License

本项目基于 MIT License 开源。PaperMod 主题版权归其原作者所有。
