# REQ-2026-062 治理框架审计与安装器安全化经验

## 场景

当一个治理模板被真实业务项目长时间使用后，最容易出问题的不是单个脚本，而是完成态、报告、索引、安装器和 QA 证据之间的状态漂移。MediAppHub 的复盘说明，治理规则如果只停留在流程提醒里，后续 agent 很容易补报告、错编号、漏证据，甚至在安装模板时误清目标项目历史。

## 问题或模式

- completed REQ 不能只看文件位置，内部状态、标题 ID、source marker 和报告链接都需要一致。
- “测试通过”如果只写在结论里，后续无法判断命令、环境、人工验证是否真实发生。
- 安装器不能按编号范围清理目标项目文件，模板示例和目标项目真实历史必须可区分。
- 路线图预编号和并行 worktree 会让真实 REQ 编号漂移，显式编号必须能硬失败。

## 根因或关键判断

治理框架的关键资产是可审计交付物，不是命令数量。脚本应尽量只读、保守、可解释：发现问题时输出 finding，而不是自动修历史；安装器默认保留目标历史，只有 marker 或明确选项才能清理模板数据。

## 解决方案

- 把完成态审计集中到 `scripts/req-audit.mjs`，统一输出 `{ ok, findings }`，供 CLI、`req:complete`、`check:governance`、`governance:health` 复用。
- `req:complete` 对目标 REQ 使用 strict audit，全量历史审计保留 warning 模式，避免新规则一次性阻断旧历史。
- QA 报告模板和 `auto-qa` 固定 `## 验证证据`，并把人工/浏览器证据作为可解析契约。
- 安装器默认只复制/跳过/保留，不删除目标历史；`--dry-run` 先展示计划，`--clean-template-history` 只处理可识别模板历史。
- `req:create --id` 对显式编号先做占用检查，重复编号硬失败，减少路线图和实际 REQ 映射漂移。

## 后续项目如何复用

- 给治理框架新增规则时，先定义 finding code、severity 和 JSON 输出，再接入具体门禁。
- 对历史仓库启用新强规则时，区分 targeted strict audit 和 all-mode historical warning，避免治理升级变成批量历史重写。
- 安装器涉及删除时，默认策略应是保留；清理必须依赖 marker/hash 或显式用户选项。
- QA 报告必须记录命令、环境、结果、关键输出摘要和人工/浏览器证据，不能只写“通过”。

## 相关交付物

- REQ：`requirements/completed/REQ-2026-062-governance-framework-audit-and-installer-hardening.md`
- 设计稿：`docs/plans/REQ-2026-062-design.md`
- Code Review：`requirements/reports/REQ-2026-062-code-review.md`
- QA：`requirements/reports/REQ-2026-062-qa.md`
