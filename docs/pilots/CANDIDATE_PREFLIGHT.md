# P1 Pilot Candidate Preflight（只读）

检查日期：2026-07-12。此文件只记录候选事实，不代表已授权接入，也不计入 pilot observation。

## 候选结论

| Type | Candidate | Git state | Existing governance | Real verification | Recommendation |
|------|-----------|-----------|---------------------|-------------------|----------------|
| JavaScript | `studymate-agent` | clean；最近提交 2026-07-09 | 已有面向 agent 的 `AGENTS.md`，无 Harness REQ 索引 | `npm run build`、`npm test`、`npm run smoke` | 推荐；活跃、边界清楚，但接入时必须保留并合并现有 AGENTS 规则 |
| Python | `rag-agent-showcase` | clean；最近提交 2026-07-09 | 已有 `CLAUDE.md`，无 Harness REQ 索引 | `uv run pytest tests/ -q`；`uv run python verify.py`（可能涉及模型/数据，需先确认） | 推荐；单 Python 项目且测试声明全 mock，接入时保留 CLAUDE 领域规则 |
| Monorepo | `archive/MiroFish` | clean；最近提交 2026-01-17 | root `AGENTS.md`，无 Harness REQ 索引 | frontend `npm run build`；backend 有 pytest dev 依赖但 root 无 test alias | 不首选；项目归档且缺少真实 repeat-use 意图，除非用户确认重新启用与两个真实任务 |
| Monorepo backup | `MediAppHub` | 仅本地 progress 变更 | 已有完整 Harness 历史 | `app:lint`、`app:test`、`app:build`、`server:test`（需 PostgreSQL） | 适合 upgrade/长期观察，不适合 fresh-adoption；可作为 monorepo pilot 但必须保留现有状态并披露样本非新接入 |

## 冲突与风险

### JavaScript

- 现有 `AGENTS.md` 已包含架构、安全、测试与新增 agent 规则，不能让 installer 的模板文件覆盖或简单跳过后形成双入口矛盾。
- 安装前先做 `--dry-run`，接入 REQ 应把 Harness 启动协议包在现有项目规则外层，并以 `build + test + smoke` 为真实验证。
- 两个业务任务需由维护者从项目 backlog 选择；“接入 Harness”与“补 pilot 文档”不算周期。

### Python

- `pyproject.toml` 要求 Python 3.10–3.12，使用 uv；不能自动写 npm 业务命令作为真实验证。
- `verify.py` 的外部依赖边界需先实际运行/审阅；最低离线证据优先 `uv run pytest tests/ -q`。
- 现有 CLAUDE 记录了 mock 与 `chunk_overlap=0` 不变量，应保留到 context/tech，而不是被通用模板稀释。

### Monorepo

- MiroFish 的 backend/frontend 验证不对称，且位于 archive；缺少第二周主动复用意图会直接违反完成标准。
- MediAppHub 已有治理历史，当前 `.claude/progress.txt` 属用户状态；只能走 safe upgrade dry-run/backup，不可 fresh reset。
- 若选择 MediAppHub，报告必须标记为 existing-adoption/upgrade 样本，不能与另两项 fresh adoption 直接平均首个 REQ 用时。

## 待用户决定

1. 是否授权修改推荐的 JavaScript 与 Python 项目。
2. monorepo 选择重新启用 MiroFish，还是把 MediAppHub 作为 upgrade pilot。
3. 每个项目各两个真实业务任务；如果目前没有任务，应延后 pilot，而不是制造治理型假任务。

授权后仍先执行安装 dry-run 和 baseline diff，任何既有 dirty state、入口文档或本地设置冲突都需要逐项确认。
