# Portal 展示网页 — 更新记录

## v1.0 — 2026-09-13

### 用户提示词
> 创建子项目 portal，放置作业总展示网页，设置为可通过 GitHub Pages 预览网址直接访问，要有高级感设计。

### 修改细节
- 创建 `portal/` 目录结构（index.html、css/style.css、js/main.js）
- 设计并实现深色科技风展示网页：Hero 区域、作品卡片 Grid 布局、Footer
- 视觉效果：CSS 渐变、毛玻璃卡片、悬停动画、滚动淡入（Intersection Observer）
- 响应式适配：桌面、平板、手机三端布局
- 当前为空状态展示，预留卡片模板供后续添加作品
- 配置 GitHub Actions 工作流（.github/workflows/deploy.yml），自动将 portal 部署到 GitHub Pages

---

### 实现补充说明

#### 目录结构
```
portal/
├── index.html          主展示网页
├── css/
│   └── style.css       全部样式（设计令牌 / 背景层 / 组件 / 响应式）
├── js/
│   └── main.js         交互脚本（原生 JS，无任何依赖）
└── progress.md         本文件
```

#### 设计语言
- **主题**：深空观测站 × 科技奢侈品（deep-space observatory / techno-luxury）
- **配色**：底色 `#07070c → #0a0a0f → #1a1a2e`；强调渐变 `#667eea → #764ba2`；
  辅助点缀 `#6ee7d7`（薄荷，用于状态/在线指示）与 `#f2a65a`（琥珀，用于警示）
- **字体**：Syne（展示标题，700/800）+ Noto Sans SC（中文正文）+ JetBrains Mono（技术标签、数据行）
- **排版**：非对称双栏 Hero，超大号标题配负字距，细发丝分隔线与等宽序号系统

#### 页面结构
1. **环境背景层**：径向渐变光晕 ×3（缓慢漂移）+ 工程网格 + 扫描线 + SVG 颗粒噪点 + 光标氛围光
2. **顶部滚动进度条**：渐变色，随滚动 scaleX 变化
3. **固定导航**：滚动后切换为毛玻璃吸附态，含品牌标记、锚点导航、GitHub 按钮
4. **Hero 区域**：序号轨、逐行上推的大标题、副标题、双按钮、底部统计轨（收录作品 / 版本 / 部署方式）
5. **状态面板**（Hero 右侧）：毛玻璃卡片 + 渐变描边，展示仓库、分支、作品数、构建、技术栈、更新日期、UTC 实时时钟，底部为动态波形条
6. **跑马灯**：技术关键词无限横向滚动，悬停暂停，两端遮罩淡出
7. **作品展示区**：`repeat(auto-fill, minmax(330px, 1fr))` 网格 + 空状态面板
8. **创作流程区**：四格发丝分隔条（提出需求 → 拆解生成 → 校验迭代 → 推送上线）
9. **关于本站**：说明纯静态、无构建、无依赖
10. **Footer**：大号标题 + GitHub 仓库入口 + 版权信息与页脚导航

#### 交互与动效
- 页面加载：Hero 标题逐行 `translateY` 上推，副标题 / 按钮 / 统计轨 / 状态面板依次错峰淡入
- 滚动淡入：`IntersectionObserver` 监听所有 `.rv` 元素，`threshold: 0.12`，进入视口后添加 `.is-in`；
  另有 `.rv--mask` 变体使用 `clip-path` 实现向上揭幕效果
- 错峰延迟：带 `data-stagger` 的容器内，子项按索引自动写入 `--d` 延迟变量（90ms 递增）
- 卡片悬停：上浮 9px + 阴影扩散 + 渐变描边亮起 + 内部网格微缩放 + 图标旋转上浮 +
  跟随鼠标的径向光斑（通过 `--mx` / `--my` 自定义属性驱动）
- 空状态：脉冲扩散环 + 呼吸核心球 + 横向掠过的微光带 + 四角括号装饰
- 光标氛围光：`requestAnimationFrame` 插值跟随，仅在 `hover: hover` 且 `pointer: fine` 设备启用
- 视差：背景光晕按 `data-parallax` 系数随滚动位移
- 无障碍：`prefers-reduced-motion` 下全部动画降级为瞬时，保留完整内容与可读性；
  装饰层标记 `aria-hidden`，交互元素提供 `:focus-visible` 高亮环

#### 响应式断点
| 断点 | 布局调整 |
| --- | --- |
| `> 1080px` | Hero 双栏（1.12fr / 0.88fr），作品网格自适应多列 |
| `≤ 1080px` | Hero 单栏，状态面板下移并限宽 560px，章节标题左对齐 |
| `≤ 760px` | 隐藏导航链接，作品网格单列，流程条单列，按钮全宽，Footer 纵排，装饰角标隐藏 |
| `≤ 420px` | 隐藏品牌文字，统计数字缩小 |

#### 后续添加作品的方法
1. 打开 `portal/index.html`，找到 `#works-grid` 内的「作品卡片模板 · CARD TEMPLATE」HTML 注释
2. 复制注释中的 `<article class="card rv">…</article>` 整段，粘贴到 `#works-grid` 内
3. 修改序号、状态标签、图标、标题、描述、技术栈标签与两个按钮链接
4. 保存即可 —— 作品计数、空状态自动隐藏、错峰淡入动画均由 `js/main.js` 自动处理，无需改动脚本

#### GitHub Pages 部署
- 工作流文件：`.github/workflows/deploy.yml`
- 触发条件：推送到 `main` 分支，或手动 `workflow_dispatch`
- 权限：`contents: read` / `pages: write` / `id-token: write`
- 发布目录：`./portal`（仓库根目录的 portal 子目录内容作为站点根）
- 首次启用需在仓库 **Settings → Pages → Source** 中选择 **GitHub Actions**

---

## v1.1 — 2026-09-14

### 用户提示词
> 将百度秒哒生成的 Todolist 待办网站作为子项目加入 portal 展示，含在线演示入口。

### 修改细节
- 在 `portal/index.html` 的 `#works-grid` 内，参照注释模板追加第一张真实作品卡片 `<article class="card rv">`
- 卡片字段填充：
  - 序号 `01`，状态标签 `LIVE`（已上线），图标 emoji `📝`
  - 标题：**Todolist · 待办清单**
  - 描述：基于 React + Tailwind CSS 的待办事项应用，焦糖橙暖色卡片式设计；支持增删改查、全部/进行中/已完成三态筛选、温馨空状态提示与移动端适配，采用乐观更新与失败回滚的错误处理
  - 技术栈标签：React / Tailwind CSS / shadcn/ui / 百度秒哒
  - 「查看详情」按钮 → `https://github.com/AlexNull03/VibeCodingHomework/blob/main/Todolist/introduce.md`
  - 「在线演示」按钮 → `https://app-ee2c6ujdy9z5.miaoda.online`
- 保留 `#works-grid` 内的 HTML 注释模板（CARD TEMPLATE），供后续作品复制使用
- 同步更新 Hero 右侧状态面板 `UPDATED` 字段为 `2026-09-14`
- 无需改动 `js/main.js`：`initWorksState()` 自动统计到 1 张卡片，将「收录作品」计数由 `00` 更新为 `01`，自动隐藏 `#empty-state` 空状态面板并显示作品网格；`data-stagger` 错峰淡入与卡片鼠标光斑效果对新卡片自动生效

### 影响范围
- 修改文件：`portal/index.html`、`portal/progress.md`
- 未触碰：`portal/css/style.css`、`portal/js/main.js`、`.github/workflows/deploy.yml`
- 视觉效果：卡片沿用模板自带类名（`.card / .card__thumb / .card__body / .tags / .mini`），与现有深色科技风完全协调

---

## v1.2 — 2026-11-09

### 用户提示词
> 新增"关于我 / 个人经历"区块（教育经历、专业技能、证书、获奖，全部为真实信息），并在作品网格中新增第 03 张卡片 PureNavigation · 纯净导航站。

### 修改细节
- **新增个人经历区块**：在 `portal/index.html` 的 `#about` 之前插入 `#profile` 区块，沿用 `sec__head / eyebrow / grad-text / rv` 结构；内部为 `profile__grid` 四张玻璃卡片（带 `data-stagger` 错峰淡入）：
  - 教育经历：渐变节点时间线 —— 2021–2023 国防科技大学 应用统计学专业 本科；2025–至今 武汉理工大学 数字经济专业 本科
  - 专业技能：较为熟练使用 Python、C、C++ 编程语言；掌握 Ps、Pr 等技能，配 `.tag` 标签
  - 证书：大学英语六级 / 计算机二级 C++ / 计算机三级 Linux，薄荷圆点清单
  - 获奖：时间线 —— 2023 华为杯中国研究生网络安全大赛 揭榜挑战赛 国赛一等奖；2026 中国高校计算机大赛网络技术赛 A-ST 赛道 华中赛区三等奖
- **新增作品卡片 03**：`#works-grid` 内追加 `<article class="card rv">`，序号 `03`，状态 `LIVE`，图标 🧭
  - 标题：**PureNavigation · 纯净导航站**
  - 简介与技术栈取自项目 `README.md` 与《纯净导航站开发流程文档》：只给官方入口的软件导航站，附安装建议、网站真伪判别两个 AI 入口；标签 React 19 / Vite 7 / Tailwind 4 / FastAPI / DeepSeek
  - 「查看详情」→ `https://github.com/AlexNull03/PureNavigation`（开发流程文档中登记的公开仓库）
  - 「在线演示」→ `https://www.alexcn.work/PureNavigation/main/`
- **导航与状态面板**：主导航新增「关于我」锚点（`#profile`）；Hero 状态面板 `UPDATED` 字段更新为 `2026-11-09`
- **样式**：`portal/css/style.css` 末尾追加第 18 节 Profile 样式（`.profile__grid / .bio / .tl / .bio__badge / .bio__list`），全部复用现有设计令牌与字体；≤760px 单列适配；未改动任何既有规则
- **脚本未改动**：`js/main.js` 的 `initWorksState()` 自动将 `data-count` 统计为 `03`，新卡片与新区块的 `.rv` 淡入、`data-stagger` 错峰、卡片光斑均自动生效

### 影响范围
- 修改文件：`portal/index.html`、`portal/css/style.css`、`portal/progress.md`
- 未触碰：`portal/js/main.js`、`.github/workflows/deploy.yml`
- 信息真实性：个人经历逐条来自用户提供的真实资料；PureNavigation 简介、技术栈、仓库与线上地址均来自该项目 README 与开发流程文档，未编造任何经历、奖项或数据

## v1.3 — 2026-11-09（补充兴趣爱好）
- `#profile` 新增第 5 张卡片「Interests · 兴趣爱好」：旅行、摄影、羽毛球（用户口述真实爱好）；区块描述同步更新
- 目的：补齐个人介绍型网站"爱好"展示项（AI 评估曾指出缺失）；仅改 `portal/index.html` 与 `progress.md`

## v1.4 — 2026-11-09（个人简介前移 + 证书佐证）
- 将 #profile（关于我/个人简介）整块前移至封面后、作品集前；导航顺序同步为 关于我/作品/流程/关于
- #profile 内新增「佐证材料」画廊：华为杯一等奖、计算机二级C++、三级Linux、2026计算机大赛华中三等奖 4 张真实证书（assets/certs/）
- 新增 .certs 画廊样式；证书为用户提供的真实佐证，未编造
