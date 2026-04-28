---
id: INV-036
title: 2026-04-06 4 实体规则的轻量级实现（深度思考案例）
status: draft
severity: medium
triggers:
  - glob: "scripts/**"
  - glob: "（4 实体规则说明）

## 深度思考过程

### 问题转换

**原始问题**：定义 REQ 颗粒度标准，将 4 实体规则纳入体系

**重新定义后的问题**：如何设计一个低认知负担的 REQ 拆分预警机制？

关键洞察：
- "计数实体"本身就有认知负担——要数清楚涉及哪些文件/模块，需要先理解整个改动范围
- 规则的价值在于"触发反思"，而非"精确执行"
- 当系统说"你改了 4 个文件"时，人会本能地想"是不是太多了？"这个反思本身就是价值

### 业界解法映射

| 领域 | 模式 | 映射到本问题 |
|------|------|-------------|
| IDE 代码检查 | 复杂度超标时标黄线 | 文件数超限时弹出提示 |
| PR 平台 | >400 行难 review | 修改文件数作为理解难度代理 |
| 负载均衡 | 健康检查 + 动态调整 | 监控完成时间，调整策略 |

最优转换：把"颗粒度定义"→转换为"认知负载预警"

### 轻量级方案

不是"定义标准"，而是：
1. **简单规则**：涉及 4+ 文件时提示
2. **技术实现**：PreToolUse hook 检测修改文件数
3. **人的角色**：确认是否真的需要这么多文件，而不是机械拆分

## 关键决策

- **决策 1：不创建 REQ-2026-033**
  这个问题不需要完整 REQ，只需要一个 hook 增强 + 文档一句话

- **决策 2：预警而非阻断**
  不是"超过 4 个就不允许"，而是"超过 4 个就问你一下"
  保留人的判断权，只增加一个反思触发点

- **决策 3：模糊计数**
  不精确定义"实体"是什么，用 git 追踪的修改文件数作为代理指标
  排除 requirements/ 和 docs/**"
  - glob: "bash
# req-check.sh 新增逻辑
MODIFIED_COUNT=$(git status --porcelain=v1 | grep -E '^\s*[MADRC]' | grep -vE 'requirements/|docs/**"
  - glob: "
╔══════════════════════════════════════════════════════════════╗
║                 ⚠️  SCOPE WARNING                             ║
╠══════════════════════════════════════════════════════════════╣

  Modified 5 files (excluding requirements/**"
confidence: medium
message: |
  ⚠️ INV-036: 2026-04-06 4 实体规则的轻量级实现（深度思考案例）
  来源: experience/2026-04-06-scope-warning-pattern.md
---

## 详细说明

## 解决方案

```bash
# req-check.sh 新增逻辑
MODIFIED_COUNT=$(git status --porcelain=v1 | grep -E '^\s*[MADRC]' | grep -vE 'requirements/|docs/' | wc -l)

<!-- 来源: context/experience/2026-04-06-scope-warning-pattern.md -->