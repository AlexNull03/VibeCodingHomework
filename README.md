<div align="center">

# 🧭 VibeCoding · AI 编程课作品集

_从一句提示词，到一个可以打开的网页。_

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-2ea88a?style=flat-square&logo=githubpages&logoColor=white)](https://alexnull03.github.io/VibeCodingHomework/)
[![Deploy Status](https://img.shields.io/github/actions/workflow/status/AlexNull03/VibeCodingHomework/deploy.yml?label=Deploy&style=flat-square&logo=githubactions&logoColor=white)](https://github.com/AlexNull03/VibeCodingHomework/actions/workflows/deploy.yml)
[![Last Commit](https://img.shields.io/github/last-commit/AlexNull03/VibeCodingHomework?style=flat-square&logo=git&logoColor=white)](https://github.com/AlexNull03/VibeCodingHomework/commits/main)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)](#)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)](#)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](#)

### 🔗 在线预览 · Live Demo

[![Open Portal](https://img.shields.io/badge/%E2%96%B6%20%E6%89%93%E5%BC%80%20Portal%20%E5%B1%95%E7%A4%BA%E9%A1%B5-667eea?style=for-the-badge&logo=googlechrome&logoColor=white)](https://alexnull03.github.io/VibeCodingHomework/)
[![Open Todolist](https://img.shields.io/badge/%E2%96%B6%20%E6%89%93%E5%BC%80%20Todolist%20%E5%BE%85%E5%8A%9E%E6%B8%85%E5%8D%95-f59e0b?style=for-the-badge&logo=googlechrome&logoColor=white)](https://app-ee2c6ujdy9z5.miaoda.online)

<sub>Portal: https://alexnull03.github.io/VibeCodingHomework/ · Todolist: https://app-ee2c6ujdy9z5.miaoda.online</sub>

</div>

---

## 📖 项目简介

本仓库是 **AI 编程课程**的作业作品集，用于沉淀每一次「与 AI 协作完成一个小项目」的过程与成果。

- 🎯 **目标**：把课程中完成的网页、脚本、小工具集中收录，形成一个可以长期迭代的作品展示门户。
- 🛠 **方式**：以提示词驱动开发（Prompt-Driven Development），配合手工精修，逐步打磨每一个子项目。
- 🚀 **部署**：通过 GitHub Actions 自动构建，将 `portal/` 目录发布到 GitHub Pages，`main` 分支推送即上线。

---

## 🗂 项目结构

```text
VibeCodingHomework/
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD：将 portal/ 部署到 GitHub Pages
├── portal/                     # 🌐 作品展示门户（当前线上版本）
│   ├── css/
│   │   └── style.css           #    深色科技风样式（渐变、光斑、网格、颗粒）
│   ├── js/
│   │   └── main.js             #    交互脚本（视差、滚动、卡片动效）
│   ├── index.html              #    门户主页
│   └── progress.md             #    开发进度记录
├── Todolist/                   # 📝 百度秒哒待办应用 · 介绍与更新记录
│   ├── introduce.md            #    项目介绍与提示词迭代说明
│   └── progress.md             #    开发进度记录
├── rule/
│   └── base.txt                # 📏 项目基础规则与约束
└── README.md                   # 📄 当前这份说明
```

---

## 🧩 子项目列表

| # | 项目 | 描述 | 状态 | 链接 |
|:-:|:-----|:-----|:----:|:-----|
| 01 | **Portal** | 深色科技风作品集展示门户，作为所有子项目的入口页 | ✅ 已上线 | [在线预览](https://alexnull03.github.io/VibeCodingHomework/) · [源码](./portal) |
| 02 | **Todolist · 待办清单** | 暖色卡片风待办应用（React + Tailwind CSS），四轮提示词迭代成型，支持增删/三态筛选/移动端适配 | ✅ 已上线 | [在线演示](https://app-ee2c6ujdy9z5.miaoda.online) · [文档](./Todolist/introduce.md) |
| 03 | _待添加_ | _下一个作业将在此登记_ | 🕓 计划中 | — |

> 每完成一次新的课程作业，都会在此表格中追加一行，并在 `portal/index.html` 中挂载对应的入口卡片。

---

## ⚙️ 技术栈

<div>
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/GitHub%20Pages-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub Pages">
  <img src="https://img.shields.io/badge/GitHub%20Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white" alt="GitHub Actions">
</div>

| 分类 | 技术 | 用途 |
|:-----|:-----|:-----|
| 结构 | **HTML5** | 语义化页面骨架 |
| 样式 | **CSS3** | 自定义属性、渐变、滤镜、`@keyframes` 动效、Grid / Flex 布局 |
| 脚本 | **JavaScript (ES6+)** | 视差滚动、IntersectionObserver、卡片交互 |
| 框架 | **React + Tailwind CSS** | Todolist 子项目 UI 框架与原子化样式 |
| 托管 | **GitHub Pages** | 静态站点托管，`portal/` 目录直接发布 |
| 托管 | **秒哒 (Miaoda)** | Todolist 在线演示环境 |
| 流水线 | **GitHub Actions** | `push → main` 自动构建并部署 |

---

## 🚀 本地运行

Portal 是纯静态页面，无需构建步骤，任选一种方式即可预览：

```bash
# 方式一：Python 内置静态服务器
cd portal
python -m http.server 8080
# 打开 http://localhost:8080

# 方式二：VS Code 安装 Live Server 插件，右键 index.html → Open with Live Server
```

---

## 🤝 贡献与反馈

- 仓库地址：<https://github.com/AlexNull03/VibeCodingHomework>
- 欢迎通过 **Issue** 指出问题，或通过 **Pull Request** 提交改进。
- 若某个子项目参考了你的作品，会在对应目录下的 `progress.md` 中注明来源。

---

<div align="center">

### 👤 作者 · Author

**陈允升** · 数字经济2501班

[GitHub](https://github.com/AlexNull03) · [作品集门户](https://alexnull03.github.io/VibeCodingHomework/)

### 🎓 课程 · Course

**AI 编程课 · Vibe Coding** — 提示词驱动的网页开发实践

---

<sub>Made with 💜 & AI · © 2026 AlexNull03 · 若本仓库对你有帮助，欢迎点个 ⭐ Star</sub>

</div>
