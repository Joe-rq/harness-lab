# REQ-2026-096 Design：代表性平台与 Claude Matcher 证据链

## 证据分层

| 声明 | 最低证据 | 不能替代它的证据 |
|------|----------|------------------|
| CI 编排完整 | workflow contract test | README 文案 |
| 平台可运行 | 对应 hosted runner 的成功 run identity | YAML 中出现 OS 名称 |
| Hook 配置合法 | 当前 Claude CLI `doctor` 成功 | JSON 可解析 |
| matcher 正确分发 | 真实交互 Hook event：Bash 命中、Read 未命中 | 直接向脚本注入 stdin |
| Hook 脚本行为正确 | 合成 stdin 自动化测试 | matcher dispatch smoke |

## CI 架构

```text
GitHub Actions matrix
  ├─ ubuntu + Node 20 ─┐
  ├─ macOS + Node 20 ──┼─ npm run ci:verify
  └─ windows + Node 20 ┘      ├─ repository tests
                              ├─ capability sync check
                              ├─ docs verify
                              ├─ governance check
                              ├─ doctor JSON/exit
                              └─ npm pack dry-run hygiene
```

`scripts/ci-verify.mjs` 使用 `spawnSync`/参数数组串行执行阶段，不依赖 `&&`、重定向或平台 shell。状态文件由 Node 调用 Git 后写入，避免 Windows shell 差异。每个阶段输出明确标题；失败立即以相同非零码退出。最终写一份机器可读、无时间戳或本机绝对路径的 summary，供 Actions artifact 上传。

## Matcher smoke

`scripts/claude-matcher-smoke.mjs` 提供两个模式：

1. 默认离线模式：把 matcher 解释为 anchored regular expression，验证 canonical `Write|Edit|NotebookEdit|Bash` 只命中四个工具；检查 settings.example、settings.local、Codex mirror 与 installer 生成产物中的命令/matcher。
2. `--evidence <jsonl> --claude-version <version>`：读取真实 Claude Hook logger 产生的 JSONL，要求恰有预期 Bash PreToolUse 命中，不允许 Read 出现在事件中，并输出证据摘要。

真实 smoke 在 `/tmp` fixture 中运行 interactive Claude Code：配置 canonical matcher 的只读 logger，提示先 Read fixture、再 Bash `pwd`。logger 只记录 stdin，不修改仓库；运行后把 event JSONL 交给 evidence 模式验证。`claude -p` 明确不参与，因为该模式不触发 PreToolUse。

## Workflow 证据

matrix job 名必须包含 OS 与 Node；`fail-fast: false` 保留其他平台结果。每格上传 `ci-evidence.json`，artifact 名包含 OS/Node。远端三格未实际运行前，REQ 保持未完成，不把静态 contract 当平台 pass。

## 安全与兼容

- CI runner 与 matcher verifier 零第三方依赖。
- smoke fixture 与 evidence 不进入 npm package；公开 CLI 只包含可复用 verifier，不包含本机日志。
- `.claude/settings.local.json` 与 `.codex/hooks.json` 的既有高级 Hook 保持一致；公开 `settings.example` 只验证基础 Hook。
- workflow 不需要写权限，继续使用 `contents: read`。

## 验证

- 自动化：workflow matrix/permissions/steps contract、platform-independent runner、matcher positive/negative、三类 config/installer fixture、恶意或不完整 evidence 拒绝。
- 本地：macOS `ci:verify`、Claude CLI doctor、真实 interactive dispatch。
- 远端：GitHub Actions 三个平台各一个成功 matrix result 与上传 artifact。
