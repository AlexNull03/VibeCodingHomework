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
