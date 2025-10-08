# 🔨 构建指南

## 快速开始

### 方法1：完整构建（推荐）

```bash
# 1. 进入项目根目录
cd /home/100_Project/anki_plu

# 2. 安装依赖（如果还没安装）
pnpm install

# 3. 构建扩展
cd extension
pnpm build

# 完成！构建产物在 extension/dist/ 目录
```

### 方法2：使用工作区命令

```bash
# 在项目根目录
cd /home/100_Project/anki_plu

# 安装依赖
pnpm install

# 构建扩展（从根目录）
pnpm --filter extension build

# 或构建所有包
pnpm -r build
```

---

## 📦 构建输出

构建成功后，在 `extension/dist/` 目录会看到：

```
dist/
├── manifest.json           # 扩展清单
├── options.html            # 设置页面
├── test.html              # 测试页面
├── service-worker-loader.js # Background script
├── icons/                 # 图标
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── assets/                # 打包的JS文件
    ├── index.ts-*.js      # Content script
    ├── jsx-runtime-*.js   # React运行时
    ├── preferences-*.js   # 共享代码
    └── ...
```

---

## 🚀 加载到Chrome

### 步骤1：打开扩展管理页面

在Chrome地址栏输入：
```
chrome://extensions/
```

或者：
1. 点击Chrome菜单 (⋮)
2. 更多工具 → 扩展程序

### 步骤2：启用开发者模式

在页面右上角，打开"**开发者模式**"开关

### 步骤3：加载扩展

1. 点击"**加载已解压的扩展程序**"按钮
2. 浏览到 `/home/100_Project/anki_plu/extension/dist` 目录
3. 选择这个目录，点击"选择"

### 步骤4：验证安装

你应该看到：
- ✅ 扩展名称：**Anki Assistant**
- ✅ 版本：**0.1.0**
- ✅ 状态：已启用
- ✅ 无错误提示

---

## 🔄 开发模式（热重载）

如果你要修改代码，使用开发模式：

```bash
cd /home/100_Project/anki_plu/extension

# 启动开发服务器（带热重载）
pnpm dev
```

这会：
- ✅ 监听文件变化
- ✅ 自动重新构建
- ✅ 但你仍需要在Chrome中**刷新扩展**

---

## 🧪 验证构建

### 检查文件

```bash
# 查看构建产物
ls -lh extension/dist/

# 应该看到
# manifest.json
# options.html
# test.html
# service-worker-loader.js
# assets/
# icons/
```

### 检查Service Worker

1. 在 `chrome://extensions/` 页面
2. 找到 "Anki Assistant"
3. 点击 "**service worker**" 蓝色链接
4. 应该看到控制台输出：
   ```
   [background] Service worker installed
   ```

### 检查Content Script

1. 打开任意网页
2. 按 F12 打开开发者工具
3. 在控制台输入：
   ```javascript
   window.__ankiAssistantTrigger
   ```
4. 应该显示 `ƒ triggerCapture() { ... }`

---

## 🐛 常见问题

### Q1: `pnpm: command not found`

**安装pnpm**：
```bash
npm install -g pnpm

# 或使用npm代替
cd extension
npm install
npm run build
```

### Q2: 构建失败 - 依赖错误

**解决方法**：
```bash
# 清除node_modules重新安装
cd /home/100_Project/anki_plu
rm -rf node_modules extension/node_modules
pnpm install
cd extension
pnpm build
```

### Q3: Chrome显示扩展错误

**检查manifest.json**：
```bash
cd extension/dist
cat manifest.json | grep -i error

# 应该没有"error"字样
```

**重新构建**：
```bash
cd /home/100_Project/anki_plu/extension
rm -rf dist
pnpm build
```

### Q4: Service Worker注册失败

**错误**：`Service worker registration failed`

**解决方法**：
1. 确保已运行最新构建
2. 在 `chrome://extensions/` 点击刷新
3. 检查Service Worker控制台是否有错误

### Q5: 修改代码后没效果

**每次修改代码后需要**：
```bash
# 1. 重新构建
cd extension
pnpm build

# 2. 在Chrome中刷新扩展
# chrome://extensions/ → 点击刷新图标

# 3. 刷新测试页面 (F5)
```

---

## 📊 构建脚本说明

```bash
# 生产构建（压缩、优化）
pnpm build

# 开发模式（源码映射、热重载）
pnpm dev

# 类型检查
pnpm typecheck

# 代码检查
pnpm lint

# 运行测试
pnpm test

# 格式化代码
pnpm format
```

---

## 🎯 完整构建流程（从零开始）

```bash
# 1. 克隆/进入项目
cd /home/100_Project/anki_plu

# 2. 安装依赖
pnpm install

# 3. 构建扩展
cd extension
pnpm build

# 4. 验证构建
ls -la dist/

# 5. 在Chrome中加载
# chrome://extensions/
# → 开发者模式
# → 加载已解压的扩展程序
# → 选择 extension/dist 目录

# 6. 测试
# - 打开任意网页
# - 刷新页面 (F5)
# - 选中文字
# - 右键 → "发送到 Anki" 或 Alt+A
```

---

## 📝 构建检查清单

在加载扩展前，确认：

```bash
✓ 运行了 pnpm install
✓ 运行了 pnpm build（在extension目录）
✓ extension/dist/ 目录存在
✓ extension/dist/manifest.json 存在
✓ extension/dist/assets/ 有JS文件
✓ extension/dist/icons/ 有图标文件
```

---

## 🔍 调试技巧

### 查看构建日志

```bash
cd extension
pnpm build 2>&1 | tee build.log

# 检查是否有错误
grep -i error build.log
```

### 查看打包大小

```bash
cd extension/dist
du -sh assets/*

# 应该看到类似：
# 15K   assets/index.ts-*.js
# 50K   assets/index.ts-*.js
# 142K  assets/jsx-runtime-*.js
```

### 验证TypeScript

```bash
cd extension
pnpm typecheck

# 应该没有输出（表示无错误）
```

---

## 🚀 生产构建

如果要发布到Chrome Web Store：

```bash
cd extension

# 确保是生产模式
NODE_ENV=production pnpm build

# 打包
cd dist
zip -r ../anki-assistant-v0.1.0.zip .

# anki-assistant-v0.1.0.zip 可以上传到商店
```

---

## 💡 提示

1. **每次修改代码后**：
   - 重新运行 `pnpm build`
   - 在Chrome中刷新扩展
   - 刷新测试的网页

2. **开发时使用**：
   - `pnpm dev` 自动重新构建
   - 但仍需手动刷新扩展

3. **测试前确保**：
   - Service Worker已启动（无错误）
   - Content Script已注入（刷新页面）
   - 右键菜单出现"发送到 Anki"

4. **遇到问题时**：
   - 查看 Service Worker 控制台
   - 查看网页控制台 (F12)
   - 检查 `chrome://extensions/` 是否有错误

---

## ✅ 构建成功标志

```bash
# 构建输出应该包含：
✓ X modules transformed
✓ built in XXXms
✓ 无错误信息
✓ dist/ 目录已创建

# Chrome应该显示：
✓ 扩展已启用
✓ 无错误徽章
✓ service worker 可点击

# 功能应该正常：
✓ 右键菜单有"发送到 Anki"
✓ Alt+A 快捷键工作
✓ 选中文字后触发显示overlay
```

---

现在开始构建吧！🚀
