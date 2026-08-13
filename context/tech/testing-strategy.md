# Testing Strategy

## 目标

描述目标项目的真实验证链路，让任何接手的人或 agent 都知道应该运行什么、看到什么结果才算通过。

## 最低要求

- 列出真实可执行的命令
- 说明每个命令验证的范围
- 说明哪些验证需要本地环境、测试数据或外部依赖
- 说明哪些检查是阻塞项

## 建议模板

先检查目标仓库实际存在的配置和脚本，再选择下表中适用的行。以下命令都是条件示例，不代表 Harness Lab 已替目标项目配置；不要执行或记录仓库中不存在的命令。

### Command Matrix
| Ecosystem signal | Candidate command (only if configured) | Purpose | Blocking | Notes |
|------------------|----------------------------------------|---------|----------|-------|
| `package.json` | `npm run lint` / `npm test` / `npm run build` / `npm run verify` | JavaScript/TypeScript 项目检查 | 待确认 | 以 `scripts` 中真实存在的入口为准 |
| `pyproject.toml` / `setup.py` | `pytest` / 项目自带 task runner | Python 测试 | 待确认 | 先确认依赖与配置，不默认假设 pytest 已安装 |
| `go.mod` | `go test ./...` | Go 测试 | 待确认 | 只在模块与所需服务就绪时采用 |
| `Cargo.toml` | `cargo test` | Rust 测试 | 待确认 | 以 workspace/package 配置为准 |
| 其他 | 项目 README、CI 或维护者确认的命令 | 项目真实验证 | 待确认 | 无命令时明确记录缺口，不编造绿灯 |

### Environment Prerequisites
- 需要的环境变量：
- 需要的测试数据：
- 需要启动的服务：

### Manual Verification
- 需要人工确认的流程：
- 验证方法：
- 通过标准：

## 模板仓库补充说明

如果当前仓库本身是 Harness Lab 模板，可以额外提供 `npm run check:governance` 这类治理检查命令。
它用于验证索引、示例、报告和配置的一致性，不替代接入项目自己的 `lint / test / build / verify`。

### Harness Lab 代表性矩阵

模板仓库的单一 CI 入口是：

```bash
npm run ci:verify
```

它按阶段运行 tests、capability、docs、governance、doctor、pack；不依赖 Bash 的 `&&` 或重定向来编排阶段。GitHub Actions 在 `ubuntu-latest`、`macos-latest`、`windows-latest` 上固定 Node 20，并用 `--require-node-major 20` 防止 setup 漂移。每格必须有成功 run identity 和 `harness-ci-evidence.json` 才能作为平台通过证据；静态 workflow、平台分支单测或本地其他 Node 版本不能替代 hosted runner 结果。

Claude Hook 也要拆开验证：

- 合成 stdin：验证 Hook 脚本收到事件后的 allow/warn/block 行为。
- `harness:matcher-smoke -- --doctor`：验证当前 Claude CLI 能读取配置。
- interactive dispatch：先 Read、再 Bash；canonical write matcher 的 logger 只能收到 Bash。记录 CLI 版本和原始 JSONL，再用 `--evidence` 验证。

`claude -p` 不触发 PreToolUse，不能用于 matcher smoke。真实 interactive smoke 需要已认证的 Claude Code；未认证时只能记录为阻塞，不能用离线正则测试冒充通过。

### 外部 pilot

跨项目验证遵循 `docs/pilots/README.md`。JavaScript、Python、monorepo 各自使用项目真实命令，不能用 Harness Lab 的 `npm test` 代替业务验证。每个 pilot 至少两个真实业务 REQ、一次跨会话恢复和 14–28 天 observation；原始 `.harness/pilot/` 保持 gitignored，只有 `pilot:observe summary` 的脱敏结果进入跨项目结论。collector 的 fixture 测试只证明指标实现，绝不计入六个真实周期。

## 注意

如果项目当前没有真实命令，先补命令或明确记录缺口，不要把占位脚本当成验证链路。
