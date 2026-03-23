# REQ-2026-001 Design

## Background

`harness-lab` 过去只有公开示例，没有把模板自身的整改工作纳入真实 REQ。
2026-03-23 的 peer review 指出了几个高优先级问题：悬空的 `.claude` 验证入口、`skills/` 缺少导航、`context/business/` 缺少最小业务概览、README 没有明确区分人类和 AI 的启动路径，以及缺少 `blocked / suspended` 示例。

## Goal

- 用一个真实 REQ 承接模板自身的 P0 / P1 整改
- 给模板仓库补上真实可执行的治理检查入口
- 提升 onboarding、skill 可发现性和 REQ 生命周期完整度

## Scope

### In scope

- 新增 `REQ-2026-001` 及其 code review / QA 报告
- 新增 `scripts/check-governance.mjs`，用于校验治理文件和索引一致性
- 将 `.claude/settings.local.json` 从悬空脚本改为真实治理检查命令
- 补 `skills/README.md`
- 补 `context/business/product-overview.md`
- 在 README 中区分人类维护者和 AI agent 的启动路径
- 补 `REQ-2026-901-suspended-example.md`
- 将本次经验沉淀回 `context/experience/`

### Out of scope

- 不把模板仓库伪装成业务运行时项目
- 不引入业务级 `lint / test / build / verify`
- 不在本轮处理术语对照、CI 接入说明和 context 弃用指南等 P2 项

## Product Review

### User Value

- 解决的问题：模板本身缺少真实实践闭环，导致可信度和可发现性不足
- 目标用户：首次接手模板的人类维护者，以及依赖索引恢复上下文的 AI agent
- 预期收益：模板不仅提供示例，还能展示“模板自身如何被治理”

### Scope

- Includes:
  - 入口文档、索引、示例和治理验证命令
- Excludes:
  - 目标项目的业务命令绑定
  - 发布流程之外的 P2 文档优化

### Acceptance

- [x] 仓库内出现一条真实完成的 REQ 链路
- [x] 模板仓库有真实治理检查命令
- [x] README 明确区分人类与 AI 的启动路径

### Risks and Dependencies

- 风险：治理检查脚本如果写得过死，后续改目录时会带来维护成本
- 依赖：Node.js 可用，用于运行 `scripts/check-governance.mjs`

### Recommendation

- Proceed

## Design Review

### User Flow

- 主路径：维护者先看 `AGENTS.md` 和 `requirements/INDEX.md`，再根据角色选择最短路径或完整路径
- 关键状态：真实 REQ、公开示例、blocked 示例三者在索引和 README 中都可被发现

### Standards Check

| Area | Status | Notes |
|------|--------|-------|
| Visual | Pass | 仅文档结构调整，无新增视觉系统 |
| Interaction | Pass | README 导航改为人类 / AI 双路径 |
| Accessibility | Pass | Markdown 文档和表格结构可直接阅读 |
| Responsive | Pass | 无页面布局变更 |

### Issues

- High: none
- Medium: `check-governance` 当前主要验证结构和关键文本，不验证全文语义质量
- Low: `product-overview.md` 既是模板示例也是仓库自身概览，后续接入方仍需替换

## Engineering Review

### Architecture Impact

- 影响模块：
  - 仓库入口文档与 REQ 索引
  - `.claude` 本地配置
  - `scripts/` 下的治理检查脚本
- 依赖方向：
  - 检查脚本只读取仓库文件，不写入外部状态
- 需要新增或修改的边界：
  - 为模板仓库自身增加 `check:governance` 命令，但不替换目标项目的真实验证链路

### Technical Decisions

1. 决策：新增 `npm run check:governance`，并保留 `lint / test / build / verify` 为 guard 脚本
   原因：模板仓库需要真实可执行的治理检查，但不能把业务 guard 伪装成通过
   备选方案：直接删除 `.claude` 验证入口

2. 决策：新增真实完成的 `REQ-2026-001`，同时保留 `REQ-2026-900 / 901` 作为公开示例
   原因：用真实实践区分模板治理与演示样本
   备选方案：继续只保留公开示例

3. 决策：把 blocked 示例放在 `requirements/in-progress/`
   原因：这与生命周期定义一致，也能演示“搁置仍留在 in-progress”这一约定
   备选方案：单独建 examples 目录

### Verification

- 自动验证：`npm run check:governance`
- 人工验证：
  - 检查 README 的人类 / AI 双路径
  - 检查 `skills/README.md`、`product-overview.md` 和 blocked 示例是否可发现
- 回滚：直接回退本次文档和脚本变更，不影响业务运行时
