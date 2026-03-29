# REQ-2026-013: Governance automation tests and CI gate

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
当前 Harness Lab 已有可执行的治理脚本和仓库自检能力，但它们仍主要依赖维护者手动执行：

- 没有仓库级自动化测试，核心脚本缺少回归保护
- 没有 GitHub Actions workflow 自动运行 `npm run docs:verify` / `npm run check:governance`
- “规则存在”与“提交时一定被执行”之间仍有空档

这使得治理框架本身仍停留在“高质量模板”层，而没有进入“自动化守门”的阶段。

## 目标
- 为 Harness Lab 仓库本身补齐自动化测试
- 将核心治理检查接入 CI，形成 push / pull request 门禁
- 把自动化测试和 CI 要求同步写回入口文档与治理自检

## 非目标
- 不引入第三方测试框架或额外 npm 依赖
- 不为目标业务项目自动生成 CI 配置
- 不改变治理协议本身的判断逻辑

## 范围
- 涉及目录 / 模块：`tests/`, `.github/workflows/`, `package.json`, `README.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `scripts/`
- 影响接口 / 页面 / 脚本：`npm test`, `npm run docs:verify`, `npm run check:governance`, GitHub Actions workflow

### 约束（Scope Control，可选）
> 在需要约束 agent 或协作者行为边界时填写；没有明确边界要求时可留空。

**允许（CAN）**：
- 可修改的文件 / 模块：核心治理脚本的导出方式、package scripts、入口文档、治理自检规则
- 可新增的测试 / 脚本：Node 内置测试文件、GitHub Actions workflow

**禁止（CANNOT）**：
- 不可引入 Jest / Vitest 等第三方测试依赖
- 不可用弱化断言或跳过关键路径的方式伪造测试覆盖

**边界条件**：
- 时间 / 环境 / 数据约束：本地验证需依赖 Node.js、Git 和临时测试目录；CI 目标环境以 GitHub Actions Ubuntu runner 为准
- 改动规模或发布边界：仅覆盖仓库级治理自动化，不扩展到目标项目模板生成新的 workflow

## 验收标准
- [x] `npm test` 可在本仓库运行，并覆盖核心治理脚本的回归场景
- [x] GitHub Actions workflow 在 push / pull request 上运行 `npm test`、`npm run docs:verify`、`npm run check:governance`
- [x] `README.md` / `CONTRIBUTING.md` / `CLAUDE.md` 明确仓库级自动化验证入口
- [x] `scripts/check-governance.mjs` 对自动化测试与 CI 门禁建立最小存在性约束

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-013-design.md`
- 相关规范：`AGENTS.md`, `CLAUDE.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-013-code-review.md`
- QA：`requirements/reports/REQ-2026-013-qa.md`
- Ship：不适用（仓库级治理增强，无独立发布动作）

## 验证计划
- 计划执行的命令：
  - `npm test`
  - `npm run docs:verify`
  - `npm run check:governance`
- 需要的环境：Node.js、Git、本地文件系统可写临时目录
- 需要的人工验证：检查 workflow 配置是否覆盖 push / pull request 场景

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：如果测试过度依赖当前工作区状态，可能导致本地与 CI 结果不稳定
- 回滚方式：逐文件回退测试、workflow 和文档改动，恢复手动验证路径

## 关键决策
- 2026-03-29：由 `req:create` 自动生成骨架，待补充具体内容
- 2026-03-29：优先采用 Node 内置测试能力，避免为治理模板引入额外依赖

<!-- Source file: REQ-2026-013-governance-automation-tests-and-ci-gate.md -->
