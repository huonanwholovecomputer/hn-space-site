---
title: "开发环境安装与配置指南"
date: 2026-03-18
description: "Visual Studio Code、Visual Studio、Dev-C++、Python 和 PyCharm 的安装与配置指南。"
tags: ["开发环境", "VS Code", "Visual Studio", "Dev-C++", "Python", "PyCharm", "Windows"]
series: ["技术教程"]
draft: false
---

## 一、前言

作为计算机科学与技术专业的学生，掌握C/C++和Python等编程语言是构建技术能力的基石。而学习编程，绝不仅仅是理解语法和算法，同样重要的一步就是搭建一个高效、顺手的开发环境。正所谓“工欲善其事，必先利其器”，一个合适的代码编辑器或集成开发环境（IDE）能极大提升我们的学习效率和编程体验。

然而，面对种类繁多的开发工具，初学者往往感到困惑：Visual Studio和Visual Studio Code有何不同？轻量级的Dev-C++还值得使用吗？Python环境又该如何配置？

本文档旨在解决这些疑惑，为您提供一份清晰、详实的指南。我们将详细介绍Visual Studio Code、Visual Studio、Dev-C++、Python和PyCharm 这五款在学习和业界中广泛使用的工具的安装方法与关键注意事项。无论您是刚刚踏入编程世界的新手，还是希望优化现有工具链的进阶者，本文档都希望能为您提供有力的参考，助您顺利开启或精进编程之旅。

## 二、各软件简要介绍

### 1. Visual Studio Code (VS Code)

一款由微软开发的免费、开源、跨平台（支持Windows, macOS, Linux）的轻量级但功能强大的源代码编辑器。

核心特点：

- 扩展性强：通过庞大的扩展市场，你可以为其添加各种语言支持（C/C++；Python；Java等）、调试、主题、代码片段等功能，几乎可以将其定制成任何你需要的开发环境。

- 集成终端：内置了命令行终端，无需在编辑器和外部的命令行窗口之间切换。

- 智能感知：提供强大的代码补全、语法高亮和错误检查功能。

- 适用场景：几乎是“万能”的，特别适合Web开发、脚本编写、以及需要轻量级启动和高度自定义的各类项目。是当前最受开发者欢迎的编辑器之一。

### 2. Visual Studio (VS)

微软推出的功能全面的集成开发环境（IDE），主要面向Windows平台。

核心特点：

- “重量级”工具：提供了一站式的开发解决方案，内置了代码编辑、调试、性能分析、GUI设计器（如WPF, WinForms）、数据库工具等几乎所有你可能需要的功能。

- 强大的调试器：被誉为业界最强的调试工具之一，特别适合复杂项目的调试。

- 主要面向.NET和C++：是开发C#、.NET应用程序以及大型C++项目（特别是Windows原生应用和游戏）的首选工具。

- 社区版免费：对于学生、开源贡献者和个体开发者，提供功能完整的免费社区版。

适用场景：开发大型Windows桌面应用程序、游戏（使用Unity或Unreal Engine）、.NET Web应用和复杂的C++项目。

### 3. Dev-C++

一款免费的、轻量级的C/C++集成开发环境，最初基于Delphi开发。

核心特点：

- 轻便简洁：软件体积小，安装启动速度快，对系统资源占用极低。

- 易于上手：界面简单直观，没有复杂的功能干扰，非常适合C/C++语言的初学者。

- 集成MinGW编译器：通常捆绑了MinGW编译器，可以方便地在Windows上编译C/C++代码。

适用场景：主要适用于C/C++语言的入门教学。由于其开发停滞已久，功能和调试能力相对较弱，不建议用于大型或复杂的项目开发。

### 4. Python

一种跨平台的、解释型的、高级通用编程语言。这里我们主要指其解释器和核心环境的安装。

核心特点：

- 语法简洁：以清晰的语法和可读性著称，非常适合初学者学习编程思想。

- 功能强大：拥有一个巨大而全面的标准库和第三方库（如NumPy, Pandas, Django），广泛应用于Web开发、数据分析、人工智能、科学计算和自动化脚本等领域。

- 从python.org安装：这是获取官方、纯净Python环境的标准方式，会包含pip（包管理工具）和IDLE（一个简单的集成开发环境）。

适用场景：几乎无处不在。从简单的自动化脚本到复杂的人工智能模型训练，Python都是主力语言之一。

### 5. PyCharm

一款由JetBrains公司开发的专门针对Python语言的专业级集成开发环境（IDE）。

核心特点：

- Python专属：为Python项目提供了“开箱即用”的极致体验，内置了大量Python开发所需的功能，无需复杂配置。

- 智能代码辅助：提供极其强大的代码补全、错误检查、快速修复和代码重构功能，能深刻理解Python的各种库和框架。

- 集成专业工具：无缝集成调试器、测试运行器、版本控制系统、数据库工具以及科学的模式（针对数据科学项目）。

- 框架支持：对Django, Flask, Pyramid等主流Web框架提供了出色的支持。

- 版本选择：提供功能丰富的专业版（收费，但对学生免费）和轻量快速的社区版（免费且开源）。

适用场景：专业Python开发的标杆工具。特别适合进行大型Python项目、Web开发、数据科学和人工智能领域的开发工作。对于追求高效和深度集成的Python开发者来说是首选。

## 三、我的建议

1\. 对于初学者：

> 如果主要学习C/C++，可以从 **Dev-C++** 入手，因为它能让你快速专注于语言本身，避免被复杂工具分散注意力。但入门后，强烈建议迁移到更现代的工具。
>
> 如果学习Python或其他多种语言，**Visual Studio Code** 是最佳起点。它既能满足初学需求，其强大的扩展性也能伴随你一路成长。

2\. 对于希望“一步到位”或进行专业开发的同学：

> C/C++方向：在Windows平台上，**Visual Studio** 是开发大型项目的行业标准，其调试体验无与伦比。
>
> 全栈或多语言开发者：**Visual Studio Code** 凭借其轻量、快速和极高的灵活性，是目前业界最流行的选择，几乎可以应对所有开发场景。

3\. 工具只是手段：请记住，这些工具都是为了帮助你更好地编写代码。不要陷入无休止的工具选择和配置中。先选择一个，用起来，在实践过程中再根据实际需求去调整和探索更高效的工具链。

## 四、Visual Studio Code 的下载与安装

### 1. 下载Visual Studio Code

![](/posts/01-dev-environment-setup/media/image2.png)

![](/posts/01-dev-environment-setup/media/image3.png)

Visual Studio Code的官方网站：[https://code.visualstudio.com/](https://code.visualstudio.com/)

在点击“ **Download for Windows** ”之后，下载会在几秒后开始；

### 2. 安装Visual Studio Code

打开安装程序，按照安装步骤进行安装（注意下图中的框选的选项必须勾选！）；

![](/posts/01-dev-environment-setup/media/image4.png)

![](/posts/01-dev-environment-setup/media/image5.png)

![](/posts/01-dev-environment-setup/media/image6.png)

![](/posts/01-dev-environment-setup/media/image7.png)

![](/posts/01-dev-environment-setup/media/image8.png)

如果弹出这样的窗口，你需要下载一个软件并安装：

![](/posts/01-dev-environment-setup/media/image9.png)

![](/posts/01-dev-environment-setup/media/image10.png)

此软件的GitHub项目链接：

[https://github.com/microsoft/WSL/releases](https://github.com/microsoft/WSL/releases)

### 3. 语言切换

刚安装好时的界面为英文，可以通过安装插件来将界面语言改为中文。在界面左侧点击这个图标（如下图）：

![](/posts/01-dev-environment-setup/media/image11.png)

在搜索框中搜索“**chinese**”，然后点击插件“**Chinese (Simplified)**”右下角的“**Install**”进行安装（如下图）；

![](/posts/01-dev-environment-setup/media/image12.png)

然后点击右下角的“**Change Language and Restart**”按钮重新启动，对语言进行切换（如下图）；

![](/posts/01-dev-environment-setup/media/image13.png)

至此，安装和语言修改完成。

### 4. MinGW的配置

你需要下载并配置**MinGW**（MinGW，是Minimalist GNU for Windows的缩写。它是一个可自由使用和自由发布的Windows特定头文件和使用GNU工具集导入库的集合，允许你在GNU/Linux和Windows平台生成本地的Windows程序而不需要第三方C运行时（C Runtime）库。）

你可以通过官方渠道下载：

**MinGW官方网站为[https://www.mingw-w64.org/](https://www.mingw-w64.org/)**，其中<u>/**downloads/#mingw-w64-builds**</u>界面中提供了GitHub发布页的链接：

[https://github.com/niXman/mingw-builds-binaries/releases](https://github.com/niXman/mingw-builds-binaries/releases)

![](/posts/01-dev-environment-setup/media/image14.png)

如图，下载框选的版本即可。

你也可通过**SourceForge资源网站**下载，但是版本较旧：

[https://sourceforge.net/](https://sourceforge.net/)

由于需要进入多个文件夹，这里提供一个直链：

[https://sourceforge.net/projects/mingw-w64/files/Toolchains%20targetting%20Win64/Personal%20Builds/mingw-builds/8.1.0/threads-posix/seh/](https://sourceforge.net/projects/mingw-w64/files/Toolchains%20targetting%20Win64/Personal%20Builds/mingw-builds/8.1.0/threads-posix/seh/)

点击这里进行下载：

![](/posts/01-dev-environment-setup/media/image15.png)

下载完成之后，将这个7z压缩文件解压到一个文件夹，并将这个文件夹放到一个基本上不会动的地方，我的建议是放到**C:\Program Files**

![](/posts/01-dev-environment-setup/media/image16.png)

然后，进行环境的配置：右键单击桌面的“**此电脑**”然后点击“**属性**”；或者打开**设置**，点击左侧的“**系统**”，然后下拉找到最后一个“**系统信息**”（如下图）；

![](/posts/01-dev-environment-setup/media/image17.png)

![](/posts/01-dev-environment-setup/media/image18.png)

点击“**高级系统设置**”；

点击“**环境变量**”（如下图1）；

双击“**Path**”；（如下图2）

![](/posts/01-dev-environment-setup/media/image20.png)

![](/posts/01-dev-environment-setup/media/image19.png)

找到你刚刚解压的那个文件夹，打开，并打开“**bin**”文件夹；（如下图）

![](/posts/01-dev-environment-setup/media/image22.png)

单击上方路径栏，复制这个路径（如上图）；

![](/posts/01-dev-environment-setup/media/image21.png)

回到“**编辑环境变量**”，点击“**新建**”，将刚刚复制的路径粘贴到下方的方格中，最后，点击“**确定**”来关闭并应用刚才的修改（如下图）。

![](/posts/01-dev-environment-setup/media/image23.png)

### 5. 准备编译环境

回到Visual Studio Code，依然是“**扩展**”界面，和之前的安装Chinese语言插件一样，搜索并安装这个插件：

![](/posts/01-dev-environment-setup/media/image25.png)

在文件资源管理器中的任意你觉得合适的位置创建一个文件夹，比如在桌面创建一个“**C++ Code**”文件夹（如下图）；

![](/posts/01-dev-environment-setup/media/image24.png)

回到Visual Studio Code，点击“**打开文件夹**”（如下图）；

![](/posts/01-dev-environment-setup/media/image26.png)

找到并选择你刚刚创建的文件夹（如下图）；

![](/posts/01-dev-environment-setup/media/image28.png)

在弹出的窗口中，选择“ 是，我信任此作者 ”；

![](/posts/01-dev-environment-setup/media/image27.png)

此时，你进入了你的项目文件夹，你可以在这里创建你的C语言项目；

![](/posts/01-dev-environment-setup/media/image29.png)

比如，点击这个按钮来新建文件，并其命名为你想命名的文件名，比如“**test.c**”；

![](/posts/01-dev-environment-setup/media/image30.png)

然后，你就可以在右侧窗口进行编程了，然后按下键盘快捷键“Ctrl+S”对代码进行保存（如下图）。

![](/posts/01-dev-environment-setup/media/image31.png)

![](/posts/01-dev-environment-setup/media/image32.png)

**接下来，需要为程序的编译做一些配置。**

按键盘快捷键“Ctrl+Shift+P”，在上方的搜索框中继续输入“C/C++”并打开“**编辑配置(UI)**”（如下图）

![](/posts/01-dev-environment-setup/media/image33.png)

找到“**编译器路径**”（如下图）；

![](/posts/01-dev-environment-setup/media/image34.png)

点击小三角，展开并选择有“**gcc.exe**”的一项（如下图）；

![](/posts/01-dev-environment-setup/media/image35.png)

然后，下拉，找到“**IntelliSense 模式**”（如下图）；

![](/posts/01-dev-environment-setup/media/image36.png)

![](/posts/01-dev-environment-setup/media/image37.png)

点击小三角展开并选择“**windows-gcc-x64**”（如上图）；

如下图，依次点击：“**<u>… - 终端 - 配置任务</u>**”；

![](/posts/01-dev-environment-setup/media/image38.png)

此时自动创建了两个文件（如下图）；

![](/posts/01-dev-environment-setup/media/image39.png)

然后，回到代码文件；

如图依次点击：“**<u>… - 终端 - 运行生成任务</u>**”；

![](/posts/01-dev-environment-setup/media/image40.png)

点击“**生成活动文件**”（如下图）；

![](/posts/01-dev-environment-setup/media/image43.png)

![](/posts/01-dev-environment-setup/media/image42.png)

此时会在你的工作文件夹中生成一个exe程序（如上图）；

然后，新建一个终端（如下图）；

![](/posts/01-dev-environment-setup/media/image41.png)

![](/posts/01-dev-environment-setup/media/image44.png)

![](/posts/01-dev-environment-setup/media/image45.png)

在这里输入“**./tset.exe**”（你的程序的名字）并按下回车(Enter)；

这样，程序成功输出了Hello World（如上图）。

### 6. 扩展说明

#### (1) 关于快速编译

由于每次运行程序都需要在终端中输入“**./test.exe**”，较为繁琐，所以你可以安装一个扩展来一键完成代码的exe生成、exe运行操作。安装之后点击右上角的三角形即可直接完成编译和运行。

![](/posts/01-dev-environment-setup/media/image46.png)

![](/posts/01-dev-environment-setup/media/image47.jpeg)

或者使用这个扩展可以让运行更迅速（但有时会出现问题，仅建议用于小项目或Python项目）：

![](/posts/01-dev-environment-setup/media/image48.png)

#### (2) 关于中文输出

在Visual Studio Code中使用C语言输出中文字符时会输出乱码，此时，需要做一些操作，以正常输出中文。

**方法**：在总用户配置文件中加入一些配置，控制终端的编码格式，从而正常输出中文。

首先，打开总用户配置文件，在上方搜索栏键入 \>Open User Settings (JSON) 并打开对应项；

![](/posts/01-dev-environment-setup/media/image50.png)

如下图所示，需要在配置文件的末尾加上这些代码（但注意要被最后的一个花括号包裹）。

![](/posts/01-dev-environment-setup/media/image49.png)

![](/posts/01-dev-environment-setup/media/image51.png)

你可以直接点击右上角的复制按钮复制配置信息，将光标放在需要加逗号的位置（如下图），直接粘贴后保存即可。

```
,

    /\* 在C/C++中正常输出中文 \*/

    // UTF-8 编码配置

    "files.encoding": "utf8",

    "files.autoGuessEncoding": false,

   

    // 终端 UTF-8 支持

    "terminal.integrated.defaultProfile.windows": "PowerShell",

    "terminal.integrated.profiles.windows": {

        "PowerShell": {

            "source": "PowerShell",

            "args": \["-NoExit", "-Command", "chcp 65001"\]

        }

    },

   

    // 各语言编码设置

    "\[c\]": {

        "files.encoding": "utf8"

    },

    "\[cpp\]": {

        "files.encoding": "utf8"

    },

    "\[python\]": {

        "files.encoding": "utf8"

    }
```

#### (3) 关于字体放大

如下图，左下角设置，设置里面的第一个就是字体大小。

![](/posts/01-dev-environment-setup/media/image52.png)

![](/posts/01-dev-environment-setup/media/image53.png)

## 五、Visual Studio的下载与安装

Visual Studio 2022的官方网站：

[https://visualstudio.microsoft.com/zh-hans/](https://visualstudio.microsoft.com/zh-hans/)

![](/posts/01-dev-environment-setup/media/image54.png)

点击“免费下载”之后，等待程序下载完成，然后，打开程序，等待程序初始化，然后来到下图中的界面：

勾选“**使用C++的桌面开发**”，如果你还有Python的需求，可以勾选“**Python开发**”（如下图）；

![](/posts/01-dev-environment-setup/media/image56.png)

![](/posts/01-dev-environment-setup/media/image55.png)

![](/posts/01-dev-environment-setup/media/image57.png)

等待下载完成（如上图），然后点击“**启动**”；

![](/posts/01-dev-environment-setup/media/image58.png)

如果你有Microsoft或者GitHub账号，可以跳转到浏览器授权登录，如果没有，可以点击“跳过并稍后添加账户。”跳过登录步骤，也可以选择创建一个账号。（如上图）

![](/posts/01-dev-environment-setup/media/image59.png)

点击“**创建新项目**”（如上图）；

选择“**空项目**”，并下一步（如下图）；

![](/posts/01-dev-environment-setup/media/image60.png)

项目名称和位置任选，建议勾选“**将解决方案和项目放在同一目录中**”（如下图）；

![](/posts/01-dev-environment-setup/media/image61.png)

右键单击“**解决方案资源管理器**”中的“**源文件**”，在菜单中点击“**添加**”，再点击“**新建项**”；也可以使用快捷键“Ctrl+Shift+A”（如下图）；

![](/posts/01-dev-environment-setup/media/image62.png)

如果右边的这个窗口不见了，可以点击左上角的菜单栏的“**视图**”中的“**解决方案资源管理器**”或者使用快捷键“Ctrl+Alt+L”（如下图）；

![](/posts/01-dev-environment-setup/media/image63.png)

![](/posts/01-dev-environment-setup/media/image64.png)

如上图，输入你的项目的名字，比如test.c或者test.cpp。**你写什么语言的程序就写什么后缀**；

编写代码，点击三角形运行（如下图）；

![](/posts/01-dev-environment-setup/media/image66.png)

![](/posts/01-dev-environment-setup/media/image65.png)

**小提示**：如果觉得写代码的字体太小，可以将鼠标移动到代码区域，按下Ctrl键的同时滚动鼠标滚轮！

## 六、Dev-C++的下载与安装

### 1. 不同版本的抉择

![](/posts/01-dev-environment-setup/media/image67.jpeg)

Dev C++作为经典的轻量级C/C++集成开发环境（IDE），在原开发团队停止维护后，衍生出多个分支版本。其中，Red Panda Dev-C++（现主要以“小熊猫C++”品牌活跃）与Embarcadero Dev-C++是目前国内用户较常接触的。

经测试以及收集大众的意见，我在这里推荐蓝色的版本，即Red Panda Dev-C++。小熊猫版本不需要像Embarcadero版本那样需要在编译选项和编辑器选项中过多设置（比如默认支持输出中文、支持关键字补全等）。由于此教程在v1.4及之前推荐了红色版本而v1.5之后推荐蓝色版本，所以在蓝色版本的安装教程之后，保留了红色版本的安装教程。

![](/posts/01-dev-environment-setup/media/image68.jpeg)

![](/posts/01-dev-environment-setup/media/image69.png)

![](/posts/01-dev-environment-setup/media/image70.jpeg)

<p style="text-align:center"><em>（Red Panda Dev-C++与Embarcadero Dev-C++概述图）</em></p>

### 2. 下载Dev C++

#### (1) Red Panda版本Dev-C++下载

[https://sourceforge.net/projects/dev-cpp-2020/](https://sourceforge.net/projects/dev-cpp-2020/)

![](/posts/01-dev-environment-setup/media/image71.jpeg)

![](/posts/01-dev-environment-setup/media/image72.jpeg)

如下图，下载并安装打开就可以开始使用了，不需要做过多的设置。安装过程也不需要做任何调整，一直继续就好。

![](/posts/01-dev-environment-setup/media/image73.png)

![](/posts/01-dev-environment-setup/media/image74.png)

![](/posts/01-dev-environment-setup/media/image75.png)

![](/posts/01-dev-environment-setup/media/image76.png)

![](/posts/01-dev-environment-setup/media/image77.png)

![](/posts/01-dev-environment-setup/media/image78.png)

![](/posts/01-dev-environment-setup/media/image79.png)

![](/posts/01-dev-environment-setup/media/image80.png)

#### (2) Embarcadero版本Dev-C++下载

Embarcadero官方网站：

[https://www.embarcadero.com/](https://www.embarcadero.com/)

Embarcadero官方网站的Dev-C++下载地址：

[https://www.embarcadero.com/free-tools/dev-cpp/](https://www.embarcadero.com/free-tools/dev-cpp/)

![](/posts/01-dev-environment-setup/media/image81.png)

![](/posts/01-dev-environment-setup/media/image82.png)

如上图，官方要求先填写信息（即注册和登录账号），然后才能开始下载。如果你觉得上述方法过于复杂，可以前往：

[https://www.embarcadero.com/free-tools](https://www.embarcadero.com/free-tools)

![](/posts/01-dev-environment-setup/media/image840.png)

此界面的“Free Tools”列表中（如上图），点击“ Get the FREE Tool ”，即可跳转至GitHub的发布页：

这里提供了最新版本的各种安装包，前三个是没有编译器的版本，后三个是有编译器的版本；后三个中，第一个是便携版（散装文件构成的7z压缩文件）；第二个是安装程序；第三个是安装程序外面套一层zip压缩包。（如下图）

![](/posts/01-dev-environment-setup/media/image85.png)

建议下载倒数第二个，即下图中用红框框选的一个。它们之间具体有什么区别，可以自行查询资料。

### 3. 安装Dev C++

![](/posts/01-dev-environment-setup/media/image86.png)

如下图，你得到了一个zip文件，你可以双击打开，然后直接双击运行里面的exe安装程序；

如下图，**你什么都不需要调，一直继续就好**：

![](/posts/01-dev-environment-setup/media/image87.png)

![](/posts/01-dev-environment-setup/media/image88.png)

![](/posts/01-dev-environment-setup/media/image89.png)

![](/posts/01-dev-environment-setup/media/image90.png)

![](/posts/01-dev-environment-setup/media/image91.png)

![](/posts/01-dev-environment-setup/media/image92.png)

运行之后，需要选择中文（如下图，点击“**简体中文/Chinese**”）

![](/posts/01-dev-environment-setup/media/image93.png)

![](/posts/01-dev-environment-setup/media/image94.png)

![](/posts/01-dev-environment-setup/media/image95.png)

### 4. 编写代码、编译和运行程序

\(1\) 新建一个文件

- 可以使用快捷键Ctrl+N；

- 可以点击右侧的“新文件”；

- 可以点击<u>菜单栏的“文件”-“新建”-“源代码”</u>

\(2\) 在编写窗口中编写程序（如下图）

\(3\) 保存你的代码

- 可以使用快捷键Ctrl+S

- 可以点击<u>菜单栏的“文件”-“保存”</u>

会弹出一个名为“保存为”的窗口（如下图），你可以将其保存至任意位置，我的建议是先在某个你觉得合适的地方新建一个文件夹，只用来存放这个项目，以免出现多个项目的文件发生冲突的问题。

比如我的存放文件的目录为：<u>D:\CODE\Dev-C++\项目1</u>；

![](/posts/01-dev-environment-setup/media/image97.png)

![](/posts/01-dev-environment-setup/media/image96.png)

还有需要注意的是，**保存时需要正确选择你的代码的类型**，比如我写的是C语言程序而不是C++语言的程序，所以需要正确选择保存类型；

保存完成之后，点击<u>菜单栏-“运行”-“编译运行”</u>，就可以运行了（如下图）。

![](/posts/01-dev-environment-setup/media/image99.png)

![](/posts/01-dev-environment-setup/media/image98.png)

### 5. 扩展说明

#### (1) 关于中文显示与输出

在Dev-C++中，默认情况下无法正常输出和显示中文字符，此时，需要做一些操作。

![](/posts/01-dev-environment-setup/media/image101.jpeg)

![](/posts/01-dev-environment-setup/media/image100.jpeg)

![](/posts/01-dev-environment-setup/media/image102.jpeg)

如上图，中文部分并没有显示，而且，编译运行之后，输出了乱码。

**处理分为两步：第一步，显示中文字符；第二步，正常输出中文字符。**

**第一步：显示中文字符**

![](/posts/01-dev-environment-setup/media/image103.png)

![](/posts/01-dev-environment-setup/media/image104.png)

![](/posts/01-dev-environment-setup/media/image105.png)

![](/posts/01-dev-environment-setup/media/image106.jpeg)

如下图，打开“<u>工具-编译器选项-显示</u>”取消勾选“\<ID 27071 translation missing\>”，确定之后，中文字符即可显示。

**第二步：正常输出中文字符**

**方法1. 将文件编码从默认的UTF-8改为ANSI**

如下图，文件-另存为，然后在Encoding选项中，修改为ANSI。

![](/posts/01-dev-environment-setup/media/image107.jpeg)

![](/posts/01-dev-environment-setup/media/image108.jpeg)

**方法2. 在编译时加入命令（推荐）**

如下图，打开“<u>工具-编译选项</u>”，在指定位置输入`-fexec-charset=GB18030`，然后勾选“编译时加入以下命令”

![](/posts/01-dev-environment-setup/media/image109.png)

![](/posts/01-dev-environment-setup/media/image110.png)

![](/posts/01-dev-environment-setup/media/image111.png)

注：GB18030为国家标准编码字符集，选择该字符集可以一劳永逸解决所有字符显示问题。

## 七、Python的下载与安装

### 1. 概念的构建

Python的安装一般分为两步，第一步是安装Python环境，第二部是安装代码编辑器(IDE)，可以这样来形象地理解：Python环境就像是一个厨房，代码编辑器就像是厨房里的种种烹饪器具，而你是厨师，你需要烹饪器具才能更好地进行烹饪。

### 2. Python环境的构建

#### (1) 下载Python

Python官网：

[https://www.python.org/](https://www.python.org/)

![](/posts/01-dev-environment-setup/media/image112.png)

将鼠标移动到“Downloads”（如下图，**注意是移动，悬浮在选项卡上即可，不是点击**），然后点击“Python 3.14.0”，下载会在几秒后开始；

![](/posts/01-dev-environment-setup/media/image113.jpeg)

有一点需要注意的是，安装程序上发布了一个通知“**This installer is being retired and will no longer be available after Python 3.15.**”，意思是“**该安装程序即将退役，在 Python 3.15 版本发布后将不再提供”**（如下图）；

![](/posts/01-dev-environment-setup/media/image114.png)

通过官方的文档，我们得知：3.15版本之后，将仅支持从微软应用商店下载。（如下图）；

![](/posts/01-dev-environment-setup/media/image115.png)

#### (2) 安装Python

如下图，一定要先勾选下面的两个选项，然后点击“Install Now”开始安装；

![](/posts/01-dev-environment-setup/media/image116.png)

然后，重启你的电脑，不出意外的话，环境变量已经正常配置。

![](/posts/01-dev-environment-setup/media/image117.png)

![](/posts/01-dev-environment-setup/media/image118.png)

### 3. 代码编辑器(IDE)的选择

我推荐的编辑器是Visual Studio Code、Visual Studio和Pycharm，我主推前两个，因为前两个编辑器同时支持C/C++和Python语言；但是如果你只需要学习Python，那么PyCharm是更好的选择。

**关于PyCharm**：从2025年1月发布的PyCharm 2025.1版本开始，JetBrains将原有的“社区版（Community Edition）”和“专业版（Professional Edition）”合并为统一的PyCharm产品。所有用户均可永久免费使用核心功能（如基础Python开发、调试、Git集成、Jupyter Notebook基础支持等）；若需使用高级功能（如AI编码辅助、云端运行、数据库深度管理、远程开发等），则需通过订阅Pro版本（付费）或免费试用（30天）获取。

#### (1) Visual Studio Code

- Python 扩展安装、代码编写和运行

如下图，在扩展商店搜索Python，然后点击Python扩展右下角的“安装”；

![](/posts/01-dev-environment-setup/media/image119.png)

安装完成之后，就可以开始新建文件编写代码了，你可以点击左上角<u>菜单栏中的“文件”-“新建文件”，再点击“Python File”来新建一个文件（如下图）</u>；或者直接Ctrl+N新建一个文件；或者像C/C++那样，先创建文件夹，然后“打开文件夹”，再进行Python文件的创建。方法很多，我的建议是最后一种。
![](/posts/01-dev-environment-setup/media/image120.png)

![](/posts/01-dev-environment-setup/media/image121.png)

编辑完成后，Ctrl+S保存代码或者点击<u>菜单栏的“文件”-“保存”</u>；

![](/posts/01-dev-environment-setup/media/image122.png)

![](/posts/01-dev-environment-setup/media/image123.png)

选择你的代码的保存位置，如下图，我将此Python文件保存到了<u>D:\CODE\Python</u>目录，名为“test.py”；

![](/posts/01-dev-environment-setup/media/image124.png)

这里需要注意的是，如果你没有在Windows文件资源管理器中打开“显示文件扩展名”的话（如下图），你必须展开“保存类型”，然后下滑，找到“Python”类型的文件（如下图）。否则，你得到的文件名可能会是“test.py.txt”；

![](/posts/01-dev-environment-setup/media/image125.png)

![](/posts/01-dev-environment-setup/media/image126.png)

保存之后，按下F5运行；或点击<u>菜单栏的“运行”-“启动调试”</u>；或点击左侧的“运行与调试”，点击“运行与调试”按钮（如下图）；

![](/posts/01-dev-environment-setup/media/image127.png)

![](/posts/01-dev-environment-setup/media/image128.png)

然后，你可以在控制台看到输出的内容（如下图）；

![](/posts/01-dev-environment-setup/media/image129.png)

如下图，你也可以安装扩展来快速运行Python程序，安装此扩展后，点击右上角的三角就可以直接运行代码了（如下图）。

![](/posts/01-dev-environment-setup/media/image130.png)

![](/posts/01-dev-environment-setup/media/image131.png)

![](/posts/01-dev-environment-setup/media/image132.png)

#### (2) Visual Studio

- 创建Python项目、编写Python程序和运行；

![](/posts/01-dev-environment-setup/media/image133.png)

![](/posts/01-dev-environment-setup/media/image134.png)

![](/posts/01-dev-environment-setup/media/image135.png)

编写程序；

![](/posts/01-dev-environment-setup/media/image136.png)

运行程序（不调试）；

![](/posts/01-dev-environment-setup/media/image137.png)

![](/posts/01-dev-environment-setup/media/image138.png)

如下图，程序输出了Hello World。

![](/posts/01-dev-environment-setup/media/image139.png)

## 八、PyCharm的下载与安装

### 1. 下载PyCharm

官方网站：

[https://www.jetbrains.com/zh-cn/pycharm/download/](https://www.jetbrains.com/zh-cn/pycharm/download/)

![](/posts/01-dev-environment-setup/media/image140.png)

如上图，点击“下载”即可开始下载。该安装程序较大，约1GB，下载过程需要一定的时间，请耐心等待；

### 2. 安装PyCharm

安装程序下载完成后，打开它，来到安装界面（如下图）；

![](/posts/01-dev-environment-setup/media/image141.png)

![](/posts/01-dev-environment-setup/media/image142.png)

![](/posts/01-dev-environment-setup/media/image143.png)

![](/posts/01-dev-environment-setup/media/image144.png)

![](/posts/01-dev-environment-setup/media/image145.png)

如上图，在到“**安装选项**”这一步骤时，一定要勾选“**更新PATH**”变量！

点击“安装”后，程序会进入安装阶段，安装过程同样需要些许时间，请耐心等待；

安装完成后，点击“完成”；

### 3. 创建Python项目

来到主界面后，先点击New Project（如下图）；

![](/posts/01-dev-environment-setup/media/image146.png)

创建一个项目（如下图）；

![](/posts/01-dev-environment-setup/media/image147.png)

### 4. 重启并应用中文语言（注：从PyCharm 2025.3.3开始，默认的应用语言为中文，此步骤可跳过）

![](/posts/01-dev-environment-setup/media/image148.png)

如下图，不出意外的话，右下角会有这样的弹窗。点击“ Enable Chinese and Restart ”按钮，再点击中间的Exit，软件将自动重启；

![](/posts/01-dev-environment-setup/media/image149.png)

如下图，软件的语言已经切换为了中文，而且处于你刚刚创建的项目中；

![](/posts/01-dev-environment-setup/media/image150.png)

### 5. 编写并运行Python代码

接下来，创建一个Python文件，如下图，右键单击你的项目的文件夹（比如我的是“test_1”），然后点击“新建”，再点击“Python文件”；

![](/posts/01-dev-environment-setup/media/image151.png)

如下图，在中间的输入框中输入你的Python文件的名字（可以与项目文件夹名字不同）；

![](/posts/01-dev-environment-setup/media/image152.png)

如下图，编写代码；

![](/posts/01-dev-environment-setup/media/image153.png)

编写完成之后，Ctrl+S保存，然后点击这个三角形即可运行代码；

![](/posts/01-dev-environment-setup/media/image154.png)

![](/posts/01-dev-environment-setup/media/image155.png)

如上图，程序成功输出了Hello World。

### 6. 扩展说明

#### 关于界面缩放

打开设置，在“<u>外观与行为-外观</u>”调整软件缩放（如下图）。

![](/posts/01-dev-environment-setup/media/image156.png)

![](/posts/01-dev-environment-setup/media/image157.png)

![](/posts/01-dev-environment-setup/media/image158.jpeg)