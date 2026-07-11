# Code Review: REQ-2026-090

## 状态

- ✅ Approved（自审；对抗场景和回归门禁均通过）

## Inputs

- REQ: `requirements/in-progress/REQ-2026-090-p0-canonical-path-multi-target-guard.md`
- Design: `docs/plans/REQ-2026-090-design.md`
- Diff / files reviewed: `scripts/write-target-policy.mjs`、`scripts/req-check.js`、`scripts/scope-guard.mjs`、`scripts/harness-install.mjs`、`package.json`、`tests/governance.test.mjs`、`README.md`
- Review basis: `reviews/harness-lab-review-2026-07-10.md` 的 P0 路径与多目标门禁项

## Commands Run

- `node --check scripts/write-target-policy.mjs`
- `node --check scripts/req-check.js`
- `node --check scripts/scope-guard.mjs`
- `node --test tests/governance.test.mjs`
- `npm test`
- `npm run docs:verify`
- `npm run check:governance`
- `npm run harness:doctor`
- `env npm_config_cache=/private/tmp/harness-lab-npm-cache npm pack --dry-run --json --ignore-scripts`
- `git diff --check`

## Findings

### High

- 无未关闭高风险问题。
- 已关闭：两个 Hook 各自维护写命令识别逻辑，导致同一 Bash 输入在白名单与 scope 判断中产生不同结果；现统一使用共享策略模块。
- 已关闭：只检查首个写目标，允许合法目标掩盖后续越界目标；现所有目标必须同时通过治理白名单或 scope。
- 已关闭：lexical path 与字符串前缀判断可被 `..`、目录前缀碰撞和符号链接祖先绕过；现通过 nearest-existing-ancestor realpath 与 `path.relative` 做 containment。
- 已关闭：事件 `cwd` 位于仓库子目录或无效目录时可能选错根目录；现使用参数化 `git -C`，失败时回退进程仓库，并有 fixture 覆盖。

### Medium

- 无未关闭阻塞问题。
- 已关闭：动态变量、glob 或缺少目标的已识别写命令可能被当作纯读；现输出 `unresolved`，在显式 scope/只读边界下 fail closed。
- 已关闭：scope-guard 未统一尊重 global/worktree exemption；现两种豁免均在共享路径判断前显式放行并由真实 worktree fixture 验证。
- 已关闭：非字符串直接文件路径可能导致 Hook 崩溃；现返回结构化 unresolved，不抛异常。

### Low / Residual Risk

- 共享 tokenizer 是明确支持模式的非求值解析器，不是完整 POSIX/PowerShell parser；解释器内部写入、命令替换和任意自定义命令不在能力声明内。
- 不存在目标使用最近现有祖先 realpath，可防现有符号链接逃逸，但 Hook 不是 OS 沙箱，仍存在 TOCTOU、硬链接及上游不触发 Hook 的平台边界。
- 跨 Windows/Linux 的实机差异属于后续 P1 CI 矩阵；本轮已通过反斜杠、前缀碰撞和路径归一化 fixture 固化平台中立语义。

## Test Gaps

- 未实现通用 shell AST、PowerShell 或任意解释器数据流分析；README 明确说明边界。
- 未执行真实恶意并发改写；此类强安全需求应由文件权限、容器和 CI 侧校验兜底。
- 本 REQ 未改动 mode/profile 风险矩阵，避免把 P1 架构项冒充为路径门禁完成。

## Conclusion

- Approved。REQ-090 声明支持的写入模式已实现共享分类、canonical containment、全目标决策与显式歧义策略，可进入 QA 和交付收口。
