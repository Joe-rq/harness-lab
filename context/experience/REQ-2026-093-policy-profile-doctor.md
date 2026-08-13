# 2026-07-11 风险策略、事件协议与安装事实应分层

## 场景

多个 Hook 都读取同一个 mode，但每个脚本自行分支会逐渐产生行为漂移；doctor 若不理解安装 profile，又会把“未选择的能力”误报成缺失。

## 关联材料

- REQ：`requirements/completed/REQ-2026-093-p1-hook-policy-profile-doctor.md`
- Design / ADR：`docs/plans/REQ-2026-093-design.md`、`docs/plans/REQ-2026-093-hook-policy-adr.md`
- QA：`requirements/reports/REQ-2026-093-qa.md`

## 关键决策

- policy 只输出中立的 action/effect/audit，Hook adapter 继续负责 Claude 事件 JSON、stderr 和上下文文案。
- profile record 描述“安装了什么”，mode 描述“风险如何处置”，两者不得合并成一个含混开关。
- doctor 优先验证确定性 record；旧项目只读推断并 warning，不静默写回猜测结果。
- 缺失选中能力是 fail，record 外完整模块是 warn；两者都应精确定位。
- README 风险表是代码矩阵的投影，必须用逐格测试和 consumer contract 防止漂移。

## 复用建议

- 集中决策不等于集中协议输出；跨 Hook 的共同事实放 policy，各平台适配留在边界层。
- 机器生成的安装画像不要写时间戳，才能支持幂等、diff 审核和未来安全升级。
- profile 校验必须同时检查字段、依赖闭包、能力列表和 overlay/module 一致性，不能只验证 JSON 可解析。
