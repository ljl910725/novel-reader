# NovelReader 小说阅读全栈项目

多用户小说阅读系统：书源搜索、TXT/EPUB 本地与云端阅读、书源商店与生成向导、Windows 悬浮客户端、Android 客户端。

> **零基础？** 请阅读 **[📖 用户完整手册](docs/用户完整手册.md)**（含环境安装、部署、各端使用、排错）。  
> 文档目录：[docs/README.md](docs/README.md)

## 功能概览

- **多用户账号**：注册登录，书架与阅读进度云端同步
- **游客模式**：无需登录即可导入书源、搜索、在线阅读、本地 TXT（网页存浏览器，**APK 存手机本地**）
- **权限管理**：管理员可在后台控制游客/用户功能权限
- **书源商店**：一键导入演示书源（新手推荐）
- **书源生成向导**：输入网址，分步分析生成 Legado 规则
- **Legado 导入**：粘贴 JSON 或订阅链接
- **搜索与阅读**：多书源并行搜索，主题自定义
- **TXT/EPUB**：浏览器本地打开、云端上传、桌面端本地读取
- **Windows 悬浮窗**：透明置顶、可调大小/透明度/字体
- **Android 客户端**：书源/书架/进度存手机 AsyncStorage
- **管理后台**：用户与书源管理（管理员）

## 环境要求

- Node.js 20+
- pnpm 9+
- Docker Desktop（推荐，用于 PostgreSQL + Redis）
- Rust + Tauri 依赖（仅 Windows 桌面端）
- Android Studio（仅 Android 开发/模拟器）

详细安装步骤见 [用户完整手册 §3](docs/用户完整手册.md#3-环境准备第一次必做)。

## 快速开始

```powershell
# 1. 复制环境变量
copy .env.example .env

# 2. 启动数据库（需 Docker）
docker compose up -d

# 3. 安装依赖
pnpm install

# 4. 初始化数据库
pnpm db:push
pnpm db:seed

# 5. 启动 API 和网页端
pnpm --filter @novel-reader/server dev
pnpm --filter @novel-reader/web dev
```

或使用一键脚本：

```powershell
.\scripts\start.ps1
```

| 项目 | 地址 |
|------|------|
| 网页端 | http://localhost:5173 |
| API 健康检查 | http://localhost:3001/api/health |
| 演示账号 | `demo@novel.local` / `demo123` |
| 管理员 | `admin@novel.local` / `admin123` |

## 各端启动（简表）

| 端 | 命令 | 手册章节 |
|----|------|----------|
| API + 网页 | `.\scripts\start.ps1` | [§4](docs/用户完整手册.md#4-服务端部署核心其他端都依赖它) |
| Windows 桌面 | `pnpm --filter @novel-reader/desktop dev:desktop` | [§6](docs/用户完整手册.md#6-windows-桌面悬浮客户端) |
| Android | `pnpm --filter @novel-reader/mobile android` | [§7](docs/用户完整手册.md#7-android-手机客户端apk) |

## 测试

```powershell
pnpm test
pnpm test:e2e
```

## 项目结构

```
apps/server    - NestJS API
apps/web       - React 网页端
apps/mobile    - Expo Android 阅读器（本机 AsyncStorage）
apps/desktop   - Tauri Windows 客户端
packages/*     - 共享库（书源引擎、文件解析、UI）
docs/          - 用户文档
```

## 书源新手指南

1. **书源商店** → 一键导入  
2. **生成书源向导** → 输入小说站 URL  
3. **我的书源** → 粘贴社区 JSON  

详见 [手册 §9](docs/用户完整手册.md#9-书源导入搜索阅读新手指南)。
