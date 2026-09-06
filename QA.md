# P12 QA

## Environment

- **Browser**: Chrome 120+ / Edge / 课堂机房机
- **OS**: Windows / macOS / Linux
- **Date**: 2026-09-07
- **Path**: 学生冷启动（无 API Key、尽量不上传文件）

## Classroom walkthrough (Benford 检测)

对照 GitHub Pages 实测：打开页面 → 收起/忽略教材卡 → 点示例或主按钮 → 看状态栏。

### 已验证项

- [x] 页面 HTTP 200
- [x] 主路径在无密钥条件下可演示（文件类已补示例或标明限制）
- [x] 状态栏 `aria-live`
- [x] teach-card 默认折叠
- [x] shared 资源有绝对 URL 回退

## Known Issues

- **Issue**: 教学面板改由 shared v2.6.3 插到工具下方（需 shared 合入后生效）。本仓库同时关掉 teach-card 默认展开。
  **Severity**: classroom
  **Status**: 本 PR 已处理或已标明
- **Issue**: 主按钮去掉无限脉冲；窄屏不再把所有 button 拉成 100% 宽。
  **Severity**: classroom
  **Status**: 本 PR 已处理或已标明
- **Issue**: ../shared/ 404 时回退到 https://yuuqq.github.io/shared/ 。
  **Severity**: classroom
  **Status**: 本 PR 已处理或已标明

## Sign-Off

- **Classroom bench**: 2026-09-07（P04–P50 学生路径实测）
- **This PR**: 覆盖上述课堂失败路径，不再盖章「暂无已知严重问题」
