# Code Review: REQ-2026-091

## 状态

- ✅ Approved（自审；CLI 对抗测试、文档契约与真实 tarball 用户旅程均通过）

## Inputs

- REQ: `requirements/in-progress/REQ-2026-091-p0-executable-user-docs.md`
- Design: `docs/plans/REQ-2026-091-design.md`
- Files reviewed: `scripts/req-cli.mjs`、`.agents/skills/source-command-first-req/SKILL.md`、`requirements/REQ_TEMPLATE.md`、`context/tech/testing-strategy.md`、`README.md`、`tests/governance.test.mjs`
- Review basis: `reviews/harness-lab-review-2026-07-10.md` 的“用户可执行文档”P0

## Commands Run

- `node --check scripts/req-cli.mjs`
- `node --check tests/governance.test.mjs`
- `node --test tests/governance.test.mjs`
- `npm test`
- `npm run docs:impact`
- `npm run docs:verify`
- `npm run check:governance`
- `npm run harness:doctor`
- `env npm_config_cache=/private/tmp/harness-lab-npm-cache npm pack --dry-run --json --ignore-scripts`
- `git diff --check`

## Findings

### High

- 无未关闭高风险问题。
- 已关闭：纯中文/emoji 等无 ASCII 标题无法创建 REQ；现保留原标题并使用固定安全 `requirement` 后缀，REQ ID 保证唯一。
- 已关闭：显式 `--slug` 曾未经校验直接进入文件名，存在 `../`、空白和非规范路径输入面；现仅接受 lowercase ASCII kebab-case，非法输入在写文件前失败。
- 已关闭：README 的 mode 三行口号与 Hook 实现相反；现按所有实际读取 `harness-mode` 的 Hook 逐项记录当前 allow/warn/block 事实，并明确不是统一状态机。

### Medium

- 无未关闭阻塞问题。
- 已关闭：`/first-req` 声称识别非 JS 项目，却把 npm alias 当唯一入口；现优先使用 alias，缺失时回退已安装的直接 Node CLI。
- 已关闭：bugfix/feature/refactor 模板预填 Harness 仓库的 npm 命令，可能产生虚假验证；现要求填写目标项目真实命令，testing strategy 仅提供有条件的多生态候选。
- 已关闭：真实 fresh-install fixture 用 `--no-docs-gate` 完成 REQ，未证明 README 默认命令可执行；现先建立独立接入基线，再不带绕过参数执行默认 complete。

### Low / Residual Risk

- 固定 `requirement` / `experience` 后缀不做拼音转写，可读性低于人工英文 slug，但无依赖、确定且路径安全；标题语义保留在正文和 INDEX。
- 技术栈候选命令未被框架自动执行，这是有意信任边界；项目配置或维护者确认才可把命令写成验证事实。
- mode 仍由 Hook 分散实现；本 REQ 只让文档真实，P1 表驱动风险矩阵仍是独立架构项。

## Test Gaps

- 未自动操作真实 Claude Code `AskUserQuestion` UI；skill 内容通过契约测试，CLI 两种入口在 packed fixture 中运行。
- 未安装 Python/Go/Rust 工具链；本 REQ 验证的是“不猜测命令”的文档契约，不宣称这些生态命令已在任意项目通过。
- 未运行线上 npm registry；候选 tarball 使用本地离线 npm exec/install。

## Conclusion

- Approved。REQ-091 范围内的首次中文 REQ、技术栈中立验证、profile/mode 事实与 README 命令旅程均已闭合，可进入 QA/交付。
