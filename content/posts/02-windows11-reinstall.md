---
title: "Windows 11 精简版系统重装教程"
date: 2026-05-05
description: "Windows 11 精简版系统的 U 盘启动盘制作、安装与后续优化完整教程。"
tags: ["Windows 11", "系统重装", "U盘启动", "驱动安装"]
series: ["技术教程"]
draft: false
---

{{< toc >}}

## 一、引言

本教程将详细介绍如何安装 Windows 11 精简版系统，主要解决以下两个问题：

1\. 系统占用空间过大——Windows 11 在 C 盘占用的空间过大；

2\. 内存占用过高——系统启动后初始运行内存占用过多。

本教程适合以下人群：

1\. 希望对系统拥有更强掌控力的 Windows 用户；

2\. 存储空间紧张的用户；

3\. 运行内存略感不足的用户；

4\. 对 Windows 臃肿现状感到不满，并希望亲手优化系统的用户；

5\. 需要给低配置电脑安装系统的用户。

既然是引言，不妨先来看一组对比数据。

我们测试了官方版 Windows XP、Windows 7、Windows 10 和 Windows 11（截至本视频发布前的最终版本）在安装完成后的 C 盘总占用空间 与 运行内存占用，同时也测试了精简版系统的对应数据，结果如下：

|                    版本                    |   储存占用    |  内存占用   |
|:------------------------------------------:|:-------------:|:-----------:|
|                 Windows XP                 |    3.34GB     |    113MB    |
|           Windows 7 - 官方旗舰版           |    10.8GB     |    521MB    |
|    Windows 7 旗舰版 - 不忘初心 - 精简版    |    8.66GB     |    400MB    |
|       Windows 10 专业版 22H2-官方版        |    13.8GB     |    1.1GB    |
|       Windows 10 LTSC 2021- 官方原版       |    10.0GB     | 900MB→500MB |
|    Windows 10 LTSC 2021 - 小修 -精简版     |    4.33GB     |    910MB    |
| Windows 10 专业版 22H2 - 小修 - 深度精简版 |    4.24GB     |    740MB    |
|      Windows 11 专业版 25H2 -官方原版      | 17.9GB→19.6GB | 2.9GB→2.1GB |
|      Windows 11 LTSC 24H2 - 官方原版       | 21.4GB→22.5GB |    2.1GB    |
|    Windows 11 LTSC 24H2 - 小修 - 精简版    |    5.65GB     |    1.6GB    |
| Windows 11 专业版 26H1 - 小修 - 轻度精简版 |    6.16GB     |    1.7GB    |
| Windows 11 专业版 26H1 - 小修 - 稳定极限版 |    5.44GB     |    1.5GB    |

\*储存占用中，有“→”的表示在Windows设置中安装系统更新前后的储存占用数据；

\*内存占用中，有“→”的表示系统在静置一段时间前后的内存占用。

从上表中可以看出，精简版与官方版之间的差异主要体现在储存占用，不过，这个数据是刚重装系统之后得到的，官方版的系统（特指Windows 11）会持续接收更新，更新的过程中，储存占用和内存占用都会逐渐提升，但是精简版的系统不存在这个问题。

此外，以上数据是没有安装驱动程序的时候所得到的数据，在后续操作中，需要根据你的电脑硬件，安装对应的驱动程序。由于驱动程序会被安装在C盘的Windows文件夹之中（比如NVIDIA显卡驱动），所以安装驱动之后C盘储存空间占用会变多，少则5GB，多则10几GB。同样的，内存的初始占用也会随着驱动程序的安装而变多，会增加1-3GB的内存占用。

你可能会问：精简版系统的稳定性会不会下降？运行速度是否会变快？

对此很难给出一个绝对准确的答案。只能说，任何系统都并非完美。对我们这些喜欢折腾电脑的人来说，最重要的是让系统的各项表现达到自己心里的预期。

我个人也在使用 Windows 11 精简版，主要用于办公和学习，比如写文档、剪视频、写代码、跑模型。目前仅发现一个我觉得被精简得不太理想的功能：无法通过将文件拖动到文件资源管理器的地址栏来移动或复制文件。除此以外，尚未遇到其他明显问题。

接下来，我将逐步教你完成系统的安装以及安装后的进一步优化。

## 二、准备工作

### 1. 在U盘上创建微PE系统

微PE系统官方网站：

[**https://www.wepe.com.cn/**](https://www.wepe.com.cn/)

![](/posts/02-windows11-reinstall/media/image1.jpeg)

![](/posts/02-windows11-reinstall/media/image2.jpeg)

![](/posts/02-windows11-reinstall/media/image3.jpeg)

![](/posts/02-windows11-reinstall/media/image4.jpeg)

![](/posts/02-windows11-reinstall/media/image5.jpeg)

![](/posts/02-windows11-reinstall/media/image6.jpeg)

![](/posts/02-windows11-reinstall/media/image7.jpeg)

![](/posts/02-windows11-reinstall/media/image8.jpeg)

![](/posts/02-windows11-reinstall/media/image9.jpeg)

![](/posts/02-windows11-reinstall/media/image10.jpeg)

![](/posts/02-windows11-reinstall/media/image11.jpeg)

这样，你的U盘就成功安装了PE系统，此时，你可以打开此电脑，你会发现你的U盘现在显示“微PE工具箱”，你可以在这里存放任何文件，包括Windows系统的ISO、GHO、WIN、ESD系统镜像文件、个人文件等。

### 2. 下载Windows 11精简版系统

关于资源的获取，我一直以来的做法是直接用Bing或者Google搜索“某某某精简版”，比如搜索“Windows 11 精简版”，查看多个结果，对比各个网站的质量如何，然后选择心仪的精简版系统文件，获取下载方式，然后进行下载。

经过我的检索，有几个网站的精简版做的还是挺不错的。比如：

1\. 又要重装系统站：

[**https://yyczxt.com/**](https://yyczxt.com/)

2\. 果核剥壳：

[**https://www.ghxi.com/**](https://www.ghxi.com/)

3\. 爱纯净：

[**https://www.aichunjing.com/**](https://www.aichunjing.com/)

我现在使用的系统是从“又要重装系统站”下载的：Windows 11 IoT 企业版 LTSC 25H2 26200.7705 精简版，这个站点的精简版系统非常精简，几乎把Windows 11删得只剩下骨架子了。比如没有微软应用商店，没有系统更新。

请自行分辨和选择你需要的精简版系统，并通过这些站点提供的多种下载渠道进行下载。

如果你实在不清楚应该选哪个，那就去“又要重装系统站”获取最新的精简版系统就好（我后面会用 <u>【小修】 Windows 11 LTSC 26200.8246 极限精简版</u> 系统进行演示）。

![](/posts/02-windows11-reinstall/media/image12.jpeg)

### 3. 其他文件的准备

#### (1) 提前准备驱动安装工具

如果你的电脑是使用无线网络上网的，那么你需要在安装系统之前准备一个无线网卡驱动，否则安装精简版系统之后，无法使用WiFi进行上网。

我建议的做法是使用驱动总裁网卡版，其官方网站为：

[**https://www.sysceo.com/dc**](https://www.sysceo.com/dc)

如下图，点击“万能网卡版”、点击“立即下载”，然后任意选择一个下载方式，下载好文件，保存到U盘备用。

![](/posts/02-windows11-reinstall/media/image13.jpeg)

![](/posts/02-windows11-reinstall/media/image14.jpeg)

![](/posts/02-windows11-reinstall/media/image15.jpeg)

![](/posts/02-windows11-reinstall/media/image16.jpeg)

不过需要注意的是，如图，官方提供了两个版本，第一个是“便携版”，双击之后，程序会自动在后台解压（该过程较慢需要等待），解压完成之后会弹出来界面进行扫描，然后安装对应的驱动即可。关闭程序之后程序缓存会自动清除；第二个是“安装版”，双击之后，需要先安装至本地，然后打开程序，进行网卡驱动扫描和安装。

我的建议是使用便携版（第一个），仅用于安装网卡驱动，即用即删，不产生多余的本地数据。

#### (2) 提前准备你心仪的浏览器

精简版系统制作者通常会把Edge从系统中剔除掉，如果你需要使用Edge，我建议你提前下载Edge的在线安装程序，放到你的U盘里面备用，亦或者是从第三方网站下载一个Edge离线安装包，放在U盘里面备用。

Microsoft Edge官方网站：

[**https://www.microsoft.com/zh-cn/edge/**](https://www.microsoft.com/zh-cn/edge/)

![](/posts/02-windows11-reinstall/media/image17.jpeg)

如果你需要使用其他浏览器，比如Firefox，也可以提前下载好其安装程序备用。

## 三、安装Windows 11

精简版系统通常为.esd文件，因为.esd文件的压缩率较高。我们可以使用微PE中的“CGI备份还原”、“Dism++”和“Windows安装器(WinNTSetup)”工具中的任意一个安装.esd系统镜像文件。

现在需要进入你在U盘上创建的PE系统。

关于如何调整BIOS设置从而通过U盘启动进入微PE，我这里不想做过多赘述。一方面，你的电脑的主板型号只有你自己知道，你需要根据你的电脑的主板型号使用快捷键进入BIOS或者单次修改启动方式。另一方面，不同型号的主板的BIOS界面和快捷键天差地别，我没法给你一个准确的描述。

比如联想电脑是F2进入BIOS，F12进入启动菜单，如果不需要调整启动方式之外的设置（比如从Windows 7及以下的传统BIOS启动 (Legacy BIOS + MBR) 切换到Windows 8及以上的UEFI启动 （UEFI + GPT）启动方式），则建议使用启动菜单（Boot Menu）。前提是你的电脑支持启动菜单。

|     品牌类型      | 进入 BIOS 快捷键 |      Boot Menu 快捷键       |
|:-----------------:|:----------------:|:---------------------------:|
|  联想 （Lenovo）  |   F2 或 Fn+F2    |           **F12**           |
|   戴尔 （Dell）   |        F2        |           **F12**           |
|    惠普 （HP）    |       F10        | **Esc** （然后按 F9） 或 F9 |
|   华硕 （ASUS）   |    F2 或 Del     |      **Esc** 或 **F8**      |
|   宏碁 （Acer）   |        F2        |           **F12**           |
|   微星 （MSI）    |       Del        |           **F11**           |
| 技嘉 （Gigabyte） |       Del        |           **F12**           |

这里展示部分品牌的BIOS和Boot Menu快捷键：

或者直接把F12、F2、Del、ESC一个个试一遍也行。如果进了Boot Menu，那就看看哪个是你的 U盘，选上就行；如果进了BIOS，那就找BOOT/启动-启动顺序，调整为你的U盘，然后按F10，保存并退出。（啥，不知道哪个是你的U盘？拍照问AI去）。

如图，这是微PE系统界面。

![](/posts/02-windows11-reinstall/media/image18.jpeg)

此时要分情况讨论。

- 情况1：你的电脑在此之前安装的系统是Windows 7；

- 情况2：你的电脑在此之前安装的系统是Windows 10/11，我想保留C盘之外的其他盘的所有内容；

- 情况3：你的电脑在此之前安装的系统是Windows10/11，且我不需要保留电脑上的任何内容。

### 1. 对于情况1

首先，对于安装了Windows 7的老电脑，Windows10和Windows11精简版确实均可安装。但是，由于启动方式不同，你需要确定你的BIOS中是否有关于UEFI启动的选项，通常位于选项卡BOOT/启动之中。如果有，你需要将启动方式切换为“仅UEFI”之类的选项，然后，你可以按照**情况3**的流程进行操作。

### 2. 对于情况2

你可以格式化C盘然后安装系统到C盘即可。步骤如下：

打开Windows安装器，你会看到这个界面，

第一步：选择安装镜像文件位置：找到你之前下载的系统文件的位置，<u>必须保证系统文件在U盘或者C盘之外的盘！</u>你需要点击右侧的“选择…”来寻找和选择你的系统文件。

![](/posts/02-windows11-reinstall/media/image19.png)

第二步：选择可引导驱动器位置：如图，你可以点击“**v**”展开，然后选择第一个绿色的分区。

然后，点击右侧的“F”，格式化这个EFI分区。

![](/posts/02-windows11-reinstall/media/image20.jpeg)

![](/posts/02-windows11-reinstall/media/image21.jpeg)

如果没有显示这个EFI分区，可以去“分区工具DiskGenius”中给第一个分区分配一个盘符。

![](/posts/02-windows11-reinstall/media/image22.jpeg)

![](/posts/02-windows11-reinstall/media/image23.jpeg)

如图，此时应该会正常显示，选中即可。

![](/posts/02-windows11-reinstall/media/image24.png)

第三步，选择安装驱动器的位置：如图，先选择你的C盘，然后点击右侧的“F”，格式化你的C盘。

![](/posts/02-windows11-reinstall/media/image25.jpeg)

![](/posts/02-windows11-reinstall/media/image26.jpeg)

![](/posts/02-windows11-reinstall/media/image27.jpeg)

然后，你可以选择系统的版本，比如对于这个系统，作者提供了两个选项，一个是Admin（A），一个是User（U），二者的差别体现在：Admin版本会自动创建一个高级管理员账户（Administrator），安装过程全自动，无需进行人工干预，并且你拥有此计算机的最高权限。而User版本在安装过程中需要你自己去设置一些设置：地区、键盘布局、用户名、密码(可选)

![](/posts/02-windows11-reinstall/media/image28.jpeg)

版本选择好之后，点击右下角的“安装”，然后点击“确定”

![](/posts/02-windows11-reinstall/media/image29.jpeg)

![](/posts/02-windows11-reinstall/media/image30.jpeg)

![](/posts/02-windows11-reinstall/media/image31.jpeg)

等待应用完成，点击重启，进入下一阶段。此阶段会重启多次。

正常情况下，系统会自动安装完毕并进入桌面，安装速度与硬盘读写速度有关，请耐心等待。

至此，系统安装流程结束。

### 3. 对于情况3

：由于你不需要保留任何数据，所以你的系统安装思路是：先删除所有分区，然后创建分区，然后执行和情况二相同的步骤（但不需要额外进行格式化），下面我将提供完整步骤。

**右键单击此处**

![](/posts/02-windows11-reinstall/media/image33.jpeg)

![](/posts/02-windows11-reinstall/media/image32.jpeg)

首先，打开“傲梅分区助手”（即“分区助手（无损）”）。

如上图，右键单击你之前安装了系统的硬盘前面绿色的区域，选择“删除所有分区”。

![](/posts/02-windows11-reinstall/media/image34.jpeg)

![](/posts/02-windows11-reinstall/media/image35.jpeg)

![](/posts/02-windows11-reinstall/media/image36.jpeg)

![](/posts/02-windows11-reinstall/media/image37.jpeg)

![](/posts/02-windows11-reinstall/media/image38.jpeg)

然后，点击“确定”、点击左上角“提交”、点击“执行”、点击“是”、点击“确定”。

![](/posts/02-windows11-reinstall/media/image39.jpeg)

![](/posts/02-windows11-reinstall/media/image40.jpeg)

如上图，右键单击硬盘0，然后点击“快速分区”。

下图中，**①**区域用于设置分区个数，比如设置1个分区，那么你的电脑只有一个C盘，没有D盘，如果设置2两个分区，那么你的电脑有C、D两个磁盘，以此类推，根据个人使用习惯进行设置；**②**区域中，由于你需要安装的系统是Windows 11/Windows 10，所以需要像此截图这样进行设置（选择“GPT”类型）。右侧是调整各个分区的大小和分区的名字（卷标），可以根据个人喜好和使用习惯进行设置。

![](/posts/02-windows11-reinstall/media/image41.jpeg)

设置完毕之后，点击执行。

<u>此步骤完成之后，回到上面的“对于情况2”，完成系统的安装。（可忽略其中的格式化步骤）</u>

## 四、后续的优化

### 1. 安装无线网卡驱动

精简版系统大多会将网卡驱动去除掉，如果你的电脑支持WiFi功能，那么你需要自行安装无线网卡驱动。

拿出之前准备的“驱动总裁万能网卡版”程序，由于程序文件较大，所以不建议直接在U盘上双击运行，建议将文件拷贝到桌面之后在桌面双击运行。双击之后，稍微进行等待，程序会在后台解压，解压完成之后会自动弹出并扫描和安装无线网卡驱动。驱动安装完成之后，你就可以关闭和删除驱动总裁万能网卡版了。

### 2. 安装其他驱动程序

只安装无线网卡驱动并不行，你还需要安装其他硬件的驱动程序，比如显卡、蓝牙、音频等。

我的建议是使用驱动总裁OL在线版。

[https://www.sysceo.com/dc](https://www.sysceo.com/dc)

![](/posts/02-windows11-reinstall/media/image42.jpeg)

![](/posts/02-windows11-reinstall/media/image43.jpeg)

![](/posts/02-windows11-reinstall/media/image44.jpeg)

![](/posts/02-windows11-reinstall/media/image45.jpeg)

这是一个较小的安装程序，安装之后，扫描驱动，安装/更新驱动（需要微信扫码关注公众号进行授权）安装完成之后，<u>务必取消勾选下方捆绑软件选项！</u> 然后关闭该程序，重启电脑。

![](/posts/02-windows11-reinstall/media/image46.jpeg)

此外，你可以该软件的设置（右上角“三”-“设置”）中看到驱动程序的缓存目录，在卸载此软件之后，你可能需要手动删除这个无用的缓存目录。（默认就是C:\DrvPath）

### 3. 激活Windows

没什么好说的，直接上链接：

[**https://github.com/zbezj/HEU_KMS_Activator/releases**](https://github.com/zbezj/HEU_KMS_Activator/releases)

![](/posts/02-windows11-reinstall/media/image47.jpeg)

### 4. 安装Microsoft Store

此精简版系统已经将微软应用商店（Microsoft Store）以及从微软应用商店下载的软件都一并删除，如果你想使用系统自带的一些应用，比如“Windows 照片”、新版记事本、“Windows 媒体播放器”等应用，你需要自行安装Microsoft Store。

[https://apps.microsoft.com/detail/9wzdncrfjbmp?hl=zh-CN&gl=CN](https://apps.microsoft.com/detail/9wzdncrfjbmp?hl=zh-CN&gl=CN)

![](/posts/02-windows11-reinstall/media/image48.jpeg)

![](/posts/02-windows11-reinstall/media/image49.jpeg)

![](/posts/02-windows11-reinstall/media/image50.jpeg)

![](/posts/02-windows11-reinstall/media/image51.jpeg)

### 5. 注册表优化

我比较喜欢用那么一款软件来优化我的电脑的注册表，它叫：Wise Registry Cleaner。

[https://www.wisecleaner.com/wise-registry-cleaner.html](https://www.wisecleaner.com/wise-registry-cleaner.html)

![](/posts/02-windows11-reinstall/media/image52.png)

![](/posts/02-windows11-reinstall/media/image53.jpeg)

![](/posts/02-windows11-reinstall/media/image54.jpeg)

初次使用，建议前往设置，取消勾选这两个选项（防止产生额外的储存空间占用）。

![](/posts/02-windows11-reinstall/media/image55.png)

然后点击“系统优化”；

如图，我习惯全选，然后取消勾选关于系统动画的选项。

选中之后点击“优化”，优化会即刻完成。

![](/posts/02-windows11-reinstall/media/image56.jpeg)

然后点击“注册表清理”，点击“开始扫描”，等待扫描结束。

![](/posts/02-windows11-reinstall/media/image57.jpeg)

![](/posts/02-windows11-reinstall/media/image58.jpeg)

扫描结束后，**!!!一定要点击“推荐”!!!**，然后点击“清理”，清理会即刻完成。
