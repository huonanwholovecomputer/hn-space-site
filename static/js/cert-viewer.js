/* =========================================================
   证书查看器（HN Space）—— 专门给「竞赛证书」用，取代通用灯箱
   =========================================================

   为什么另起一个查看器，而不是改 math-image.js 的灯箱：
   灯箱是 2D 的（FLIP 缩放 + 平移），而证书想看的是**它是一张塑封的纸**——
   有厚度、会反光、能被拿在手里翻一下。这两件事的运动语言完全不同：
   灯箱回答"这张图多大"，查看器回答"这张纸在光下是什么样"。

    四个动作：1~4 是用户 2026-10-26 点名要的，「按下→浮起」是 10-27 加的（见 §6b）；
    入场与退场在 2026-10-28 第十二轮**整条重写**（用户「重新设计一下」+ 一张右手系草图，
    顶上的 A = 眼睛）：模型、曲线与旋钮见 §6c，这里只记结论。
    1. 打开：**一张躺在桌面上的纸被拉起来**（1250ms）——
       起手时纸躺在 X-Y 平面上（rotateX 27.2°，透视把矩形压成斜的梯形，正是草图里那两个），
       随后沿 Z 轴被拉向观众：位移 + 放大 + 一条向下的弧线；纸面被"风"顶着**滞后地**翻正
       （翻转比位移慢半拍，起手 200ms 几乎不转），到顶端（入场 68% 处）刚好正对观众，
       再冲过去 -2.5° 就摆回来（2026-10-28 第二轮：反向只留一点点）；
       同时纸越过落点 11~22px（"拉到顶端"），随后**缓缓下落**那一点点。
       "重"不靠放慢，靠三件事：起手是"被拽"不是"弹射"、翻转滞后于位移、
       最后 400ms 的速度曲线两端斜率都是 0（先挂住、再落下）。
       被否掉的老路线（别再调回去）：整圈 360° 翻转 —— 「背面有些丑」「转多了」；
       通道留在 §6 的 SPIN_ON（默认 false），打开照旧能转。
    2. 拖动：抓起来转（只有横向 + 竖向两个轴），角度**越拉越费劲**、渐近一个够不到的上限
       （橡皮筋，见 §9 的 rubber）；松手带惯性，由与入场同一档阻尼比的弹簧收回正对；
    3. 缩放：滚轮 / 触控板捏合、触屏双指捏合、触屏双击 —— 以指针（或双指中心）为锚点，
       放大后单指拖动变成"平移"（读证书时的直觉）；
    4. 悬停：只剩 ±3° 的微倾。**光效整套删掉了**（用户 2026-10-26 要求）：
       高光斑 .cv-gloss、塑封反射带 .cv-film、跟随指针的背光 .cv-shade、场景泛光
       .cv-bloom 全部移除，卡片现在只有静态的纸边与颗粒。
    5. 退场：把这张纸**放**回纸堆（520ms，是入场的逆过程但不是倒放）：沿一条更浅的下坠弧
       回到它的格子，飞的过程中被空气顶一下（只朝反方向摆 -5°，然后回正到 0°），落点严格是
       空壳的矩形与 0°，插入那一帧看不出接缝。
   2. 拖动：抓起来转（只有横向 + 竖向两个轴），角度**越拉越费劲**、渐近一个够不到的上限
      （橡皮筋，见 §9 的 rubber）；松手带惯性，由与入场同一档阻尼比的弹簧收回正对；
   3. 缩放：滚轮 / 触控板捏合、触屏双指捏合、触屏双击 —— 以指针（或双指中心）为锚点，
      放大后单指拖动变成"平移"（读证书时的直觉）；
   4. 悬停：只剩 ±3° 的微倾。**光效整套删掉了**（2026-10-26 用户要求）：
      高光斑 .cv-gloss、塑封反射带 .cv-film、跟随指针的背光 .cv-shade、场景泛光
      .cv-bloom 全部移除，卡片现在只有静态的纸边与颗粒。

   材质的物理边界（10-25 的实测结论）：证书是白纸，**加色加不动**（白纸只差 0.4 级色阶），
   这也正是"在白纸上打光"最终被删掉的原因 —— 真正读得出的只有纸的厚度、截面与边线。

   依赖：无。<html> 滚动锁与 Lenis 锁复用 window.__hnLbLock（math-image.js 导出），
   拿不到就自己兜一个最小实现，绝不让"打开后页面还在滚"。

    ---- 卡片本体：抽取 / 插入（2026-10-27 用户第五轮原话）----
    「证书现在的放大效果是创建一个新图层然后再放大？需要改为卡片本体进行移动和放大，
      即抽取与插入。」
    以前是**复制**：浮层里新建一张卡、塞一张大图，再从缩略图的矩形 FLIP 长出来 ——
    看着像，但飞上去的和页面里那张是两件东西（纸张的边线、截面、颗粒都是浮层自带的替身）。
    现在改成**同一张纸**：open() 把页面里那个 <a class="cert-paper__sheet"> 整块搬进
    .cv-face（抽取），原地留一个同尺寸的空壳占住布局（.is-cv-hole）；关闭时先 FLIP 回
    空壳的位置与尺寸、再把节点搬回原处（插入）。"移动和放大"的那张纸从头到尾只有一个节点。
    代价：纸里那张 <img> 的 src 要在缩略图与大图之间来回换（关闭时换回缩略图，
    否则 148px 的盒子会一直挂着原图 594KB 的解码结果）。实现见 §4b。
   ========================================================= */
(function () {
  'use strict';
  if (window.__hnCertViewer) return;

  var SEL = 'a[data-cert-viewer]';
  var reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  /* ---------- 0. 常量：手感 ---------- */
  /* 两处弹簧共用**同一档阻尼比 ζ≈0.32**，只有 ω 不同 —— 用户 2026-10-26 反馈
     「拖动回弹和入场的阻尼好像不是同一个，入场更硬」，所以阻尼比统一，差别只在快慢：
       · 主摆 KP/KD：ω≈9.06（1.44Hz），拖动松手后回正 / 换张时的小摆，摆一下半就停；
       · 入场 SPIN_KP/SPIN_KD：ω≈7.35（1.17Hz），频率更低 = 更"重"，见下面 §入场旋转。 */
  var KP = 82, KD = 5.8;             /* ζ = kd/(2ω) ≈ 0.32 */
  /* 悬停级：只做 4.5° 以内的小倾，ω≈7.7，ζ≈0.55（几乎不过冲，歪一点点就停） */
  var HKP = 60, HKD = 8.5;
  /* 拖动角度：**不是硬上限，而是"越拉越费劲"的橡皮筋**（用户 2026-10-26 要求）。
     线性区内 1:1 跟手（到 SOFT），越过 SOFT 之后按指数压缩、渐近 HARD —— 永远够不到 HARD，
     所以"最终拉不动"，但也没有那道突然撞墙的截断。HARD 取在快要侧过去（90°）之前，
     任何角度都还能看见纸，不会拖出一张空白背面。
     数值手感：Y 轴 SOFT=50°/HARD=86°，从 0 拖到 300px（约 102° raw）才到 ~80°。 */
  var DRAG_SOFT_X = 36, DRAG_HARD_X = 64;   /* 上下（rotateX） */
  var DRAG_SOFT_Y = 50, DRAG_HARD_Y = 86;   /* 左右（rotateY） */
  var SWING_RX = 74, SWING_RY = 96;         /* 甩出去回弹时的硬兜底（别让它翻到背面） */
  var DRAG_GAIN = 0.34;              /* 1px 指针 → 多少度（线性区） */
  /* 缩放上限：证书原件是扫描件，放到 3.2 倍时字已经很大，再放就是糊的了 */
  var ZOOM_MAX = 3.2;

  /* ---- 入场旋转的手感（2026-10-26 第五版，用户原话）----
     「让证书变"重"一些，现在感觉很"轻"，很"硬"，需要减慢旋转速度，
       像是很大的物品在运动时受到了空气阻力。」
     「拖动回弹的阻尼和证书入场时的阻尼好像不是同一个？入场阻尼更高，弹性不明显。」
     被否掉的路线（别再调回去）：
       ① rotateX 跷跷板（竖向摆）—— 只要横向；
       ② 360° + 99° 过冲、摆 2.1s —— 「转的有点多，阻尼不够强」；
       ③ 360° + 32° 过冲 —— 仍「像转了两圈」；
       ④ 半圈 0.33s + ω=14 的硬弹簧 —— 「很轻、很硬」。
     （②③ 否掉的是**过冲量**（+99°、+32°），不是「不许转满一圈」；2026-10-27 试的整圈
       过冲只有 +15°，落点不会读成"转了两圈"，见本块末尾那段。）
     "重"不是靠放慢一档速度装出来的，而是三件事一起：
       · 慢：半圈 0.56s（不是 0.33s），全程平均只有 ~320°/s；
       · 空气阻力：A 段 drag 从 0.6 提到 1.8，过正面时角速度已经从 520 掉到 ~190°/s
         —— 手一离开就更慢，像在推一张大纸；
       · 低频：B 段 ω 从 14.1 降到 7.35（1.17Hz），ζ 与拖动回弹统一在 0.32
         —— 过冲 17°、回弹 6°、0.9s 后才慢慢摆回来，1.4s 静止（不再"啪"一下刹住）。
     数值用 .tools/spin-spring.py 在 1/120、1/60、1/30 帧率下复核过。

    2026-10-27（用户原话「证书的旋转改成360看看（起始是正着的）」）—— 入场从
    「背面 180° 起、翻半圈」改成「**正面 0° 起、转满一圈**」：开场那一刻纸就是正着的，
    随后整圈转过背面再落回正向。手感配方一个字没动（drag / kp / kd 与上一版同值），只改了两个数：
      · SPIN_START 180 → 0；SPIN_V0 520 → 848。
    ⚠️ A 段是**纯指数衰减**（a'' = -drag·a'），它能走的最大角度是 v0/drag：
       520/1.8 = 289° < 360° ⇒ 只把 START 改成 0 而不抬 v0，纸会**永远转不满一圈**
       （渐近停在 289°、正侧着，B 段弹簧永不接管）。转 360° 要求 v0 > 1.8×360 = 648。
       848 是反过来解的：让「落地瞬间仍剩约 190°/s」——与上一版半圈落地那一刻的角速度
       （520·e^(-1.8·0.54) ≈ 190°/s）对齐，**同一个"重"法，只是多走一倍路**。
    实测（与 .tools/spin-spring.py 同一个积分器，1/120、1/60、1/30fps）：
       转满一圈 0.82 / 0.83 / 0.90s，落地 190 / 179 / 150°/s，
       过冲 +16°（峰 376°）、回弹 -5°（到 355°）、可见静止 1.6s、全静止 2.1s
       （上一版：半圈 0.54s、过冲 +17°、可见静止 1.25s）。 */
  var SPIN_START = 0;                /* 开场姿态：**正对着观众**（0°），转满一圈 */
  var SPIN_TARGET = 360;             /* 收在正向（360° ≡ 0°，同一个朝向） */
  var SPIN_V0 = 848;                 /* 起手角速度（°/s）：整圈 0.83s。必须 > SPIN_DRAG×360，见上 */
  var SPIN_DRAG = 1.8;               /* A 段空气阻尼（1/s）：大纸在空气里的那种掉速 */
  var SPIN_KP = 54, SPIN_KD = 4.8;   /* B 段：ω≈7.35rad/s、ζ≈0.33（与拖动回弹同一档阻尼比） */

  /* ---- 入场：Z 轴拉起 + 风阻旋转（2026-10-28 第十二轮，按用户草图重画）----
     草图的坐标系（顶上的 A = 眼睛即视点）：X-Y 是桌面，眼睛在 Z 轴上方。证书先**躺在桌面上**
     （图下方那个小平行四边形），沿 Z 轴被拉起来（红箭头），因为空气阻力边飞边转（粉色那条弧），
     拉到顶端（虚线）后缓缓下落一点点，3D 旋转角归零。这一版把「入场倾角」整条通道重写成
     **空气动力学的时间线**：
       · 起手躺着：rotateX 正角把上沿压向远处（透视再把矩形压成梯形）= 草图上那两个平行四边形；
       · 一路上被"风"顶住：纸面的翻转**滞后于位移** —— D(p) 前段是 smoothstep，起手 200ms 几乎
         不转，到顶端才正对观众，所以中段看得见"纸在被掀起来"；
       · 顶端之后**冲过头**：D 越过 1 ⇒ 纸再往前倾一点（LIFT_SWING_DEG），然后摆回 0 ——
         用户说的"缓缓下落一点点距离，同时 3D 旋转角归零"就是这一段；
       · 横向：卡片**朝运动方向侧过去**（rotateY 由横向速度给，LIFT_YAW_DEG 封顶）。
     全部是 p（入场进度 0→1）的解析函数：没有积分器、没有速度状态 ⇒ 掉帧、60/120Hz、
     中途被打断都不会漂、不会错拍。数值用 node .tools/cv-zlift-curve.mjs 对账（改常量先跑它）。 */
  /* 方向（2026-10-28 第三次反馈：「这个确实反了」）—— 上一版把 CSS 的符号读反了：
     rotateX **负角**才是上沿朝观众兜过来、下沿压向远处（**箭头/草图指的就是这一向**）；
     正角相反，是上沿压向远处。所以下面施加的一律是 **-LIFT_FLAT_DEG**（负号在 entryTilt 里，
     整个倾角通道只有那一个方向开关）。幅度照旧 68°、回冲 2.5° —— 反的是方向，不是力度。 */
  var LIFT_FLAT_DEG = 27.2;      /* 躺平时绕 X 的角度**绝对值**：实际施加 -27.2°（0 = 正对观众）。
                                    2026-10-28 第四次反馈「这转太多了，减少 60%」：整条倾角通道按 ×0.4 缩，
                                    68 → 27.2（同比例缩的还有下面的 SWING / YAW 两个角；时间线一个没动） */
  var LIFT_FLAT_IN_P = 0.11;     /* 躺平占入场的比例：11% × 1250ms ≈ 140ms。点击那一帧纸还是
                                    正着的（和页面里那张一样，不跳），随后被"按"到桌面上再抬起；
                                    这一段就是「按压感」的下半截（上半截在缩略图上，见 §0b） */
  var LIFT_TOP_P = 0.68;         /* 「拉到顶端」的时刻 = L 的峰值（草图里那条虚线） */
  var LIFT_TOP_POW = 2.2;        /* 起手段的幂：被拽起来（起手快、长尾，到顶端速度归 0） */
  var LIFT_SINK_POW = 1.5;       /* 顶端之后那段 cos 的幂：越大越"挂"在顶端，慢慢滑下来 */
  /* 「缓缓下落一点点」的距离与过冲那点缩放（2026-10-28 第十二轮第二版）：
     第一版把过冲挂在"沿路径冲过头"上，结果缩略图正好在视野中心时（dy≈0）那一下
     完全看不见 —— 起伏只跟屏幕位置有关就不叫"拉到顶端再落下"了。
     现在过冲是一条**与位置无关的窗**：顶端 1、两端 0（见 topWindow()），
     所以不管纸从哪里起飞，顶端都会越过落点 10~20px 再落回来。 */
  var LIFT_SETTLE_H = 0.024;     /* 下落距离 = 卡片高度 × 这个比例，夹在 10~20px */
  var LIFT_SCALE_OVER = 0.014;   /* 顶端那一刻比落点大 1.4%（再多读成"胀了一下"） */
  var LIFT_SWING_DEG = 1;        /* 顶端之后纸朝**主方向的反侧**倾的最大角度（冲过 0 的那一下：
                                    主方向是负角，所以这一下是 +1°。2026-10-28：先按「减少反向」9 → 2.5，
                                    再随整条通道 ×0.4 → 1；只留一口余韵） */
  var LIFT_YAW_DEG = 2.2;        /* 「朝向运动方向」：横向速度让它侧到这个上限（5.5 × 0.4） */
  /* 对角侧倾（2026-10-28 第四次反馈：在截图左上角写「这里按下去一些」、右下角写「这里提起来一些」）。
     绕 Y 轴的**常值**侧倾，与躺平角共用同一条包络（同步长出来、同步归零）：
     rx 是负角（上沿朝观众），配一个**负**的 ry 就把深度沿对角线撕开 ——
     左上角退远（按下去）、右下角凑近（提起来），左边缘整体比右边缘小。
     为什么不能真的让「左后右前」翻过来：rx=-27.2° 已经让上沿整体前倾 152px，
     要让 TL 的深度绝对小于 BR 得 ry≈-40°，卡片会读成「侧着看」。所以这里只做**增减**：
     左侧退、右侧进，读起来正是一角被按住、对角的角被拎起来。 */
  var LIFT_ROLL_DEG = 16;
  var LIFT_YAW_REF = 900;        /* px/s：横向速度到这个值就侧满 */
  /* 退场：把纸**放**回纸堆时，倾角朝反方向顶一下的最大角度（然后回正到 0°） */
  var LIFT_OUT_TIP_DEG = 5;
  /* 入场时长（用户 2026-10-26「太短了」→ 900ms；2026-10-28 重画时间线 → 1250ms）：
     多出来的时间全在**顶端之后**那段（拉起来 ≈850ms + 挂住/下落 ≈400ms）。
     关键帧是**采样**出来的（easing: linear），速度曲线全在 entryPath() / riseAt() 里 ——
     不再交给 CSS 的 cubic-bezier 分配时间，这样倾角与位移才能共用同一根时钟。 */
  var FLIP_MS = 1250;
  var FLIP_PATH_SAMPLES = 64;    /* 采样段数：1250ms 里每段约 20ms，段内线性看不出来 */
  var FLIP_EASE = 'cubic-bezier(.4,.08,.25,1)';   /* 只剩「纸自己的斜角摆正」那一条用它 */
  var CLOSE_MS = 520;            /* 退场：比入场短得多 —— 放下比拿起来果断 */
  /* ---- 入场路径：一条**向下弯折的弧线**（用户 2026-10-27 第五轮原话）----
     「卡片的放大展示的运动路径需要是一个向下弯折的弧线，而不是直线运动」。
     平移本来沿直线；现在另外压一个向下的位移（两端为 0、中段最大）⇒ 路径成了
     「先沉下去、再抬起来到眼前」的弧（纸贴着桌面被拖了一下才离地的感觉）。
     幅度按行程取比例并夹在 40~150px：手机竖屏纸就在屏幕中间（行程短）时不许弧成画圈，
     大屏（行程长）时也不许甩出视口。
     最低点偏前（p^0.85 把它提到约 44% 处），到「顶端」（LIFT_TOP_P）时弧已经收成 0 ——
     顶端的姿态只由 L 的过冲决定，两件事不打架。 */
  var FLIP_ARC_SAG = 0.16;      /* 下坠幅度 = 行程 × 这个比例 */
  var FLIP_ARC_MIN = 40, FLIP_ARC_MAX = 150;   /* 下坠幅度的上下限（px） */
  var FLIP_ARC_BIAS = 0.85;     /* <1 = 最低点往起手那边挪（0.85 ⇒ 约 44% 处） */

  /* ---- 点击反馈：被按下去，然后浮起来（2026-10-27 用户原话）----
     「压下然后弹起，需要有承重感，像航母在海上受到巨大按压后然后浮起来」
     第三轮修正（用户 2026-10-27：「按压在入场动画播放快完成的时候自动触发了」）——
     前两版都把这一记挂在**入场时间轴**上：第一版在 open() 那一刻（纸还是背面、还在从
     缩略图长大，26px 被"长大 + 翻转"淹掉），第二版改到 spin 越过 360° 的落地那一刻
     （promise 是"等纸正对观众才看得见"）。第二版确实看得见了，但它是**自动**的：
     用户什么都没按，纸自己沉一下 ⇒ 那不是"点击反馈"，是又一段入场动画。
     现在只由**真实的指针按下**触发（onDown 里按在纸上那一刻给冲量），与入场彻底解耦：
     不做任何操作 ⇒ press 恒为 0；按下纸 ⇒ 压到底再被弹簧托回来，按几次给几次。
     手感仍是同一条欠阻尼弹簧：给纸一个向下的**冲量**，让它真的被按下去、再被托起来。
     ω=5.0rad/s（0.8Hz）、ζ=0.45：约 200ms 压到底、约 2s 收干净，浮起来时越过原位约 4px
     —— 那一下过冲才是承重感。换成临界阻尼（ζ=1）像电梯停稳，ζ=0.8 只弹一下，都不像重物。 */
  var PRESS_PEAK = 34;     /* 设计目标：压到底的"深度"（模型单位）。渲染按它归一化成缩放比例 */
  /* 压到底时以中心为准缩小的比例（俯视下"被按进水里"= 面积变小，不是位置下移）。
     2026-10-27 第四轮用户原话：「卡片不应该是下沉，而是中心缩小，我之前类比的海上游轮得是'俯视'的」。 */
  var PRESS_SCALE = 0.05;
  var PRESS_K = 25;        /* ω²，ω = 5.0 rad/s */
  var PRESS_D = 4.5;       /* 2ζω，ζ = 0.45 */
  var PRESS_V0 = 330;      /* 按下瞬间给纸的向下速度（px/s）：实测约 0.25~0.4s 压到 34px 附近
                              （270 只压到 27px，2026-10-27 按 .tools/fx3-check.mjs 的实测调上来） */
  /* 重复点击的封顶（px）：这条弹簧按一次的峰值约 38px，够不到这里；
     只有「上一记还没收回又按一下」才会越压越深，封住它才不会一记比一记狠。 */
  var PRESS_MAX = 46;

  /* 扫光：一次打开只播一次（用户明确「不允许反复触发」）。 */
  var SWEEP_MS = 820;
  var SWEEP_DELAY = 620;   /* 等纸基本长到眼前再扫。FLIP 的 dolly 在 68%（850ms）到顶端，
                              620ms 时已经 ~90% 大小、倾角只剩几度 —— 再早，带子扫的
                              还是一张正在长大、还在掀起来的纸。 */
  /* 扫光的运动曲线：**先快后慢**（用户 2026-10-27「扫光的运动曲线是直线？改成先快后慢」）。
     原来那条 cubic-bezier(.45,.04,.3,1) 是"先慢—中段快—再慢"，中段几乎匀速，看着就是直线。
     现在这条实测（.tools/fx3-check.mjs 把动画暂停、把时间轴钉在 0/25/50/75/99.9% 再读位移）：
     1/4 时间走掉 49% 路程、一半时间 83%、最后 1/4 只走 3% —— 前半程快、后半程收，光一闪而过。
     没直接用 expo-out（.16,1,.3,1）：那条在 1/4 时间里就走掉 83%，整道光合起来只剩 200ms，
     太快了，看不出"扫"的过程。 */
  var SWEEP_EASE = 'cubic-bezier(.3, .55, .4, 1)';

  var S = {
    open: false, ready: false, reduced: false,
    items: [], index: 0,
    el: {}, box: { w: 0, h: 0 },
    phys: { rx: 0, ry: 0, vx: 0, vy: 0 },
    /* 点击反馈：y = 按压深度（模型单位，正 = 被按下去），v = 速度；由 stepPress 收回 0；
       渲染时映射成**以中心缩小的比例**（见 §6b 与 render 里的 PRESS_SCALE）。
       这里**没有"一次打开只给一次"的闸门** —— 它跟着手指走：按几次给几次。 */
    press: { y: 0, v: 0, on: false },
    /* 扫光：locked 在 open() 置位、closeNow() 解锁 —— 一次打开只扫一次 */
    sweep: { locked: false, anim: null },
    hov: { x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0 },
    drag: {
      on: false, id: null, lx: 0, ly: 0, lt: 0, vx: 0, vy: 0, moved: 0, rawX: 0, rawY: 0,
      /* 本次拖动的橡皮筋区间：默认就是上面那两条常量。**只有从入场翻转手里接过来时**
         才会临时放宽（见 handOverSpin / onDown）——那时角度最大已经到 180°，
         用默认的 50/86 收它，一抓就会被压回 86°，肉眼就是"跳一下"。 */
      softX: DRAG_SOFT_X, hardX: DRAG_HARD_X, softY: DRAG_SOFT_Y, hardY: DRAG_HARD_Y
    },
    /* 缩放：s = 倍数，x/y = 相对卡片中心的平移（px）。滚轮 / 双指 / 双击都写这三个数。 */
    zoom: { s: 1, x: 0, y: 0 },
    /* 双指捏合：d0/cx0/cy0/s0/x0/y0 是捏合开始那一刻的快照 */
    pinch: { on: false, d0: 0, cx0: 0, cy0: 0, s0: 1, x0: 0, y0: 0 },
    ptrs: {},                 /* 当前按在浮层上的指针（捏合要两根） */
    tap: { t: 0, x: 0, y: 0 },/* 上一次"轻点"的时间和位置（双击放大用） */
    /* 入场旋转：a = 当前角度（0 = 正面起步，180 = 背面，360 = 正向），v = 角速度（°/s）。
       2026-10-27 起 SPIN_ON = false，这两个数恒为 0（通道保留，开关一开就照旧工作）。 */
    /* target：B 段弹簧要收敛到的角度。整圈入场是 360°（SPIN_ON = false 时这条通道用不到）。 */
    spin: { on: false, a: 0, v: 0, caught: false, target: SPIN_TARGET },
    /* 入场「Z 轴拉起 + 风阻旋转」那一层（见常量区与 §6c）：
       el = 入场已经过了多久（秒，只在没有 WAAPI 时用来算进度），p = 入场进度 0→1，
       ax/ay = 当前倾角（deg），h = 离桌高度 0→1（影子按它摊开/变淡）。
       这里**没有速度/松手状态**：角度每帧按 p 直接算，不是弹簧积出来的。 */
    grab: { on: false, el: 0, p: 0, ax: 0, ay: 0, h: 0 },
    raf: 0, last: 0, flipAnim: null, flipFrom: null, origin: null, lastFocus: null,
    /* 入场时量下的**布局框**（不含 transform）：退场算落点只用它，绝不量自己被改写过的框 */
    flipBox: null, shadowW: 0, shadowH: 0,
    /* 卡片姿态的 WAAPI：入场把页面里那道手角度摆正、退场再摆回去。
       ⚠️ 挂的是 **.cv-slab（整张卡：塑封边 + 纸）**，不是纸自己 ——
       纸只是卡里的一个 child，转在纸上就成了「纸在塑封套里自己转」：
       纸的四角被 .cv-face 的 overflow 切掉，卡片本体的米色/塑封边在左右两侧露出来，
       读起来是「证书和卡片本体脱离了、内容逆时针转了几度」（2026-10-28 用户报的就是这个）。
       和 .cv-flip 的 FLIP 是两条独立动画（不同元素），互不覆盖。 */
    poseAnim: null,
    /* 倾角层与影子的退场动画（fill:'both'，closeNow 里 cancel） */
    grabAnim: null, shadowAnim: null,
  };

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* ---------- 0b. 缩略图上的「按下」反馈（2026-10-28 第十一轮）----------
     用户原话：「点击证书后，证书会发生缩小的点击效果，然后再执行后面的平滑放大」。
     按下去那一刻给**这叠纸**挂 .is-pressed（about.css 里缩到 0.965、110ms），抬手就摘 ——
     视觉序列因此是「按一下（缩）→ 松手 → 浮层接手平滑放大」。
     · 用类而不是 CSS :active：纸堆的指针状态本来就归 JS（site.js 的 is-pointed），
       而 :active 在触屏与无头环境里不可靠（实测 CDP 派发的 mousePressed 不会让它生效，
       那就没法验收了）；
     · 抬手时不立刻摘掉会被带进浮层（那一层不需要这个类），所以 open() 里也清一次；
     · 只认主键 / 触点：右键、中键不压纸。 */
  var pressEl = null;
  function endThumbPress() {
    if (!pressEl) return;
    pressEl.classList.remove('is-pressed');
    pressEl = null;
  }
  /* 压的是**整叠纸**：类挂在 .cert-paper__stack 上（about.css 里的 --paper-press 缩的就是它）。
     挂到单张纸上时另一张不动，两拍读起来就是两个无关的动作（用户 2026-10-28 的反馈）。 */
  document.addEventListener('pointerdown', function (e) {
    if (e.button > 0 || S.open) return;
    var link = e.target && e.target.closest ? e.target.closest(SEL) : null;
    if (!link) return;
    var deck = link.closest('.cert-paper__stack') || link;
    endThumbPress();
    deck.classList.add('is-pressed');
    pressEl = deck;
  }, true);
  document.addEventListener('pointerup', function (e) {
    /* 抬手就摘，但别在同一个事件里把过渡打断得太生硬：620ms 的回弹正是"松手"那一下 */
    if (e.target && e.target.closest && e.target.closest(SEL)) endThumbPress();
    else endThumbPress();
  }, true);
  document.addEventListener('pointercancel', endThumbPress, true);
  document.addEventListener('pointerleave', function (e) {
    if (pressEl && e.target === pressEl) endThumbPress();
  }, true);

  /* ---------- 1. 拦截点击 ----------
     必须在**捕获阶段**、且注册得比 math-image.js 更早（脚本顺序保证），
     否则通用灯箱会先一步把点击吃掉。stopImmediatePropagation 是必须的：
     math-image 的委托也挂在 document 捕获阶段，stopPropagation 拦不住同级的它。 */
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button > 0) return;
    var link = e.target && e.target.closest ? e.target.closest(SEL) : null;
    if (!link) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    open(link, e.target);
  }, true);

  /* ---------- 2. 打开 ---------- */
  function open(link, tappedEl) {
    if (S.open) return;
    endThumbPress();                   /* 抬手时已经摘过一次；这里兜底，别把按下态带进浮层 */
    var items = readItems(link);
    if (!items.length) return;         /* 解析失败：交回浏览器（href 是原图） */
    S.items = items;
    S.index = 0;
    S.origin = originOf(tappedEl, link);
    S.hov.x = S.hov.y = S.hov.tx = S.hov.ty = S.hov.vx = S.hov.vy = 0;
    resetZoom();                       /* 每次打开都从 1x 开始 */
    S.reduced = !!(reduceMQ && reduceMQ.matches);
    S.lastFocus = document.activeElement;

    build();
    S.open = true;
    S.ready = false;
    lockPage(true);

    S.el.root.hidden = false;
    /* 抽取：把页面里那张纸整块搬进浮层的纸面（S.el.img 随之指向它自己的 <img>）。
       必须在 setImage 之前 —— 要换 src 的是纸里那张图，不是浮层新建的图。 */
    extractSheet();
    /* 先量目标框（此时舞台已按 --cv-w/--cv-h 布局），再拿它算 FLIP 起点。
       这份框**必须是没被 transform 改写的布局框**：入场时 .cv-flip 还是干净的，
       退场时它已经被入场改写过了 ⇒ 退场一律用这里记住的数算，绝不量自己（见 §5）。 */
    fitBox(items[0]);
    setImage(0);
    var fb = S.el.flip.getBoundingClientRect();
    S.flipBox = { cx: fb.left + fb.width / 2, cy: fb.top + fb.height / 2, w: fb.width, h: fb.height };
    /* ⚠️ 首帧就得是**缩略图那么大**（2026-10-28 第十一轮实测出来的坑）：
       FLIP 的 WAAPI 在下一个 rAF 里才创建，这中间浏览器会先按 layout 尺寸画一帧
       ——实测 .cv-flip 那一帧是 942×666（整幅大证书）、transform 还是 none，
       下一帧才"缩"到 201×147 再开始长大。屏幕上就是「闪一下大的 → 缩回去 → 放大」。
       所以在同步阶段就把 FLIP 的起点姿态写上去，动画随后接管（首帧与它完全一致，不跳）。 */
    var pre = layoutOffset(S.origin.rect);
    /* ⚠️ 起点参数要**在这里存下来**：一旦把姿态写到 .cv-flip 上，它的 getBoundingClientRect()
       就只剩 201×147 了，playFlipIn 再算一次「起点/终点的比例」会得到 ≈1，
       于是动画等于从满幅开始 —— 放大效果整个消失（2026-10-28 实测过这个坑）。 */
    if (pre) { S.flipFrom = pre; S.el.flip.style.transform = flipTransform(pre); }
    /* 每次打开都从静止姿态开始（上次拖动/关闭留下的角度不能带进来） */
    S.phys.rx = S.phys.ry = S.phys.vx = S.phys.vy = 0;
    /* ⚠️ 必须在 rAF **之前**同步调用（kickSpin 里会把首帧姿态钉在 SPIN_START）。
       2026-10-27 起 SPIN_START = 0（正面），写不写这一步画面都一样；但入口保留在同步位置，
       免得下一次改常量（比如又想要背面起步）时，卡片先按 0° 画一帧再跳到起始角。 */
    kickSpin();
    /* 「捏住右下角」那条曲线的状态在 rAF **之前**清掉：入场第一帧是 0°（曲线从 0 起），
       之后每帧由 stepGrab 按 FLIP 的时钟算角度。 */
    startGrab();
    S.sweep.locked = false;      /* 新的一次打开：这一次的扫光有效 */
    /* 点击反馈**不在这里**触发，也不挂在入场时间轴上的任何一刻：它只由真实的指针
       按下驱动（onDown → startPress）。挂在入场上的两版用户都判为"自动触发"。 */
    startSweep();
    requestAnimationFrame(function () {
      S.el.root.classList.add('is-open');
      playFlipIn();
      S.ready = true;
      try { S.el.close.focus({ preventScroll: true }); } catch (eFocus) { }
      start();
    });
  }

  /* 一张纸 = 一张证书（2026-10-26 用户要求：点哪张就放大哪张，不做画廊）。
     读 data-cert-item（单个对象）；老结构里的 data-gallery-items 只在里面有 1 项时兼容。 */
  function readItems(link) {
    var it = null;
    var raw = link.getAttribute('data-cert-item');
    if (raw) {
      try { it = JSON.parse(raw); } catch (e) { it = null; }
    }
    if (!it) {
      var old = link.getAttribute('data-gallery-items');
      if (old) {
        try {
          var arr = JSON.parse(old);
          if (arr && arr.length) it = arr[0];
        } catch (e2) { it = null; }
      }
    }
    if (!it || !it.img) {
      var href = link.getAttribute('href');
      if (!href) return [];
      var img = link.querySelector('img');
      it = { img: href, alt: (img && img.alt) || '', label: '', ar: 0, thumb: '' };
    }
    return [{ img: it.img, alt: it.alt || '', label: it.label || '', ar: Number(it.ar) || 0, thumb: it.thumb || '' }];
  }

  /* 起点：优先用户真正点中的那一张纸（纸堆里有两张叠着，用 querySelector 会拿错）。
     除了矩形，还要记住它**在文档里的位置**（parent / next）与此刻的斜角（matrix）：
     抽取之后这块 DOM 就不在页面里了，关闭时要靠这几样把它放回同一格。 */
  function originOf(tappedEl, link) {
    var node = (tappedEl && tappedEl.closest && tappedEl.closest('.cert-paper__sheet')) ||
      link.querySelector('.cert-paper__sheet') || link;
    var r = null;
    try { r = node.getBoundingClientRect(); } catch (e) { r = null; }
    if (!r || !r.width) { r = link.getBoundingClientRect(); }
    var img = node.querySelector ? node.querySelector('img') : null;
    return {
      el: node,
      rect: { left: r.left, top: r.top, width: r.width, height: r.height },
      parent: node.parentNode,
      next: node.nextSibling,
      /* 页面里这张纸是斜着放的（纸堆的手角度，悬停时还会再扇开 2°）：
         抽取那一帧要接住这个姿态，否则搬进浮层时会「跳正」3°。 */
      matrix: liveTransform(node),
      /* 缩略图的 src 原样留一份：关闭时要换回去（大图只在放大期间用） */
      imgSrc: img ? img.getAttribute('src') : '',
      imgDraggable: img ? img.getAttribute('draggable') : null
    };
  }

  function liveTransform(el) {
    try { return getComputedStyle(el).transform || 'none'; } catch (e) { return 'none'; }
  }

  /* ---------- 3. DOM ---------- */
  function build() {
    if (S.el.root) return;
    var root = document.createElement('div');
    root.className = 'cv-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', '证书查看器');
    root.setAttribute('data-lenis-prevent', '');
    root.hidden = true;

    var svg = function (inner, size) {
      return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor"' +
        ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + inner + '</svg>';
    };

    root.innerHTML =
      '<div class="cv-scrim" data-act="close"></div>' +
      '<div class="cv-stage">' +
      '<div class="cv-shadow" aria-hidden="true"></div>' +
      '<div class="cv-flip">' +
      /* .cv-press 专职「点击反馈」：整张纸被按下之后浮回来（只写 translateY + 极小的缩放）。
         单独一层是因为 .cv-flip 的 transform 被 FLIP（WAAPI）整段占用，叠在一起会互相覆盖。 */
      '<div class="cv-press">' +
      /* .cv-zoom 只负责滚轮/双指/双击的缩放与平移，和 .cv-flip 的 FLIP 动画、
         .cv-persp 的透视、.cv-tilt 的旋转各管一层，互不覆盖。 */
      '<div class="cv-zoom">' +
      '<div class="cv-persp">' +
      /* .cv-grab 专职「Z 轴拉起 + 风阻旋转」（2026-10-28 第十二轮）：入场/退场的整套 3D 姿态
         都写在这一层（见顶部常量区与 §6c），绕的是纸自己的**中心**，所以必须留在 .cv-persp
         里面才吃得到透视；.cv-tilt 的 transform 归拖动与入场自转所有，两件事不能写在同一层上。 */
      '<div class="cv-grab">' +
      '<div class="cv-tilt">' +
      '<div class="cv-slab">' +
      /* .cv-face 里没有自己的 <img>：证书的「本体」是整个 <a class="cert-paper__sheet">，
         打开时被 extractSheet() 整块搬进来（抽取），关闭时搬回页面原位（插入）。 */
      '<div class="cv-face">' +
      '<span class="cv-rim" aria-hidden="true"></span>' +
      '<span class="cv-noise" aria-hidden="true"></span>' +
      /* 扫光：点开时从纸上扫过一次（一次打开只播一次）。带子本身在 .cv-sweep 里被裁，
         所以纸外面不会漏光。 */
      '<span class="cv-sweep" aria-hidden="true"><span class="cv-sweep__band"></span></span>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="cv-hud">' +
      '<p class="cv-cap"><span class="cv-cap-text"></span></p>' +
      '<p class="cv-hint">拖动转动 · 滚轮放大 · Esc 关闭</p>' +
      '</div>' +
      '<button class="cv-close" data-act="close" aria-label="关闭">' +
      svg('<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>', 20) + '</button>';

    document.body.appendChild(root);

    S.el = {
      root: root,
      scrim: root.querySelector('.cv-scrim'),
      stage: root.querySelector('.cv-stage'),
      shadow: root.querySelector('.cv-shadow'),
      flip: root.querySelector('.cv-flip'),
      press: root.querySelector('.cv-press'),
      sweep: root.querySelector('.cv-sweep'),
      sweepBand: root.querySelector('.cv-sweep__band'),
      zoom: root.querySelector('.cv-zoom'),
      persp: root.querySelector('.cv-persp'),
      /* 「捏住右下角」那条曲线专用的独立 3D 层（见顶部常量区） */
      grab: root.querySelector('.cv-grab'),
      tilt: root.querySelector('.cv-tilt'),
      slab: root.querySelector('.cv-slab'),
      face: root.querySelector('.cv-face'),
      /* 纸里那张 <img> 由 extractSheet() 填，关闭时随插入一起还回去 */
      img: null,
      capText: root.querySelector('.cv-cap-text'),
      cap: root.querySelector('.cv-cap'),
      hint: root.querySelector('.cv-hint'),
      close: root.querySelector('.cv-close')
    };

    /* 触屏上没有 Esc 键也没有滚轮：提示换成触屏的说法（遮罩本来就是关闭热区） */
    if (window.matchMedia && window.matchMedia('(hover: none)').matches) {
      S.el.hint.textContent = '拖动转动 · 双指/双击放大 · 点空白处关闭';
    }

    root.addEventListener('click', onHudClick);
    root.addEventListener('pointerdown', onDown, { passive: false });
    root.addEventListener('pointermove', onMove, { passive: true });
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);
    /* 滚轮：passive:false 才能 preventDefault（既不让页面滚，也不让 Lenis 接管）。
       触控板的捏合手势浏览器会以 ctrlKey=true 的 wheel 事件送进来。 */
    root.addEventListener('wheel', onWheel, { passive: false });

  }

  function onHudClick(e) {
    var btn = e.target.closest('[data-act]');
    if (!btn) return;
    /* 2026-10-26：上一张/下一张已删除 —— 一张纸就是一张证书，没有画廊。 */
    if (btn.getAttribute('data-act') === 'close') close();
  }

  /* ---------- 4. 布局：按证书真实比例把卡片塞进视口 ---------- */
  function fitBox(item, fromImage) {
    var vw = window.innerWidth, vh = window.innerHeight;
    var pad = vw < 700 ? 0.86 : 0.80;          /* 可用宽度占比 */
    var maxW = Math.min(vw * pad, 1080);
    var maxH = vh * (vw < 700 ? 0.60 : 0.74);
    var ar = item.ar;
    if (!ar && fromImage && S.el.img && S.el.img.naturalWidth) ar = S.el.img.naturalWidth / S.el.img.naturalHeight;
    if (!ar) ar = 0.7071;
    var w = maxW, h = w / ar;
    if (h > maxH) { h = maxH; w = h * ar; }
    S.box.w = Math.round(w);
    S.box.h = Math.round(h);
    S.el.flip.style.width = S.box.w + 'px';
    S.el.flip.style.height = S.box.h + 'px';
    /* 影子的尺寸也记一份：updateShadow 要拿它把影子的**中心**对到卡片中心
       （CSS 里 left/top 是 50%，也就是"左上角落在视野中心"，不补这一下影子会偏一格） */
    S.shadowW = Math.round(w * 0.92);
    S.shadowH = Math.round(Math.min(90, h * 0.18));
    S.el.shadow.style.width = S.shadowW + 'px';
    S.el.shadow.style.height = S.shadowH + 'px';
    updateShadow();
  }

  function setImage(i) {
    var it = S.items[i];
    if (!it) return;
    if (S.el.img) {
      S.el.img.src = it.img;          /* 缩略图 → 大图：换 src 的瞬间旧图还在屏幕上 */
      S.el.img.alt = it.alt || it.label || '获奖证书';
    }
    S.el.capText.textContent = it.label || '';
    fitBox(it);
  }

  /* ---------- 4b. 抽取 / 插入：让浮层里的就是页面里那张纸 ----------
     用户 2026-10-27：「需要改为卡片本体进行移动和放大，即抽取与插入」。
     抽取 = 把 <a class="cert-paper__sheet">（连同它的 <img> 与光斑）搬进 .cv-face；
     插入 = 关闭时把它放回原来的 DOM 位置。中间那一整套 FLIP/翻转/缩放/拖动，
     作用的对象从头到尾都是这一个节点，没有替身。 */
  function extractSheet() {
    var o = S.origin, sheet = o && o.el;
    if (!sheet || !S.el.face || !sheet.parentNode) return;

    /* 原位置留一个「洞」：布局不能塌（纸一没，右边那行文字会横跳），
       而且关闭时要有一个可量的落点 —— 页面虽然锁着滚动，但布局一塌，回去的位置就只能靠猜。
       类名原样带过去：尺寸 calc(var(--paper-h) * var(--ar))、负 margin、nth-child 全照旧。 */
    if (o.parent && o.parent.isConnected) {
      var hole = document.createElement('span');
      hole.className = sheet.className + ' is-cv-hole';
      var ar = sheet.style.getPropertyValue('--ar');
      if (ar) hole.style.setProperty('--ar', ar);
      hole.setAttribute('aria-hidden', 'true');
      o.parent.insertBefore(hole, sheet);
      o.hole = hole;
    }

    /* 插到 .cv-face 的最前面：纸边、颗粒、扫光都是绝对定位的兄弟，画在纸上面 */
    S.el.face.insertBefore(sheet, S.el.face.firstChild);
    sheet.classList.add('is-cv-extracted');

    /* 悬停扇开的角度到浮层里没有意义（.is-pointed 不再作用于它），
       但也不能在搬进来那一帧就抹掉 —— 用 WAAPI 从原姿态摆到正，视觉才连续。
       点开时指针正压在纸上，is-pointed 的 -3.2° 因此会作为入场起点。
       ⚠️ 这段摆正必须转**整张卡**（.cv-slab），不能只转纸：纸相对卡片转动时，
       .cv-face 的 overflow 会把纸的四角裁掉，卡片本体的米色在左右两侧露一条边 ——
       用户看到的「证书与卡片本体脱离 + 内容逆时针转」就是纸自己在套子里转。
       转在 .cv-slab 上，塑封边、颗粒、扫光、纸整块一起转，任何一帧都没有相对位移。 */
    if (!S.reduced && S.el.slab && S.el.slab.animate && o.matrix && o.matrix !== 'none') {
      if (S.poseAnim) { try { S.poseAnim.cancel(); } catch (eP) { } S.poseAnim = null; }
      try {
        S.poseAnim = S.el.slab.animate([{ transform: o.matrix }, { transform: 'none' }],
          { duration: FLIP_MS, easing: FLIP_EASE, fill: 'both' });
      } catch (eA) { S.poseAnim = null; }
    }

    S.el.img = sheet.querySelector('img');
    if (S.el.img) {
      S.el.img.draggable = false;                 /* 浮层里不许把纸拖成浏览器的一张图 */
      S.el.img.addEventListener('load', onSheetImgLoad);
    }
  }

  /* 大图解码之后按真实比例再校一次框（data 里的 ar 有时是 0）。
     监听挂在**纸自己的那张 img** 上，跟着抽取/插入一起增删。 */
  function onSheetImgLoad() {
    if (!S.open) return;
    if (!S.items[S.index].ar) fitBox(S.items[S.index], true);
  }

  /* 插入：把纸放回原处。三种去处 ——
     ① 空壳还在（正常关闭）：replaceChild 回同一格，位置/尺寸/类名全对；
     ② 空壳没了但父节点还在（极端情况）：按当初记下的 next 插回去；
     ③ 父节点也没了（PJAX 已经把 <main> 换掉）：那张纸属于一个已经消失的文档，
        谁都不该接手它 —— 从浮层里摘掉，交给 GC。 */
  function insertBack() {
    var o = S.origin, sheet = o && o.el;
    if (S.poseAnim) { try { S.poseAnim.cancel(); } catch (eC) { } S.poseAnim = null; }
    if (!sheet) return;
    /* 已经还回去了：closeNow 可能被调两次（Esc 之后紧跟一次 PJAX 换页） */
    if (!S.el.face || sheet.parentNode !== S.el.face) return;
    sheet.classList.remove('is-cv-extracted');
    var img = sheet.querySelector('img');
    if (img) {
      img.removeEventListener('load', onSheetImgLoad);
      /* 缩略图要换回去：大图塞在 148px 的盒子里看着一样，解码与显存都贵得多 */
      if (o.imgSrc) img.setAttribute('src', o.imgSrc);
      if (o.imgDraggable === null) img.removeAttribute('draggable');
      else img.setAttribute('draggable', o.imgDraggable);
    }
    if (sheet.parentNode) sheet.parentNode.removeChild(sheet);
    if (o.hole && o.hole.parentNode) o.hole.parentNode.replaceChild(sheet, o.hole);
    else if (o.parent && o.parent.isConnected) o.parent.insertBefore(sheet, o.next);
    o.hole = null;
    if (S.el.img) S.el.img = null;
  }

  /* ---------- 5. 开场的 FLIP：从纸上**沿一条下弯的弧**长到居中 ---------- */
  /* 起点/落点相对**布局框**（不含 transform）的位移与缩放。返回数值而不是字符串：
     弧线与过冲都要在中间插值，只有字符串的话得再解析回来。 */
  function layoutOffset(rect) {
    var b = S.flipBox;
    if (!b || !b.w || !b.h) return null;
    return {
      dx: (rect.left + rect.width / 2) - b.cx,
      dy: (rect.top + rect.height / 2) - b.cy,
      sx: rect.width / b.w,
      sy: rect.height / b.h
    };
  }

  function flipTransform(a) {
    return 'translate(' + a.dx.toFixed(2) + 'px,' + a.dy.toFixed(2) + 'px) scale(' +
      a.sx.toFixed(4) + ',' + a.sy.toFixed(4) + ')';
  }

  /* ---- 入场时间线的两个标量（完整推导见 §6c）----
     rise(p)：沿「缩略图 → 居中满幅」走了多远（0→1；顶端之后恒为 1、不回退）；
     win(p) ：**顶端那道窗**（0 起、顶端 1、落点 0，两端斜率为 0）——"越过落点多少"
              与"过冲那点缩放"都由它给。它和缩略图的屏幕位置无关：纸正好从视野中心
              起飞时（dy≈0），"拉起来 → 挂住 → 落下一点点"照样看得见。 */
  function riseAt(p) {
    if (p <= LIFT_TOP_P) return 1 - Math.pow(1 - clamp(p / LIFT_TOP_P, 0, 1), LIFT_TOP_POW);
    return 1;
  }

  function topWindow(p) {
    if (p <= LIFT_TOP_P) return Math.sin(Math.PI * 0.5 * clamp(p / LIFT_TOP_P, 0, 1));
    var q = clamp((p - LIFT_TOP_P) / (1 - LIFT_TOP_P), 0, 1);
    return Math.pow(Math.cos(Math.PI * 0.5 * q), LIFT_SINK_POW);
  }

  /* 「缓缓下落一点点」的距离（px）：按卡片高度取，小屏上也不会夸张 */
  function settlePx() { return clamp((S.box.h || 600) * LIFT_SETTLE_H, 10, 20); }

  /* 入场某一帧的姿态：FLIP 的关键帧与逐帧的倾角**都从这里取**，两条通道因此不会错拍。
     sx/sy 一起插值：非等比会把纸拉变形（缩略图与布局框的比例本来就差一点点）。 */
  function entryPath(p, a) {
    var dist = Math.sqrt(a.dx * a.dx + a.dy * a.dy);
    var rise = riseAt(p);
    var win = topWindow(p);
    var sag = clamp(dist * FLIP_ARC_SAG, FLIP_ARC_MIN, FLIP_ARC_MAX);
    var dip = sag * Math.sin(Math.PI * Math.pow(clamp(p / LIFT_TOP_P, 0, 1), FLIP_ARC_BIAS));
    var bloom = 1 + LIFT_SCALE_OVER * win;         /* 顶端胀 1.4%，落回 1 */
    return {
      L: rise, p: p,
      dx: a.dx * (1 - rise),
      dy: a.dy * (1 - rise) + dip - settlePx() * win,
      sx: (a.sx + (1 - a.sx) * rise) * bloom,
      sy: (a.sy + (1 - a.sy) * rise) * bloom
    };
  }

  function flipFrames(a) {
    var frames = [];
    for (var i = 0; i <= FLIP_PATH_SAMPLES; i++) {
      var t = i / FLIP_PATH_SAMPLES;
      var f = entryPath(t, a);
      frames.push({
        offset: t,
        transform: flipTransform(f),
        opacity: +(0.55 + 0.45 * Math.min(1, f.L)).toFixed(4)
      });
    }
    return frames;
  }

  function playFlipIn() {
    if (S.reduced) { S.el.flip.style.transform = 'none'; return; }
    /* 用 open() 里算好的起点（那时 .cv-flip 还没被写姿态，量到的是 layout 框） */
    var from = S.flipFrom || layoutOffset(S.origin.rect);
    if (!from) { S.el.flip.style.transform = 'none'; return; }
    if (S.flipAnim) { try { S.flipAnim.cancel(); } catch (e) { } }
    /* 不清成 'none'：open() 已经同步写上了起点姿态（见那里的注释），
       这一帧必须是小的；动画从同一姿态起步，肉眼看不到接缝。
       easing 必须是 linear：速度曲线已经在 flipFrames() 的采样里了 ——
       再叠一条 ease 会把顶端那一段压扁、把"挂住"抹掉。 */
    try {
      S.flipAnim = S.el.flip.animate(flipFrames(from),
        { duration: FLIP_MS, easing: 'linear', fill: 'both' });
      /* 没有 onfinish 钩子：入场倾角不吃"停稳那一记"，它由 grabProgress() 读这条动画的
         时钟逐帧算（停稳 = currentTime 走满 FLIP_MS = 倾角回到 0）。 */
    } catch (eNoWaapi) {
      /* 没有 WAAPI：纸是一次硬切，倾角改由 grabProgress() 退回 rAF 时间推进 */
      S.flipAnim = null;
    }
  }

  /* ---- 退场：把纸**放**回纸堆（2026-10-28 第十二轮重写）----
     入场是"从桌面拉起来"，退场就是"再放回桌面上去"，但不是倒放：
       · 更短（520ms）：放下比拿起来果断；
       · 弧更浅（入场的一半）：回去的路不该再翻一道大弧；
       · 倾角只朝**反方向**摆一下（+LIFT_OUT_TIP_DEG：入场躺平是负角，所以这一下取正），然后回正到 0 ——
         落点必须是 0°，插入那一帧才会和页面里那张纸重合，看不出接缝；
       · **不淡出**：落点现在是按布局框严格算出来的（layoutOffset），纸是"落回去"而不是
         "淡回去"。老版本淡到 0.35，其实是在遮一个落点误差（量到的是自己被 transform
         改写过的框）。 */
  function exitPath(q, from, to) {
    var e = interp01(q);
    var dx = from.dx + (to.dx - from.dx) * e;
    var dy = from.dy + (to.dy - from.dy) * e;
    var sx = from.sx + (to.sx - from.sx) * e;
    var sy = from.sy + (to.sy - from.sy) * e;
    var adx = to.dx - from.dx, ady = to.dy - from.dy;
    var dist = Math.sqrt(adx * adx + ady * ady);
    /* 下坠的弧：入射同款、幅度减半，两端为 0 */
    dy += clamp(dist * FLIP_ARC_SAG, FLIP_ARC_MIN, FLIP_ARC_MAX) * 0.5 * Math.sin(Math.PI * e);
    return { dx: dx, dy: dy, sx: sx, sy: sy };
  }

  /* 倾角层：从**当下的角度**摆到 0，中间朝反方向顶一下。
     起点取交接时的现值 —— 入场播到一半就 Esc，也不会从 0° 起跳。 */
  function playGrabOut(ax0, ay0) {
    var el = S.el.grab;
    S.grab.on = false; S.grab.ax = 0; S.grab.ay = 0;
    if (!el) return;
    if (S.reduced || typeof el.animate !== 'function') { el.style.transform = 'none'; return; }
    var frames = [];
    for (var i = 0; i <= 12; i++) {
      var q = i / 12, u = interp01(q), s = Math.sin(Math.PI * q);
      var tip = s * s;
      frames.push({
        offset: q,
        transform: 'rotateX(' + (ax0 * (1 - u) + LIFT_OUT_TIP_DEG * tip).toFixed(2) +
          'deg) rotateY(' + (ay0 * (1 - u)).toFixed(2) + 'deg)'
      });
    }
    el.style.transform = 'none';        /* 交回给动画（fill:'both' 会盖住内联样式） */
    try {
      S.grabAnim = el.animate(frames, { duration: CLOSE_MS, easing: 'linear', fill: 'both' });
    } catch (eG) { S.grabAnim = null; }
  }

  /* 影子跟着纸一起退场：淡掉。位置不追 —— 退场只有 520ms，追反而会被看见 */
  function playShadowOut() {
    var el = S.el.shadow;
    if (!el || typeof el.animate !== 'function') return;
    var live = 0;
    try { live = parseFloat(getComputedStyle(el).opacity) || 0; } catch (e) { }
    if (S.shadowAnim) { try { S.shadowAnim.cancel(); } catch (e2) { } }
    try {
      S.shadowAnim = el.animate([{ opacity: live }, { opacity: 0 }],
        { duration: CLOSE_MS, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' });
    } catch (e3) { S.shadowAnim = null; }
  }

  function playFlipOut(done) {
    var finished = false;
    function finish() { if (finished) return; finished = true; done(); }
    /* 起点：入场还在跑就从**当前那一帧**接上（同一个 L、同一个角度，不跳）；
       停稳了就从中性姿态出发。p0 必须在 cancel 之前读 —— grabProgress 读的就是
       S.flipAnim.currentTime。 */
    var p0 = (S.flipAnim && S.flipFrom) ? grabProgress() : 1;
    var from = (p0 < 1 && S.flipFrom) ? entryPath(p0, S.flipFrom) : { dx: 0, dy: 0, sx: 1, sy: 1 };
    playGrabOut(S.grab.on ? S.grab.ax : 0, S.grab.on ? S.grab.ay : 0);
    playShadowOut();
    if (S.flipAnim) { try { S.flipAnim.cancel(); } catch (e0) { } S.flipAnim = null; }

    /* 卡片自己的斜角也要一起摆回页面里的手角度（转整张卡，理由同 extractSheet）。
       空壳（.is-cv-hole）带着同一串类名，它的 computed transform 就是这张纸回到页面
       之后会拿到的姿态 —— 从它读，插入那一刻就不会「跳正」一下。 */
    var back = S.origin && S.origin.hole ? liveTransform(S.origin.hole) : 'none';
    var slab = S.el.slab;
    if (!S.reduced && slab && slab.animate && back !== 'none') {
      if (S.poseAnim) { try { S.poseAnim.cancel(); } catch (eB) { } }
      try {
        S.poseAnim = slab.animate([{ transform: 'none' }, { transform: back }],
          { duration: CLOSE_MS, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' });
      } catch (eB2) { S.poseAnim = null; }
    }

    if (S.reduced) { S.el.flip.style.transform = 'none'; finish(); return; }
    var to = layoutOffset(originRectNow());
    if (!to) { S.el.flip.style.transform = 'none'; finish(); return; }
    var frames = [];
    for (var i = 0; i <= 24; i++) {
      var q = i / 24;
      frames.push({ offset: q, transform: flipTransform(exitPath(q, from, to)) });
    }
    try {
      S.flipAnim = S.el.flip.animate(frames, { duration: CLOSE_MS, easing: 'linear', fill: 'both' });
      S.flipAnim.onfinish = finish;
      setTimeout(finish, CLOSE_MS + 120);
    } catch (e3) { finish(); }
  }

  /* 落点 = 页面里那个「洞」的**当前**矩形：纸现在在浮层里，量它自己量到的是放大后的框。
     量洞还有个好处：视口变过（resize 后 fitBox 重算）也照样落在正确的位置上。 */
  function originRectNow() {
    var el = S.origin && S.origin.hole;
    if (el && el.isConnected) {
      try {
        var r = el.getBoundingClientRect();
        if (r.width && r.height) return { left: r.left, top: r.top, width: r.width, height: r.height };
      } catch (e) { }
    }
    return S.origin ? S.origin.rect : { left: innerWidth / 2, top: innerHeight / 2, width: 120, height: 160 };
  }

  /* ---------- 6. 物理：PD 控制器（比例 = 回正，微分 = 阻尼） ----------
     用户的原话是「像 PID 一样逐渐静止」。这里没有积分项（I）：
     目标是 0°，积分项只在有恒定外扰时才有意义，加进来反而会拖出一个
     收不住的长尾。PD 就是教科书里的阻尼弹簧，视觉上就是"摆两下停住"。
     2026-10-26：换张用的 kickSeesaw 已删（一张纸就是一张证书，没有"换张"了），
     这条弹簧现在只负责拖动松手后的回正。 */

  /* ---- 入场旋转的总开关（2026-10-27 第二轮：**默认关闭**）----
     用户对「0° 起转满一圈」的反馈：「效果有点奇怪，一是转多了，一是证书的背面有些丑了，
     如果能给背面弄好看的话就好说，但是没必要，改成不旋转吧」。
     于是纸「长到眼前」的整个过程**始终正着**：没有翻面，也就没有那个镜像的背面。
     旋转通道整条留着（SPIN_* 常量 / stepSpin / handOverSpin / render 的叠加），
     只由这个开关门控：改成 true 就回到「0° 起、0.83s 转满一圈、落地剩 190°/s」那组参数。 */
  var SPIN_ON = false;

  /* 入场：横向（只绕 Y 轴）。竖向的 rx 全程保持 0 —— 用户明确不要。
     SPIN_ON = false 时这里直接不动（纸一开始就是正着的）。 */
  function kickSpin() {
    if (!SPIN_ON || S.reduced) {
      S.spin.on = false; S.spin.caught = false; S.spin.a = 0; S.spin.v = 0;
      if (S.el.tilt) S.el.tilt.style.transform = 'none';
      return;
    }
    S.spin.on = true;
    S.spin.a = SPIN_START;
    S.spin.v = SPIN_V0;
    S.spin.caught = false;
    S.spin.target = SPIN_TARGET;
    /* 首帧就把姿态钉在背面（否则 DOM 会先按 0° 画一帧正面再跳到 180°） */
    if (S.el.tilt) S.el.tilt.style.transform = 'rotateX(0deg) rotateY(' + SPIN_START + 'deg)';
  }

  /* ---------- 6c. 入场/退场的 3D 旋转：风阻（2026-10-28 第十二轮）----------
     D(p) = 纸面从「躺在桌面」转到「正对观众」的进度：0 = 躺平、1 = 正对、>1 = 转过头。
       前半段 smoothstep：起手**不转**（纸被空气按在桌面上），中段才猛地翻起来，
       到顶端（LIFT_TOP_P）正好到 1；
       后半段 sin²(πq)(1-q)²：冲过 0 到 +LIFT_SWING_DEG（主方向是负角，所以反向侧是正），再回到一个很小的反向角，
       最后严格落在 0 —— 两端斜率都是 0，接缝处没有折角。
     振幅不硬编码：SWING_A 由「峰值必须等于 LIFT_SWING_DEG」反解出来（400 点采样求 f 的峰），
     改 LIFT_SWING_DEG 就是改"冲过头多少度"，不用重算别的东西。 */
  var SWING_A = (function () {
    var m = 0;
    for (var i = 1; i < 400; i++) {
      var q = i / 400, s = Math.sin(Math.PI * q), v = s * s * (1 - q) * (1 - q);
      if (v > m) m = v;
    }
    return LIFT_SWING_DEG / (LIFT_FLAT_DEG * m);
  })();

  /* smoothstep，并且**夹在 [0,1]** —— 入场后半段会传进 >1 的参数，不夹会算出负值 */
  function interp01(u) { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); }

  function flatRelease(p) {
    /* 起手那 LIFT_FLAT_IN_P 段纸还没"躺好"，翻转**从躺好那一刻才开始** ——
       两段因此不重叠：倾角先到满（68°），随后才被风掀起来。这一段平台也是
       用户能看清"纸是躺在桌面上的"的唯一时间窗（约 140ms）。 */
    if (p <= LIFT_TOP_P) return interp01((p - LIFT_FLAT_IN_P) / (LIFT_TOP_P - LIFT_FLAT_IN_P));
    var q = clamp((p - LIFT_TOP_P) / (1 - LIFT_TOP_P), 0, 1);
    var s = Math.sin(Math.PI * q);
    return 1 + SWING_A * s * s * (1 - q) * (1 - q);
  }

  /* 某一帧的两个倾角：rx = 躺平角（上沿朝观众），ry = **对角侧倾**（左上按下去、右下提起来）
     + 横向速度那一道（卡片朝运动方向侧过去，横向一停就回正）。
     三者共用 env 之外还各压了一道窗，免得 p=0 那一帧突然侧过去。 */
  function entryTilt(p) {
    /* 负号 = 整个倾角通道唯一的方向开关：上沿朝观众兜过来（用户箭头指的那一向） */
    var env = interp01(p / LIFT_FLAT_IN_P) * (1 - flatRelease(p));
    var rx = -LIFT_FLAT_DEG * env;
    /* 对角侧倾与躺平角共用同一根包络：负 ry + 负 rx ⇒ 左上角按下去、右下角提起来 */
    var ry = -LIFT_ROLL_DEG * env;
    if (S.flipFrom) {
      var h = 0.006, lo = Math.max(0, p - h), hi = Math.min(1, p + h);
      var vx = (entryPath(hi, S.flipFrom).dx - entryPath(lo, S.flipFrom).dx) / (hi - lo) / FLIP_MS * 1000;
      /* += ：速度那一道是**叠加**在对角侧倾上的，覆盖掉会把侧倾抹平 */
      ry += LIFT_YAW_DEG * clamp(vx / LIFT_YAW_REF, -1, 1) * interp01(p / 0.18);
    }
    return { rx: rx, ry: ry };
  }

  /* 入场进度：**优先读 FLIP 自己的时钟** —— 倾角与"纸长到多大"永远同一根轴，
     掉帧时也不会错拍（草图里那条虚线就是 FLIP 到顶端的时刻）。
     没有 WAAPI（S.flipAnim 为空）时退回 rAF 累加的时间，只差在一帧之间。 */
  function grabProgress() {
    /* a.currentTime 为 null（动画还没起播 / 已 cancel）时**必须**退回时间累积：
       Number(null) 是 0，直接比 isFinite 会让进度永远停在 0。 */
    var a = S.flipAnim, t = (a && a.currentTime != null) ? Number(a.currentTime) : NaN;
    if (isFinite(t)) return clamp(t / FLIP_MS, 0, 1);
    return clamp(S.grab.el * 1000 / FLIP_MS, 0, 1);
  }

  /* 入场起点：清状态。第一帧倾角是 0（纸在页面里就是正着的，不跳），
     躺平发生在最初的 LIFT_FLAT_IN_P 里 —— 点下去那一下的"按压"。 */
  function startGrab() {
    var g = S.grab;
    g.on = !S.reduced;
    g.el = 0; g.p = 0;
    g.ax = 0; g.ay = 0; g.h = 0;
    if (S.grabAnim) { try { S.grabAnim.cancel(); } catch (e) { } S.grabAnim = null; }
    if (S.el.grab) S.el.grab.style.transform = 'none';
  }

  /* 推进器（跑在 stepPhysics 里，和按压一样不受拖拽影响）：每帧按进度**直接算**角度，
     没有积分器、没有残留状态 —— 所以它天然不会"摆过头"，也不会在停稳后继续晃。
     走完（p ≥ 1）就把 on 关掉、姿态归零：这一层不留在"几乎 0 但不是 0"的角上
     （残角会让纸的边缘一直有亚像素模糊）。h 停在 1（纸已经停在眼前，影子该摊开了）。 */
  function stepGrab(dt) {
    var g = S.grab;
    if (!g.on) return;
    g.el += dt;
    var p = grabProgress();
    g.p = p;
    if (p >= 1) { g.on = false; g.ax = 0; g.ay = 0; g.h = 1; return; }
    var t = entryTilt(p);
    g.ax = t.rx; g.ay = t.ry;
    g.h = clamp(entryPath(p, S.flipFrom || { dx: 0, dy: 0, sx: 1, sy: 1 }).L, 0, 1);
  }

  /* 两段式积分（数值与 .tools/spin-check.py 一致，改参数请先跑那个脚本）：
       A 段 a<target：只有空气阻尼 a'' = -drag·a'（从 SPIN_START 起步）—— 整圈入场专用；
       B 段 a≥target：被弹簧接住 a'' = -kp(a-target) - kd·a'，摆一下就收敛到 target。
     target 是 sp.target：整圈入场 = 360°，入场后的「惯性」小摆 = 0°（它一进来就把 caught
     置成 true ⇒ 只走 B 段这一支），所以两种入场共用**同一根弹簧**，手感必然一致。
     停稳判据用的是"角度离 360 不到 0.25° 且角速度 < 14°/s"：14°/s 在一帧里只走
     0.2°，肉眼已经是静止；此时把角度归零（360° 与 0° 是同一个朝向，跳变不可见）。 */
  function stepSpin(dt) {
    var sp = S.spin;
    if (!sp.caught) {
      sp.v += (-SPIN_DRAG * sp.v) * dt;
      sp.a += sp.v * dt;
      /* 越过 target = 纸刚转到位、正对观众，交给弹簧接住。
         按压**不在这里**：它只跟手指走。 */
      if (sp.a >= sp.target) { sp.caught = true; }
      return;
    }
    sp.v += (-SPIN_KP * (sp.a - sp.target) - SPIN_KD * sp.v) * dt;
    sp.a += sp.v * dt;
    if (Math.abs(sp.a - sp.target) < 0.25 && Math.abs(sp.v) < 14) {
      sp.on = false; sp.caught = false; sp.a = 0; sp.v = 0;
    }
  }

  /* 摆动的硬兜底：正常甩动不许越过 SWING_*（别让纸歪到背面去）。
     但从入场翻转手里接过来的角度**本来就在界外**（最大 180°），那一路只允许往回收、
     不许继续外扩 —— 否则一松手就被裁回 96°，肉眼就是"跳一下"。 */
  function swingClamp(prev, next, limit) {
    if (Math.abs(next) <= limit) return next;
    if (Math.abs(next) < Math.abs(prev)) return next;   /* 正在收回：放行 */
    return prev;                                        /* 想继续外扩：挡住 */
  }

  /* 把还在转的入场**原样**交给拖动弹簧（2026-10-27 用户要求：随时可打断）。
     以前只有「差 4° 以内」才交接，注释理由是"中途交接会跳"；跳的原因是直接拿
     spin.a 当 phys.ry（180~360）去套 ±86 的橡皮筋。现在按**等效显示角**交接：
       · 显示角 = phys.ry + spin.a，spin.a 在 (0, 360] 时按下面的公式等效到 (-180, 180]；
       · 把等效角写进 phys.ry、把角速度写进 phys.vy，spin 清零；
       · 同一帧里 render() 算出的 rotateY 与交接前完全一致 ⇒ 不跳。
     随后这次拖动的橡皮筋区间会被 onDown 临时放宽到能容纳这个角度（见 S.drag.softY）。 */
  function handOverSpin() {
    var a = S.spin.a;
    var eq = ((a + 180) % 360 + 360) % 360 - 180;   /* (180, 360) → (-180, 0] */
    S.phys.ry = eq;
    S.phys.vy = S.spin.v;
    S.spin.on = false;
    S.spin.caught = false;
    S.spin.a = 0;
    S.spin.v = 0;
    /* 竖向（rx）在入场期间一直是 0，不需要交接 */
    S.phys.rx = 0;
    S.phys.vx = 0;
    /* 按压也不在这里补：这一次按下的 pointerdown 已经在 onDown 里给过冲量了 */
  }

  /* 入场那层倾角也要能**随时交接**（2026-10-27 的规矩：谁动手就把运动放下）。
     同一帧等价交接：把当前角度写进拖动弹簧的状态、清掉这一层，两层的和不变 ⇒ 画面不跳；
     随后弹簧把它收回正对观众 —— 读起来就是"你抓住了一张正被风掀起来的纸"。
     顺序：handOverSpin 里会把 phys.rx 清零（整圈入场时竖向恒为 0），所以必须先 spin、后 lift。 */
  function handOverLift() {
    var g = S.grab;
    if (!g.on) return;
    S.phys.rx = g.ax;
    S.phys.ry = g.ay;
    S.phys.vx = 0;
    S.phys.vy = 0;
    g.on = false;
    g.ax = 0; g.ay = 0;
    /* 不在这里写 .cv-grab 的 transform：下一次 render() 会把两层一起写出去，
       中间插一帧 'none' 反而会让纸立起来跳一下。 */
  }

  /* ---------- 6b. 点击反馈：按下 → 浮起 ----------
     用户 2026-10-27：「点击荣誉证书有点击反馈（按压效果，压下然后弹起，需要有承重感，
     像航母在海上受到巨大按压后然后浮起来）」。整段只用三个数：起手下沉、ω、ζ，
     剩下的交给弹簧。
     ⚠️ 第四轮（同日）：「卡片不应该是下沉，而是中心缩小，我之前类比的海上游轮得是'俯视'的」
     —— 于是**视觉通道只有中心缩放**（PRESS_SCALE = 5%），一层位移都不留：从高处俯视，
     船被按进水里看起来是变小、而不是往下走；反过来浮起来那一刻会略大于原位（过冲）。
     ⚠️ 它必须**独立于**拖动与入场：所以 stepPress 跑在 stepPhysics 里那条
     "拖拽中直接 return" **之前** —— 用户抓住纸转的时候，这张纸的回弹不该被冻住。 */
  function startPress() {
    var p = S.press;
    if (S.reduced) return;
    /* 不把 y 归零：上一记可能还没收回，接在当前位置继续压，手指底下才不会跳一下 */
    p.v = PRESS_V0;          /* 向下的冲量：纸被压下去，弹簧再把它托回来 */
    p.on = true;
  }

  function stepPress(dt) {
    var p = S.press;
    if (!p.on) return;
    p.v += (-PRESS_K * p.y - PRESS_D * p.v) * dt;
    p.y += p.v * dt;
    /* 重复点击的封顶：越压越深会变成"一记比一记狠"的下砸，按住深度不放 */
    if (p.y > PRESS_MAX) { p.y = PRESS_MAX; if (p.v > 0) p.v = 0; }
    /* 停稳判据比视觉阈值更严（0.05px / 0.6px·s⁻¹）：停帧时不留半像素残差 */
    if (Math.abs(p.y) < 0.05 && Math.abs(p.v) < 0.6) { p.y = 0; p.v = 0; p.on = false; }
  }

  /* 扫光：点开时那道横过纸面的光，**一次打开只播一次**（用户要求「不允许反复触发」）。
     overlay 叠加：白纸已经到顶，白上加白没有信息量，所以肉眼真正看到的是带子两侧
     那两道淡淡的影子 —— 现实里光扫过纸面就是这样（高光不可见，边缘变化才可见）。
     WAAPI 只动 transform / opacity，整条带子跑在合成器上，没有逐帧重绘。 */
  /* 扫光的动画上只跑 transform，**没有 opacity 关键帧**：带子两端本来就是全透明
     （渐变在 34% 之前、66% 之后是 0 alpha），而且起点终点都在纸面之外（±108%），
     所以它进出纸面时天然没有硬边，不需要淡入淡出。反过来说，一旦把 opacity 的中间
     关键帧塞进同一个动画，WAAPI 会把 transform 那条曲线按关键帧切成三段、每段各自
     重套一遍 easing ⇒ 曲线的"先快后慢"就没了，淡出还会提前。 */
  function cancelSweep() {
    var sw = S.sweep;
    if (!sw.anim) return;
    var list = sw.anim;
    sw.anim = null;
    for (var i = 0; i < list.length; i++) { try { list[i].cancel(); } catch (eCancel) { } }
  }

  function startSweep() {
    var sw = S.sweep;
    if (S.reduced || sw.locked || !S.el.sweepBand) return;
    sw.locked = true;                       /* 这一次打开从此不许再触发 */
    cancelSweep();
    var band = S.el.sweepBand;
    if (typeof band.animate !== 'function') return;   /* 没有 WAAPI：这张纸就安静地出现 */
    try {
      var anim = band.animate([
        { transform: 'translate3d(-108%, 0, 0) skewX(-14deg)' },
        { transform: 'translate3d(108%, 0, 0) skewX(-14deg)' }
      ], { duration: SWEEP_MS, delay: SWEEP_DELAY, easing: SWEEP_EASE, fill: 'none' });
      sw.anim = [anim];
    } catch (eSweep) { sw.anim = null; }
  }

  function stepPhysics(dt) {
    stepPress(dt);             /* 点击回弹与拖拽/入场无关，永远先走 */
    stepGrab(dt);              /* 同理：入场倾角那条曲线也不归手管（要能自己走完） */
    if (S.drag.on) return;     /* 拖拽中不让弹簧抢方向盘 */
    if (S.spin.on) {
      /* 入场旋转期间不做任何竖向摆动：把悬停微倾的目标清零，让 hov 自己衰减回 0 */
      stepSpin(dt);
      S.hov.tx = 0; S.hov.ty = 0;
    } else {
      var ax = -KP * S.phys.rx - KD * S.phys.vx;
      var ay = -KP * S.phys.ry - KD * S.phys.vy;
      S.phys.vx += ax * dt;
      S.phys.vy += ay * dt;
      S.phys.rx = swingClamp(S.phys.rx, S.phys.rx + S.phys.vx * dt, SWING_RX);
      S.phys.ry = swingClamp(S.phys.ry, S.phys.ry + S.phys.vy * dt, SWING_RY);
    }

    /* 悬停微倾（另一条更硬的弹簧，几乎不过冲）：指针在哪边，哪边就靠近一点 */
    S.hov.vx += (-HKP * (S.hov.x - S.hov.tx) - HKD * S.hov.vx) * dt;
    S.hov.vy += (-HKP * (S.hov.y - S.hov.ty) - HKD * S.hov.vy) * dt;
    S.hov.x = clamp(S.hov.x + S.hov.vx * dt, -1, 1);
    S.hov.y = clamp(S.hov.y + S.hov.vy * dt, -1, 1);
  }

  /* ---------- 7. 渲染 ---------- */
  function render() {
    if (S.reduced) {
      /* 减少动态：不转、不摆，只保留缩放/平移 */
      S.el.tilt.style.transform = 'none';
      S.el.persp.style.transform = 'none';
    } else {
      var rx = S.phys.rx;
      var ry = S.phys.ry + (S.spin.on ? S.spin.a : 0);   /* 入场那圈直接叠加在纵向角度上 */
      S.el.tilt.style.transform = 'rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
      /* 悬停微倾 4° → 3°：纸一大，4° 的边缘位移就有 40px，扫起来"晃"；
         3° 仍然读得出是立体的，但安静得多。 */
      S.el.persp.style.transform = 'rotateX(' + (S.hov.y * -3).toFixed(2) + 'deg) rotateY(' + (S.hov.x * 3).toFixed(2) + 'deg)';
    }

    /* 「捏住右下角」那一拍：独立一层、独立 origin（**左上角** —— 被捏的角才有得抬），只写绕两轴的转动。
       收完之后（on = false）显式写 'none'，不留亚像素残角。 */
    if (S.el.grab) {
      var gb = S.grab;
      S.el.grab.style.transform = (!S.reduced && gb.on && (gb.ax || gb.ay))
        ? 'rotateX(' + gb.ax.toFixed(2) + 'deg) rotateY(' + gb.ay.toFixed(2) + 'deg)'
        : 'none';
    }

    /* 缩放（滚轮 / 双指 / 双击）：单独一层 .cv-zoom，别和 FLIP、透视、旋转抢同一个 transform */
    var z = S.zoom;
    S.el.zoom.style.transform = (z.s === 1 && !z.x && !z.y) ? 'none'
      : 'translate3d(' + z.x.toFixed(2) + 'px,' + z.y.toFixed(2) + 'px,0) scale(' + z.s.toFixed(4) + ')';
    S.el.root.classList.toggle('is-zoomed', z.s > 1.01);

    /* 点击回弹（俯视）：按下去 = **以中心为准缩小**，压到底 5%；浮过头时 scale > 1（胀一下）。
       这一层现在只有缩放、没有任何位移。只写 transform，不碰布局。 */
    if (!S.reduced && S.el.press) {
      var py = S.press.y;
      S.el.press.style.transform = py === 0 ? 'none'
        : 'scale(' + (1 - (py / PRESS_PEAK) * PRESS_SCALE).toFixed(5) + ')';
    }

    updateShadow();
  }

  /* 影子：**桌面上那块影**（2026-10-28 重写）。
     入场现在是一张纸从桌面上被拉起来，影子必须跟着纸的**屏幕位置**走（入场时纸并不在
     视野中心），并按「离桌高度」摊开/变淡：纸还躺在桌面上时它又小又浓、几乎全被纸盖住；
     拉到眼前时摊开、往下落一点、变淡。高度直接取入场的 L（超了 1 的部分夹掉）——
     和纸的位移是同一个数，不会脱节。
     CSS 里 left/top 是 50%，也就是"左上角落在视野中心"，所以要在这里补 -w/2、-h/2 的
     居中修正（以前没有，影子其实偏了一格）。 */
  function updateShadow() {
    var el = S.el.shadow;
    if (!el) return;
    var running = S.open && (S.flipAnim || S.grab.on);
    var p = running ? grabProgress() : 1;
    var st = (running && S.flipFrom) ? entryPath(p, S.flipFrom) : null;
    var lift = st ? clamp(st.L, 0, 1) : 1;
    var base = S.flipBox || { cx: innerWidth / 2, cy: innerHeight / 2 };
    var w = S.shadowW || 0, h = S.shadowH || 0;
    var cx = base.cx + (st ? st.dx : 0);
    var cy = base.cy + (st ? st.dy : 0);
    var sink = S.reduced ? 0 : S.press.y / PRESS_PEAK;
    /* 纸还小的时候影子也小：按入场当前的缩放收一下，否则影子会比纸还宽 */
    var sc = (st ? st.sy : 1) * (0.96 + 0.22 * lift) * (1 - sink * PRESS_SCALE);
    var tx = cx - innerWidth / 2 - w / 2;
    var ty = cy - innerHeight / 2 - h / 2 + 10 + lift * 14;
    el.style.transform = 'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(' +
      sc.toFixed(3) + ')';
    /* 放大后影子跟着卡片一起放大就不对了（它在 .cv-zoom 外面），索性收掉 */
    el.style.opacity = S.zoom.s > 1.01 ? '0' : (0.30 + 0.10 * lift - sink * 0.04).toFixed(3);
  }

  /* ---------- 8. 主循环 ---------- */
  function start() {
    if (S.raf) return;
    S.last = 0;
    S.raf = requestAnimationFrame(loop);
    S.el.root.classList.add('is-running');
  }

  function stop() {
    if (S.raf) cancelAnimationFrame(S.raf);
    S.raf = 0;
    if (S.el.root) S.el.root.classList.remove('is-running');
  }

  function loop(now) {
    S.raf = requestAnimationFrame(loop);
    if (!S.last) S.last = now;
    var dt = Math.min((now - S.last) / 1000, 1 / 30);
    S.last = now;
    S.dt = dt;
    if (!S.reduced) stepPhysics(dt);
    /* 减少动态时也要 render：缩放（滚轮/双指/双击）与影子都靠它落 transform */
    render();
  }

  /* ---------- 9. 指针：转动（拖动）/ 缩放（滚轮 · 双指 · 双击） ----------
     用户 2026-10-26 三条要求：
       ① 鼠标拖动允许更大范围，但不是硬上限，而是"越拉越费劲、最终拉不动"的弹簧；
       ② 删掉鼠标悬浮的整套光效（高光/背光/泛光都去掉，只留纸本身的边缘与颗粒）；
       ③ 增加滚轮放大、触屏双指捏合放大、触屏双击放大。 */

  /* 橡皮筋映射：线性区 1:1 跟手；越过 soft 之后按指数压缩、渐近 hard。
     导数在靠近 hard 时趋于 0 ⇒ "越拉越费劲、最终拉不动"，但没有一道撞墙的截断。 */
  function rubber(raw, soft, hard) {
    var a = Math.abs(raw);
    if (a <= soft) return raw;
    var span = hard - soft;
    var out = soft + span * (1 - Math.exp(-(a - soft) / span));
    return raw < 0 ? -out : out;
  }
  /* 反函数：抓住的瞬间用当前角度反推 raw，避免"一抓就跳"。 */
  function rubberRaw(angle, soft, hard) {
    var a = Math.min(Math.abs(angle), hard - 0.01);
    if (a <= soft) return angle;
    var span = hard - soft;
    var raw = soft - span * Math.log(1 - (a - soft) / span);
    return angle < 0 ? -raw : raw;
  }
  /* raw 也封顶：拉得再远，往回拉时也不会先经过一大段"死区" */
  function clampRaw(raw, soft, hard) {
    var lim = hard + (hard - soft) * 2.5;
    return clamp(raw, -lim, lim);
  }

  /* 悬停微倾（光效删掉后只剩它）：指针在哪边，哪边就稍微靠近一点 */
  function pointerToTilt(e) {
    var b = S.el.flip.getBoundingClientRect();
    if (!b.width) return;
    var nx = clamp((e.clientX - b.left) / b.width, -0.15, 1.15);
    var ny = clamp((e.clientY - b.top) / b.height, -0.15, 1.15);
    S.hov.tx = clamp((nx - 0.5) * 2, -1, 1);
    S.hov.ty = clamp((ny - 0.5) * 2, -1, 1);
  }

  /* ---------- 缩放 ---------- */
  function flipCenter() {
    var r = S.el.flip.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  /* 平移不能把纸拖出可视区：最多拖到自己放大出来的那几边 */
  function clampPan() {
    var z = S.zoom;
    var lx = (z.s - 1) * S.box.w / 2, ly = (z.s - 1) * S.box.h / 2;
    z.x = clamp(z.x, -lx, lx);
    z.y = clamp(z.y, -ly, ly);
  }
  /* 以屏幕上的 (px,py) 为锚点缩放：那个点下面压着的内容不动（读证书就该这样放大） */
  function zoomAt(next, px, py) {
    var z = S.zoom;
    var ns = clamp(next, 1, ZOOM_MAX);
    if (ns <= 1.01) { z.s = 1; z.x = 0; z.y = 0; return; }
    var c = flipCenter();
    var k = ns / z.s;
    z.x = px - c.x - k * (px - c.x - z.x);
    z.y = py - c.y - k * (py - c.y - z.y);
    z.s = ns;
    clampPan();
  }
  function resetZoom() { S.zoom.s = 1; S.zoom.x = 0; S.zoom.y = 0; }

  function onWheel(e) {
    if (!S.open) return;
    if (e.target.closest && e.target.closest('[data-act]')) return;
    e.preventDefault();                       /* 页面不滚、Lenis 也别接管 */
    /* deltaMode 1 = 按行滚（Firefox 常见），先换算成像素 */
    var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    /* 触控板捏合（浏览器以 ctrlKey=true 的 wheel 送来）delta 很小，步长要放大 */
    var k = Math.exp(-dy * (e.ctrlKey ? 0.010 : 0.0016));
    zoomAt(S.zoom.s * k, e.clientX, e.clientY);
  }

  /* ---------- 指针 ---------- */
  function startPinch() {
    var ids = Object.keys(S.ptrs);
    var a = S.ptrs[ids[0]], b = S.ptrs[ids[1]];
    S.pinch.on = true;
    S.pinch.d0 = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
    S.pinch.cx0 = (a.x + b.x) / 2;
    S.pinch.cy0 = (a.y + b.y) / 2;
    S.pinch.s0 = S.zoom.s;
    S.pinch.x0 = S.zoom.x;
    S.pinch.y0 = S.zoom.y;
    S.el.root.classList.add('is-zooming');
  }

  function pinchMove() {
    var ids = Object.keys(S.ptrs);
    if (ids.length < 2) return;
    var a = S.ptrs[ids[0]], b = S.ptrs[ids[1]];
    var d = Math.hypot(b.x - a.x, b.y - a.y);
    var cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    var ns = clamp(S.pinch.s0 * (d / S.pinch.d0), 1, ZOOM_MAX);
    /* 捏合开始时手指中心压着的那块内容，要一直跟住手指中心（顺便实现双指平移） */
    var c = flipCenter();
    var d0x = (S.pinch.cx0 - c.x - S.pinch.x0) / S.pinch.s0;
    var d0y = (S.pinch.cy0 - c.y - S.pinch.y0) / S.pinch.s0;
    S.zoom.s = ns;
    S.zoom.x = cx - c.x - ns * d0x;
    S.zoom.y = cy - c.y - ns * d0y;
    if (ns <= 1.01) { S.zoom.s = 1; S.zoom.x = 0; S.zoom.y = 0; }
    clampPan();
  }

  function onDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (e.target.closest('[data-act]')) return;      /* 按钮不参与 */
    var onCard = !!e.target.closest('.cv-flip');
    S.ptrs[e.pointerId] = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };

    var ids = Object.keys(S.ptrs);
    /* 第二根手指落下 → 进捏合（空白处捏也允许放大），把单指拖拽停掉 */
    if (ids.length === 2) {
      if (S.drag.on) {
        S.drag.on = false;
        try { S.el.root.releasePointerCapture(S.drag.id); } catch (e0) { }
        S.el.root.classList.remove('is-dragging');
      }
      startPinch();
      e.preventDefault();
      return;
    }
    if (ids.length > 2) return;
    if (!onCard) return;       /* 空白处：单击交给遮罩关闭，不拖不转 */
    /* 点击反馈的唯一入口：按在纸上就是"被按下去"（2026-10-27 第三轮，不挂在入场时间轴上）。
       2026-10-28 第十一轮曾给入场期间加过闸门（"入场那 900ms 不认这一记"），用户随即反馈
       「貌似并没有点击效果，直接放大了」—— 闸门已撤，这一记不再被任何时间轴吞掉。 */
    startPress();
    if (e.pointerType === 'mouse') pointerToTilt(e);
    /* 入场**随时可以打断**（2026-10-27 用户要求）。参考的就是惯性滑动引擎的做法：
        谁动手就把运动放下，而不是等它自己播完。handOverSpin / handOverLift 保证同一帧不变。 */
    if (S.spin.on) handOverSpin();
    if (S.grab.on) handOverLift();
    if (S.reduced) return;     /* 减少动态：可以缩放，但不转 */

    S.drag.on = true;
    S.drag.id = e.pointerId;
    S.drag.lx = e.clientX; S.drag.ly = e.clientY;
    S.drag.lt = performance.now();
    S.drag.vx = 0; S.drag.vy = 0; S.drag.moved = 0;
    /* 从入场手里接过来的角度可能远超默认软区（最大 180°）：把本次拖动的软区抬到
       当前角度，线性区继续 1:1 跟手；越过软区之后"越拉越费劲"的压缩关系不变。 */
    S.drag.softX = DRAG_SOFT_X; S.drag.hardX = DRAG_HARD_X;
    S.drag.softY = DRAG_SOFT_Y; S.drag.hardY = DRAG_HARD_Y;
    if (Math.abs(S.phys.rx) > S.drag.softX) {
      S.drag.softX = Math.abs(S.phys.rx) + 1;
      S.drag.hardX = S.drag.softX + (DRAG_HARD_X - DRAG_SOFT_X);
    }
    if (Math.abs(S.phys.ry) > S.drag.softY) {
      S.drag.softY = Math.abs(S.phys.ry) + 1;
      S.drag.hardY = S.drag.softY + (DRAG_HARD_Y - DRAG_SOFT_Y);
    }
    /* 从当前角度反推 raw：上一轮甩出去的余角也能接着抓，不会跳一下 */
    S.drag.rawX = rubberRaw(S.phys.rx, S.drag.softX, S.drag.hardX);
    S.drag.rawY = rubberRaw(S.phys.ry, S.drag.softY, S.drag.hardY);
    try { S.el.root.setPointerCapture(e.pointerId); } catch (eCap) { }
    S.el.root.classList.add('is-dragging');
    e.preventDefault();                              /* 别让浏览器把图当图片拖走 */
  }

  function onMove(e) {
    if (!S.open) return;
    if (S.ptrs[e.pointerId]) {
      var pp = S.ptrs[e.pointerId];
      var ddx = e.clientX - pp.x, ddy = e.clientY - pp.y;
      pp.x = e.clientX; pp.y = e.clientY;
      pp.moved += Math.abs(ddx) + Math.abs(ddy);
    }
    if (S.pinch.on) { pinchMove(); return; }
    if (!S.drag.on || e.pointerId !== S.drag.id) {
      if (e.pointerType === 'mouse') pointerToTilt(e);
      return;
    }
    var now = performance.now();
    var dt = Math.max(8, now - S.drag.lt) / 1000;
    var dx = e.clientX - S.drag.lx;
    var dy = e.clientY - S.drag.ly;
    S.drag.lx = e.clientX; S.drag.ly = e.clientY; S.drag.lt = now;
    S.drag.moved += Math.abs(dx) + Math.abs(dy);

    if (S.zoom.s > 1.01) {
      /* 放大之后一只手是"平移"而不是"转动" —— 看图时这是所有人的直觉 */
      S.zoom.x += dx; S.zoom.y += dy;
      clampPan();
      return;
    }

    /* 转动：橡皮筋。raw 累计指针位移，显示角度由 rubber() 压缩，越靠边越费劲 */
    var prevX = S.phys.rx, prevY = S.phys.ry;
    S.drag.rawY = clampRaw(S.drag.rawY + dx * DRAG_GAIN, S.drag.softY, S.drag.hardY);
    S.drag.rawX = clampRaw(S.drag.rawX - dy * DRAG_GAIN, S.drag.softX, S.drag.hardX);
    S.phys.ry = rubber(S.drag.rawY, S.drag.softY, S.drag.hardY);
    S.phys.rx = rubber(S.drag.rawX, S.drag.softX, S.drag.hardX);
    /* 松手惯性用**显示角**的角速度（橡皮筋里 raw 的速度已经不是手感了） */
    S.drag.vx = S.drag.vx * 0.6 + ((S.phys.ry - prevY) / dt) * 0.4;
    S.drag.vy = S.drag.vy * 0.6 + ((S.phys.rx - prevX) / dt) * 0.4;
    if (S.drag.moved > 24) S.el.hint.classList.add('is-used');
  }

  function onUp(e) {
    var p = S.ptrs[e.pointerId];
    delete S.ptrs[e.pointerId];

    /* 触屏双击放大：两次轻点，间隔 < 320ms、两次落点 < 28px */
    if (p && e.pointerType !== 'mouse' && p.moved < 10 && performance.now() - p.t < 260) {
      var nowT = performance.now();
      var dbl = nowT - S.tap.t < 320 && Math.hypot(e.clientX - S.tap.x, e.clientY - S.tap.y) < 28;
      if (dbl) {
        S.tap.t = 0;
        if (S.zoom.s > 1.05) resetZoom(); else zoomAt(2.6, e.clientX, e.clientY);
        return;
      }
      S.tap.t = nowT; S.tap.x = e.clientX; S.tap.y = e.clientY;
    }

    /* 捏合结束：剩下的手指不要突然变回"转动" */
    if (S.pinch.on) {
      if (Object.keys(S.ptrs).length < 2) {
        S.pinch.on = false;
        S.el.root.classList.remove('is-zooming');
      }
      return;
    }

    if (!S.drag.on || e.pointerId !== S.drag.id) return;
    S.drag.on = false;
    try { S.el.root.releasePointerCapture(e.pointerId); } catch (eR) { }
    S.el.root.classList.remove('is-dragging');
    /* 松手：把最后的速度交给弹簧，于是有"甩出去再被拉回来"的余韵（与入场同一档阻尼比） */
    S.phys.vx = clamp(S.drag.vy, -420, 420);
    S.phys.vy = clamp(S.drag.vx, -420, 420);
  }

  function onLeave() {
    S.hov.tx = 0; S.hov.ty = 0;
  }

  /* ---------- 10. 关闭 ---------- */

  /* 立刻收掉（不做退场动画）：PJAX 换页时用。
     这时候 <main> 已经换成新页面的内容，卡片背后那张纸**不在这页了** ——
     再从"原来的位置"缩回去，看到的就是一张白纸飞向虚空。 */
  function closeNow() {
    if (!S.el.root) return;
    S.el.root.hidden = true;
    S.el.root.classList.remove('is-open', 'is-running', 'is-dragging', 'is-zoomed', 'is-zooming');
    S.el.flip.style.transform = 'none';
    /* 插入：把纸搬回页面原处（PJAX 已经把 <main> 换掉时无处可还，节点随旧文档一起丢掉） */
    insertBack();
    /* 旋转/微倾也清干净：早关（翻转途中 Esc）会把 --ry 停在半路，
       虽然下次 open() 的 kickSpin / render 都会重写，但让关着的 DOM 回到中性更省心。 */
    if (S.el.tilt) S.el.tilt.style.transform = 'none';
    if (S.el.persp) S.el.persp.style.transform = 'none';
    /* 入场旋转的状态一并清干净：下次 open() 的 kickSpin 会重新钉首帧，
       但这里不清的话，探针/调试里会看到"已经关了还在转"的假象。 */
    S.spin.on = false; S.spin.caught = false; S.spin.a = 0; S.spin.v = 0;
    /* 倾角层与影子的收场：两者都可能还挂着 WAAPI（fill:'both' 会盖住内联样式，
       不 cancel 的话下一次打开的第一帧就是上次退场的残留姿态）。 */
    S.grab.on = false; S.grab.el = 0;
    S.grab.ax = 0; S.grab.ay = 0; S.grab.h = 0;
    if (S.grabAnim) { try { S.grabAnim.cancel(); } catch (e) { } S.grabAnim = null; }
    if (S.shadowAnim) { try { S.shadowAnim.cancel(); } catch (e) { } S.shadowAnim = null; }
    if (S.el.grab) S.el.grab.style.transform = 'none';
    if (S.el.shadow) S.el.shadow.style.opacity = '';
    /* 扫光与按压也归零：下一次打开必须是全新的一次（locked 在这里解锁） */
    cancelSweep();
    S.sweep.locked = false;
    S.press.y = 0; S.press.v = 0; S.press.on = false;
    if (S.el.press) S.el.press.style.transform = 'none';
    if (S.flipAnim) { try { S.flipAnim.cancel(); } catch (e) { } S.flipAnim = null; }
    S.flipFrom = null;
    resetZoom();
    unlockPage();
  }

  function close() {
    if (!S.open) return;
    S.open = false;
    stop();
    S.el.root.classList.remove('is-open', 'is-dragging');
    if (S.drag.on) { S.drag.on = false; }
    playFlipOut(function () {
      if (S.open) return;                 /* 关的过程中又点开了：别把新的收掉 */
      closeNow();
      if (S.lastFocus && S.lastFocus.focus) { try { S.lastFocus.focus({ preventScroll: true }); } catch (e2) { } }
    });
  }

  /* PJAX 换页（点导航 / 浏览器前进 / 后退）时浮层必须立刻收掉。
     <main> 被整块替换，{打开它的那张纸} 已经不在文档里；不主动收的话，
     遮罩会继续盖在新页面上、<html> 的滚动锁也不会归还（2026-10-26 实测：
     开着证书按后退，回到首页后整页仍然锁着、还挂在旧证书的画面上）。 */
  document.addEventListener('pjax:done', function () {
    if (!S.open) return;
    S.open = false;
    stop();
    closeNow();
  });

  /* ---------- 11. 键盘 ---------- */
  document.addEventListener('keydown', function (e) {
    if (!S.open) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    /* ← → 原来用于换张（画廊），现在一张纸只对应一张证书，已删除 */
    if (e.key === 'Tab') {
      var f = S.el.root.querySelectorAll('button:not([hidden])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);

  /* 指针离开卡片：悬停微倾归零（整层都算，挪到按钮上也算离开） */
  document.addEventListener('pointermove', function (e) {
    if (!S.open) return;
    if (S.el.root && !S.el.root.contains(e.target)) onLeave();
  }, true);

  window.addEventListener('resize', function () {
    if (!S.open) return;
    fitBox(S.items[S.index], true);
    resetZoom();                     /* 视口变了，原来的缩放锚点就没意义了 */
  });

  /* ---------- 13. 滚动锁 ----------
     这套技术是 math-image.js 里实测出来的（锁 <html>、绝不动 <body>，否则
     文章页粘性目录会掉下去），所以直接复用它导出的函数；拿不到时兜底。 */
  function lockPage() {
    var api = window.__hnLbLock;
    if (api && api.lock) { api.lock(); return; }
    document.documentElement.style.overflow = 'hidden';
  }
  function unlockPage() {
    var api = window.__hnLbLock;
    if (api && api.unlock) { api.unlock(); return; }
    document.documentElement.style.overflow = '';
  }

  /* 对外只暴露一个只读探针（验收脚本用；不参与任何生产逻辑） */
  window.__hnCertViewer = {
    isOpen: function () { return S.open; },
    state: function () {
      return {
        open: S.open, index: S.index, n: S.items.length,
        rx: +S.phys.rx.toFixed(2), ry: +S.phys.ry.toFixed(2),
        vx: +S.phys.vx.toFixed(2), vy: +S.phys.vy.toFixed(2),
        /* 入场旋转的现场：spinning = 还在转；spin = 当前角度（180 = 背面，360 = 正向） */
        spinning: S.spin.on, spin: S.spin.on ? +S.spin.a.toFixed(2) : null,
        spinV: S.spin.on ? +S.spin.v.toFixed(1) : null,
        dragging: S.drag.on, zoom: +S.zoom.s.toFixed(3), pan: [+S.zoom.x.toFixed(1), +S.zoom.y.toFixed(1)],
        hov: [+S.hov.x.toFixed(3), +S.hov.y.toFixed(3)],
        /* 点击反馈与扫光的现场（验收脚本用）：press = 当前下沉像素，sweep = 这一打开的带子是否已播过 */
        press: +S.press.y.toFixed(2), pressing: S.press.on, swept: S.sweep.locked,
        /* 「Z 轴拉起 + 风阻旋转」那一层的现场：grabOn = 入场还没走完、grabP = 入场进度
           （0→1，1 = FLIP 停稳），grabX/grabY = 当前倾角（deg，**负** = 上沿朝观众兜过来 = 躺着），
           grabH = 离桌高度（0 = 躺在桌上、1 = 抬到眼前） */
        grabOn: S.grab.on, grabP: +S.grab.p.toFixed(3),
        grabX: +S.grab.ax.toFixed(2), grabY: +S.grab.ay.toFixed(2),
        grabH: +S.grab.h.toFixed(3),
        box: [S.box.w, S.box.h], reduced: S.reduced
      };
    }
  };
})();