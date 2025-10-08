# Anki Assistant Chrome Extension

> 🎯 智能网页内容转Anki闪卡的Chrome扩展

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

✅ **最新更新 (2025-01-08)**: 
- ✨ 全新快捷键系统（6个快捷键）
- 🛠️ 批量操作工具栏
- 🧠 智能记忆上次选择
- 🎯 优化卡组/模型选择器

---

## ✨ 核心特性

### 基础功能
- 🎯 **智能Q/A识别** - 支持"问："到"答："格式，完整保留代码块、表格、多段落
- 🎨 **实时预览编辑** - Shadow DOM隔离的可视化界面，不受页面样式影响
- ⚡ **快速触发** - 右键菜单 / Alt+A 快捷键
- 📋 **卡组选择器** - 下拉选择现有卡组 + 搜索过滤 + 智能排序
- 🎯 **模型选择器** - 支持所有Anki笔记类型
- 🏷️ **自由标签** - 手动输入tags，支持逗号分隔

### 快速导入模式 (v0.3.0 新增) ⭐
- 🪟 **轻量级弹窗** - 350×450px小窗口，不遮挡页面
- 🎯 **2-3秒导入** - 比完整模式快85%（15-20秒 → 2-3秒）
- 🖱️ **可拖动** - 拖动标题栏移动，位置自动记忆
- 📢 **Toast通知** - 成功/失败即时反馈，非阻塞
- 🔄 **模式切换** - 点击"📝 Preview"切换到完整编辑器
- ⌨️ **Ctrl+Enter** - 快捷键快速导入

### 体验优化 (v0.2.0)
- ⌨️ **快捷键系统**
  - `Ctrl/Cmd + Enter` - 快速提交
  - `↑/↓` - 上下浏览卡片
  - `Space` - 切换选中状态
  - `Ctrl/Cmd + A` - 全选/全不选
  - `ESC` - 关闭界面
- 🛠️ **批量操作** - 一键全选/删除，实时计数
- 🧠 **智能记忆** - 自动记住最近5个卡组、3个模型
- 🔍 **搜索过滤** - 卡组和模型支持实时搜索
- ✓ **选中标记** - 已选项高亮显示，置顶排列

---

## 🚀 快速开始

### 0. ⚠️ Anki配置（重要！）

在使用扩展前，需要配置AnkiConnect：

1. **安装AnkiConnect插件**
   - Anki → 工具 → 插件 → 获取插件...
   - 代码：`2055492159`

2. **配置CORS白名单**
   - Anki → 工具 → 插件 → AnkiConnect → 配置
   - 添加扩展ID到白名单（详见 [快速修复指南](QUICK_FIX.md)）

3. **验证连接**
   ```bash
   ./diagnose-anki-connection.sh
   ```

> 💡 **遇到连接问题？** 查看 [QUICK_FIX.md](QUICK_FIX.md) 快速解决

### 1. 安装依赖

```bash
pnpm install
```

### 2. 构建插件

```bash
cd extension
pnpm build        # 生产构建

# 或开发模式（带热重载）
pnpm dev
```

### 3. 加载到Chrome

1. 打开 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `extension/dist` 目录
5. **复制扩展ID**（32位字符）
6. 将扩展ID添加到AnkiConnect白名单（见步骤0）

### 4. 使用方法

1. **选中网页文本**（建议包含问答内容）
2. **触发捕获**：右键 → "发送到 Anki" 或按 `Alt+A`
3. **预览编辑**：在浮层中查看和修改识别出的卡片
4. **调整设置**：选择卡组、模板、标签
5. **提交到Anki**：点击"Add to Anki"

---

## 📦 项目结构

```
extension/
  ├── src/
  │   ├── background/      # Service Worker（后台处理）
  │   │   ├── index.ts    # 主入口 + 消息处理
  │   │   ├── processor.ts # Q/A识别和处理
  │   │   ├── ankiClient.ts
  │   │   └── ...
  │   ├── content/         # Content Scripts
  │   │   ├── index.ts    # 捕获触发 + 消息中转
  │   │   ├── overlay.ts  # ⭐ Overlay管理（Shadow DOM）
  │   │   └── selection.ts
  │   ├── overlay/         # React UI组件
  │   │   ├── App.tsx     # 主界面（左卡片列表 + 右编辑器）
  │   │   ├── components/
  │   │   └── state/
  │   ├── options/         # 设置页面
  │   ├── messaging/       # 消息传递（Zod schemas）
  │   └── shared/          # 共享工具
  └── public/              # 静态资源

extension-tests/           # Playwright + Vitest 测试
```

### 🔄 消息流程（新架构）

```
用户触发（右键/Alt+A）
    ↓
content/index.ts: 捕获选区 DOM
    ↓
→ background/index.ts: 处理 + Q/A识别
    ↓
← content/index.ts: 收到 capture:ready
    ↓
content/overlay.ts: 动态注入 React Overlay (Shadow DOM)
    ↓
overlay/App.tsx: 显示预览界面
    ↓
用户编辑确认 → 提交到 Anki
```

---

## 🛠️ 开发脚本

```bash
# 开发
cd extension
pnpm dev          # 开发模式（Vite热重载）
pnpm build        # 生产构建

# 质量检查
pnpm typecheck    # TypeScript类型检查
pnpm lint         # ESLint代码检查
pnpm test         # 运行单元测试

# 整个工作区
pnpm -r build     # 构建所有包
pnpm -r test      # 运行所有测试
```

---

## 📚 文档

| 文档 | 说明 |
|------|------|
| [⚡ 快速修复](./QUICK_FIX.md) | **Anki连接问题快速解决（必读！）** ⭐⭐⭐ |
| [🔧 修复指南](./ANKI_FIX_GUIDE.md) | Anki连接问题完整解决指南 |
| [🔍 诊断报告](./DIAGNOSIS_REPORT.md) | MCP诊断过程和技术分析 |
| [快速导入指南](./QUICK_IMPORT_GUIDE.md) | 快速导入模式完整使用指南（v0.3.0新增）⭐ |
| [UX改进说明](./UX_IMPROVEMENTS.md) | 快捷键/批量操作/智能记忆功能详解 |
| [项目状态](./PROJECT_STATUS.md) | 完整检查报告、构建状态、回滚指南 |
| [产品文档](./Anki助手chrome插件产品文档.md) | 产品规格和设计要求 |
| [开发指南](./AGENTS.md) | 技术栈、编码规范 |
| [构建说明](./BUILD.md) | 详细构建步骤 |

### 🆘 故障排除

遇到问题？按优先级查看：

1. **无法连接Anki** → [QUICK_FIX.md](./QUICK_FIX.md)（3分钟解决）
2. **详细诊断** → 运行 `./diagnose-anki-connection.sh`
3. **完整指南** → [ANKI_FIX_GUIDE.md](./ANKI_FIX_GUIDE.md)
4. **技术细节** → [DIAGNOSIS_REPORT.md](./DIAGNOSIS_REPORT.md)

---

## 🧪 测试

详细测试指南见 [TESTING.md](./TESTING.md)

```bash
# 单元测试
pnpm --filter extension test

# E2E测试
pnpm --filter extension-tests test:e2e

# 类型检查
pnpm typecheck
```

---

## 🔧 技术栈

- **TypeScript 5.x** - 类型安全
- **React 18** - UI框架
- **Zustand** - 轻量级状态管理
- **Vite + CRXJS** - 现代构建工具链
- **DOMPurify** - HTML安全清洗
- **Zod** - 运行时类型验证
- **Shadow DOM** - 样式隔离

---

## 🎯 功能状态

### ✅ 已完成

**核心功能：**
- ✅ Q/A智能识别（"问：" → "答："格式）
- ✅ 完整保留代码块格式（语法高亮、空格保留）
- ✅ Shadow DOM隔离的预览界面
- ✅ 卡片预览、编辑、合并、拆分
- ✅ AnkiConnect集成（获取卡组/模型列表）
- ✅ 卡组/模型选择器（搜索 + 置顶）
- ✅ 手动输入Tags
- ✅ 消息传递链路完整

**体验优化 (v0.2.0)：**
- ✅ 6个快捷键（导航/选择/提交）
- ✅ 批量操作工具栏（全选/删除）
- ✅ 智能记忆上次选择
- ✅ 选中项置顶 + 视觉标记
- ✅ 实时搜索过滤

**预期效果：**
- ⚡ 操作效率提升 70-80%
- 🖱️ 鼠标点击减少 80%
- 🔄 重复操作减少 90%

### 🚧 待完善

- ⚠️ 导入进度反馈（进度条 + Toast通知）
- ⚠️ 图片下载和媒体处理
- ⚠️ 错误详情显示和重试
- ⚠️ 设置页面完善
- ⚠️ 导入历史记录

---

## 📝 更新日志

### v0.3.0 (2025-01-08) - 快速导入革命 ⚡

**新增功能：**
- 🪟 **快速导入模式** - 轻量级350×450px弹窗（默认）
- 🖱️ **可拖动窗口** - 标题栏拖动 + 位置记忆
- 📢 **Toast通知系统** - 成功/失败即时反馈
- 🔄 **双模式架构** - 快速导入 ↔ 完整编辑器无缝切换
- ⚡ **效率革命** - 2-3秒完成导入（vs 15-20秒）

**技术改进：**
- AppContainer组件管理模式切换
- useDraggable hook实现拖动
- ToastManager管理通知
- 动画效果优化（slideInUp）

详见 [QUICK_IMPORT_GUIDE.md](./QUICK_IMPORT_GUIDE.md)

### v0.2.0 (2025-01-08) - 体验大幅提升 🚀

**新增功能：**
- ⌨️ **快捷键系统** - 全键盘操作支持
- 🛠️ **批量操作** - 一键全选/删除
- 🧠 **智能记忆** - 自动记住常用选择
- 🔍 **搜索过滤** - 快速查找卡组/模型
- ✓ **选中标记** - 视觉反馈优化

**修复问题：**
- ✅ 修复卡组选择器数据传递问题
- ✅ 修复代码块空格丢失问题
- ✅ 优化Q/A识别逻辑

详见 [UX_IMPROVEMENTS.md](./UX_IMPROVEMENTS.md)

### v0.1.0 (2025-01-08) - MVP完成

- ✅ 核心架构搭建
- ✅ Q/A识别重构
- ✅ Shadow DOM overlay
- ✅ AnkiConnect集成

---

## 📄 许可

MIT License

---

## 🤝 贡献

详见 [AGENTS.md](./AGENTS.md) 了解编码规范和技术要求。
