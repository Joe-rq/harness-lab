# REQ-2026-088 Code Review：第二项目实验 3 缺陷修复

## 状态
- ✅ 通过（自审）

## 范围合规
- 改动限于声明范围：`req-validation.mjs`（hasExemption 宽松）/ `harness-install.mjs`（appendGitignore + cli.files doctor + packageScripts）/ `tests/governance.test.mjs`（2 回归）/ `README.md`
- 未触碰 CANNOT：req-cli.mjs / event-store.mjs / harness-doctor.mjs 本体 / REQ_TEMPLATE.md / .codex/hooks.json / .claude/settings*.json

## 主要发现
1. **#2 标题宽松**：`hasExemption` 精确取不到 section 时，回退用 `### 约束` 前缀正则。兼容 `### 约束（Scope Control）` / `### 约束（Scope Control，可选）` / `### 约束`。不删模板"，可选"推荐写法。
2. **#3 .gitignore**：`appendGitignore` 幂等追加（标记段 `# Harness Lab 运行时状态` 检查），参照 harness-lab/.gitignore line 32-43。install 流程无条件调用（cli 模块也产生 .req-exempt 等状态）。
3. **doctor 传播**：`modules.cli.files` 加 `harness-doctor.mjs` + `packageScripts` 加 `harness:doctor`。目标项目默认装（cli 模块默认 true）→ 可跑 OPT-1B 三自检。
4. **appendGitignore export**：为测试暴露（harness-install 已 export copyFiles/configureHook 等，一致）。

## 风险与回滚
- 宽松匹配误识别其他 `### 约束` 段（罕见，REQ 只一个约束段）→ 对冲：仍要求"约束"关键词。
- 回滚：三处独立还原（hasExemption 还原精确 / 移除 appendGitignore 调用 / cli.files 移除 doctor）。

## 结论
3 个实验驱动缺陷修复完成。harness-lab 接入摩擦降低（标题不再静默失效 / gitignore 自动配 / doctor 可用）。剩余 #4（complete 强制报告）/ #5（docs gate）为设计取舍，不修。
