# P12 Spec - 本福特定律前端检测仪

## 1. Summary

- **Project ID**: P12
- **Project Name**: 本福特定律前端检测仪
- **Goal**: 导入数值数据集，自动比对 Benford 首位数字分布，可视化异常检测
- **User Persona**: 调查记者 / 审计人员

## 2. Scope

- **In scope**:
  - 导入数值数据集
  - 自动比对 Benford 首位数字分布
  - 可视化异常检测
- **Out of scope**:
  - 后端代理或服务端逻辑
  - API Key 持久化存储

## 3. UX

- **Core workflow**: 用户输入 → 前端处理 → 结果展示
- **Inputs**: 数值数据 (CSV/手动输入)
- **Outputs**: 首位数字分布图 + 卡方检验结果
- **States**: empty (初始) / loading (处理中) / error (失败) / success (完成)

## 4. Functional Requirements

1. FR-1: 导入数值数据集
2. FR-2: 结果可视化展示
3. FR-3: 错误状态可见提示

## 5. Non-Functional Requirements

- **Performance**: 核心任务 3 分钟内完成
- **Accessibility**: 键盘导航、aria-label、焦点可见、WCAG AA 对比度
- **Privacy**: 本地处理优先，不默认上传数据
- **Browser support**: 现代 Chromium (Chrome 110+)

## 6. Dependencies

- **Libraries/CDNs**: Chart.js (CDN)
- **Local data**: 无

## 7. Risks & Mitigations

- **Risk**: 样本量太小导致分析无效
- **Mitigation**: 提示最低样本量要求

## 8. Acceptance Criteria

- [ ] 支持 CSV 解析
- [ ] 计算首位数字分布
- [ ] 绘制实际/理论对比图
- [ ] 输出偏离告警说明
- [ ] 纯静态页面可部署 GitHub Pages
- [ ] 移动端可用
- [ ] 隐私提示清晰可见
