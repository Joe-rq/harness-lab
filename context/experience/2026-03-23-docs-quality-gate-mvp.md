# 2026-03-23 Docs Quality Gate MVP

## 场景

Harness Lab 已经有治理结构检查，但对“代码更新后文档有没有同步”缺少自动 gate。

## 关联材料

- REQ：`requirements/completed/REQ-2026-003-docs-quality-gate-mvp.md`
- Design：`docs/plans/REQ-2026-003-design.md`
- Code Review：`requirements/reports/REQ-2026-003-code-review.md`
- QA：`requirements/reports/REQ-2026-003-qa.md`

## 问题 / 模式

- 只做结构检查时，README、命令名和本地路径引用可以过期而不被拦截
- 第一版规则如果不区分“核心文档”和“模板占位符 / 研究文档”，会产生大量误报
- 在治理检查里起子进程调用另一个 Node 脚本，在当前环境下不稳定

## 解决方案

1. 把文档质量检查抽成独立的 `npm run docs:verify`。
2. 先把校验范围收敛到 MVP：
   - 本地 Markdown 链接
   - 核心文档中的 `npm run` 命令
   - 核心文档中的关键路径引用
3. 对占位符和 glob 路径做显式忽略，避免模板文档自相矛盾。
4. `check:governance` 不再用子进程调用 `docs:verify`，而是直接复用同一份校验逻辑。

## 复用建议

- 以后增强 docs gate 时，优先增加可解释的规则，不要上来做黑盒语义判断
- 新增文档规则时，先跑一轮当前仓库，确认误报率可接受再收紧
- 如果后续要做 diff-aware 同步 gate，先定义“哪些代码区域对应哪些文档”的映射表
