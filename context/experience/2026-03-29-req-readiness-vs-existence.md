# REQ Ready != REQ Exists

## 场景

仅仅创建了 REQ 编号，并不代表这个 REQ 已经真正进入治理流程。`req:create` 生成的是骨架；如果背景、目标、验收标准仍是模板占位符，这个 REQ 只能算“存在”，不能算“可实施”。

## 经验

- 对治理对象不能只做“存在性检查”，还要做“可用性检查”
- `PreToolUse` 和生命周期命令如果采用不同校验标准，会留下可绕过的治理缝隙
- 空模板问题不应只在人工 review 时发现，应该在状态迁移前自动阻断

## 在 Harness Lab 中的落地

- `scripts/req-validation.mjs` 负责统一判断关键章节是否仍为模板
- `scripts/req-check.sh` 在 hook 路径复用这套规则
- `scripts/req-cli.mjs` 在 `req:start` 之前复用同一套规则

## 复用建议

- 新增治理门禁时，优先识别“存在”和“准备就绪”是不是两个不同层级
- 如果一个约束同时存在于 hook、CLI、CI 中，应优先抽成共享规则，而不是各自复制一份判断
