---
# /friends/ 友链页。
# 页面结构在 layouts/friends/list.html，朋友名单在 data/friends.yaml，
# 本文件只提供页头的标题与简介。
# 为什么它是一个 section（friends/ 目录 + _index.md）而不是根目录下的 friends.md：
# 这样模板查找顺序里 layouts/friends/list.html 才生效，与 /about/ /stats/ /rss/ 一致。
title: "友链"
description: "欢迎交换友链，这里是我的朋友们"
---
