# 2026-07-11 安全升级先证明“可以覆盖”，再考虑合并

## 场景

脚手架的 skip-existing 能保护用户文件，却会让旧模板永久停留；直接 force update 又无法区分用户修改与旧版本。完整自动三方合并在没有真实冲突样本时成本和风险都过高。

## 关联材料

- REQ：`requirements/completed/REQ-2026-094-p1-safe-upgrade-v1.md`
- Design / ADR：`docs/plans/REQ-2026-094-design.md`、`docs/plans/REQ-2026-094-safe-upgrade-adr.md`
- QA：`requirements/reports/REQ-2026-094-qa.md`

## 关键决策

- capability/profile 决定候选范围，ownership hash 证明旧 baseline；两者同时满足才允许覆盖。
- 无 baseline 的已有不同内容不猜测，一律冲突；安全项可以部分升级，但 complete version 不推进。
- backup 必须先于任何写入，payload 自带 hash；restore 也要可回滚，不能把“恢复”当成天然安全操作。
- core/default profile id 是用户意图，升级时按新 manifest 重算；否则新增模块永远无法进入旧安装。
- stale 上游文件先保留并解除 ownership，不在 v1 传播删除。

## 复用建议

- 所有权系统的核心不是记录“哪些路径像我的”，而是记录“我能证明哪些字节来自哪个版本”。
- dry-run 和 apply 必须共用同一 planner，不能维护两套判断逻辑。
- 在单用户系统里仍应写前 rehash；它成本很低，却能显著缩小计划后变化的覆盖窗口。
- 没有历史 baseline 时，冲突多是合理结果，不应为了看起来顺滑而牺牲用户数据。
