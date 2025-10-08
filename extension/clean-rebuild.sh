#!/bin/bash

echo "╔════════════════════════════════════════╗"
echo "║  🔧 一键完全重建扩展                   ║"
echo "╚════════════════════════════════════════╝"
echo ""

# 1. 清理所有缓存
echo "📦 1/5 清理缓存..."
rm -rf dist
rm -rf node_modules/.vite
rm -rf .cache
echo "   ✓ 缓存已清理"

# 2. 重新构建
echo ""
echo "🏗️  2/5 重新构建..."
pnpm build
if [ $? -ne 0 ]; then
  echo "   ❌ 构建失败"
  exit 1
fi
echo "   ✓ 构建成功"

# 3. 类型检查
echo ""
echo "📝 3/5 类型检查..."
pnpm typecheck
if [ $? -ne 0 ]; then
  echo "   ⚠️  类型检查失败（但继续）"
fi
echo "   ✓ 类型检查完成"

# 4. 验证关键文件
echo ""
echo "🔍 4/5 验证构建..."
if [ ! -f "dist/manifest.json" ]; then
  echo "   ❌ manifest.json 不存在"
  exit 1
fi

if [ ! -d "dist/assets" ]; then
  echo "   ❌ assets/ 目录不存在"
  exit 1
fi

# 检查是否有旧文件
if ls dist/assets/*Cr3jdNAs* 1> /dev/null 2>&1; then
  echo "   ⚠️  发现旧文件，正在删除..."
  rm -f dist/assets/*Cr3jdNAs*
fi

echo "   ✓ 构建文件验证通过"

# 5. 显示文件清单
echo ""
echo "📋 5/5 构建文件清单："
echo "   manifest.json: $(du -h dist/manifest.json | cut -f1)"
echo "   assets/: $(ls -1 dist/assets/*.js | wc -l) 个JS文件"
echo ""

# 6. 下一步提示
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 构建完成！"
echo ""
echo "📍 下一步（在Chrome中）："
echo "   1. 打开 chrome://extensions/"
echo "   2. 找到 'Anki Assistant'"
echo "   3. 点击 '移除' 按钮"
echo "   4. 点击 '加载已解压的扩展程序'"
echo "   5. 选择目录："
echo "      $(pwd)/dist"
echo ""
echo "⚠️  重要：必须先移除旧扩展，再重新加载！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
