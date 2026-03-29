# REQ-2026-013 Design

## Background

当前仓库已经有较完整的治理脚本，但缺少两层自动化保护：

- 核心脚本没有自动化测试，回归主要靠人工发现
- GitHub 没有 workflow 自动运行治理检查，提交时缺少统一门禁

这会导致规则和脚本即使存在，也无法保证在每次改动中被持续执行。

## Goal

- 为核心治理脚本建立仓库级自动化回归测试
- 将自动化测试、`docs:verify` 和 `check:governance` 接入 CI
- 把新的自动化约束写回入口文档和治理自检，防止以后再被移除

## Scope

### In scope

- 新增 `tests/` 下的 Node 内置测试
- 新增 `.github/workflows/` 下的 GitHub Actions workflow
- 更新 `package.json`、入口文档和 `scripts/check-governance.mjs`
- 产出本次增强的 code review / QA 报告

### Out of scope

- 引入第三方测试框架
- 为目标项目模板自动生成 CI workflow
- 覆盖所有历史脚本的全部边界条件

## Product Review

### User Value

- 解决的问题：治理脚本缺少自动化回归和 CI 门禁
- 目标用户：维护 Harness Lab 仓库的贡献者，以及依赖该模板稳定性的后续项目维护者
- 预期收益：核心治理能力从“手动执行”升级为“默认被自动检查”

### Recommendation

- Proceed

## Engineering Review

### Architecture Impact

- 影响模块：`package.json` 脚本约定、治理脚本导出方式、GitHub workflow、入口文档说明
- 依赖方向：继续使用 Node 内置能力，不增加外部依赖
- 需要新增或修改的边界：治理自检需要把“测试存在”和“CI workflow 存在”也纳入框架契约

### Verification

- 自动验证：
  - `npm test`
  - `npm run docs:verify`
  - `npm run check:governance`
- 人工验证：
  - 检查 GitHub Actions workflow 是否覆盖 push / pull_request
  - 检查测试是否覆盖 `req-cli`、`docs-verify` / `check-governance`、`harness-install`
- 回滚：
  - 回退新增测试、workflow 和相关文档更新

## Design

### 1. 用 Node 内置测试补核心回归

- 新增单一入口测试文件，避免跨平台 glob 问题
- 用临时目录做集成测试，覆盖：
  - `req-cli` 的 create / start / complete 流程
  - `docs-verify` / `check-governance` 在当前仓库的基本通过路径
  - `harness-install` 在临时 Git 仓库中的真实安装路径

### 2. 将自动化测试接入标准命令和 CI

- `package.json` 新增可直接运行的仓库级测试脚本
- 新增 GitHub Actions workflow，在 `push` 和 `pull_request` 上执行：
  - `npm test`
  - `npm run docs:verify`
  - `npm run check:governance`

### 3. 把自动化能力纳入治理契约

- `README.md` 明确仓库级自动化验证入口
- `CONTRIBUTING.md` 明确提交流程需要通过自动化测试和治理检查
- `CLAUDE.md` 明确模板仓库改动后的最小自动化验证集
- `scripts/check-governance.mjs` 校验测试文件、workflow 和测试脚本存在

## Implementation Checklist

- [x] 补齐 REQ 与设计稿
- [x] 新增仓库级自动化测试
- [x] 新增 CI workflow
- [x] 更新入口文档和治理自检
- [x] 运行真实验证并完成 REQ
