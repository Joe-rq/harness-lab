# REQ-2026-057: feat: harness setup execution optimization

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
用户痛点：在 `D:\AI-work\MediAppHub` 这类真实项目中，业务 `package.json` 位于 `app/` 子目录，根目录没有 `package.json`。当前 `harness-install` 会完成 31 个最小治理文件的安装，但只能在报告中提示“未检测到 package.json”，后续步骤仍默认引导用户执行 `npm run req:create`，导致用户以为迁移缺失或安装不完整。
业务背景：Harness Lab 的定位是轻量治理层，不应默认完整镜像自身高级治理能力；但安装器必须把“装了什么、没装什么、下一步怎么执行”表达清楚，并支持常见 monorepo / app 子目录包结构。

## 目标
- 支持安装时显式选择目标 `package.json` 位置，覆盖业务包位于子目录的项目结构
- 在根目录缺少 `package.json` 时生成可执行的后续步骤和能力差距说明，避免继续提示不可用的 `npm run`
- 更新 `/harness-setup`、source-command skill 与 README，使迁移指令表达真实 profile 和 package 绑定行为
- 补充自动化测试覆盖根无 package、子目录 package 绑定和文档同步

## 非目标
- 不实现完整镜像安装，不默认迁移 `scope-guard`、`watchdog`、`risk-tracker` 等高级治理脚本
- 不创建目标项目根 `package.json`，除非未来单独提供显式参数和设计
- 不改变当前默认安装模块清单和冲突跳过策略
- 不引入新的 npm 依赖或网络分发动作

## 颗粒度自检
- [x] 目标数 ≤ 4？（4 个）
- [ ] 涉及文件数 ≤ 4？（预计 7 个；安装器、测试、README、command、skill、设计和报告共同构成同一个接入契约）
- [x] 涉及模块/目录 ≤ 4？（安装器、文档入口、测试、REQ 交付物）
- [x] 能否用一句话描述"解决了什么问题"？让 harness-setup 在真实子目录包项目中给出可执行安装结果，而不是只完成文件复制后留下不可执行的 npm 提示
- [x] 如果失败，能否干净回滚？可以回退安装器、文档、测试和本 REQ 交付物

## 范围
- 涉及目录 / 模块：
  - `scripts/harness-install.mjs`
  - `tests/governance.test.mjs`
  - `tests/req-status-json.test.mjs`
  - `README.md`
  - `.claude/commands/harness-setup.md`
  - `.agents/skills/source-command-harness-setup/SKILL.md`
  - `docs/plans/REQ-2026-057-design.md`
  - `requirements/reports/REQ-2026-057-*.md`
  - `context/experience/REQ-2026-057-feat-harness-setup-execution-optimization.md`
  - `context/invariants/INV-090-REQ-2026-057-feat-harness-setup-executio.md`
- 影响接口 / 页面 / 脚本：
  - `node scripts/harness-install.mjs --defaults`
  - `node scripts/harness-install.mjs --defaults --with-hook`
  - 新增 `--package-dir <dir>` / `--package-json <path>` CLI 参数
  - `requirements/reports/harness-setup-report.md`

### 约束（Scope Control，可选）

> Feature 型 REQ 强烈建议填写 Scope Control，防止功能蔓延。

**豁免项**：
- [ ] skip-design-validation（Feature 建议创建设计文档，除非改动很小）

**允许（CAN）**：
- 可修改的文件 / 模块：安装器参数解析、package 绑定定位、接入报告、README、harness-setup command、source-command skill、本 REQ 交付物
- 可新增的测试 / 脚本：扩展 `tests/governance.test.mjs`；允许修复阻塞完整验证的 Windows 测试路径问题；不新增运行时脚本

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：REQ 生命周期语义、hook 阻断规则、高级治理脚本默认安装清单
- 不可引入的依赖 / 操作：新增 npm 依赖、自动创建目标根 `package.json`、真实外部项目破坏性迁移、网络发布

**边界条件**：
- 时间 / 环境 / 数据约束：本地仓库验证，不依赖网络；MediAppHub 作为问题来源，不直接修改该仓库
- 改动规模或发布边界：保留现有 `--defaults` 行为，只新增显式 package 定位能力和更准确的报告/文档

## 验收标准
- [x] `harness-install` 支持 `--package-dir app` 和 `--package-json app/package.json`，并把治理脚本绑定到指定 package
- [x] 根目录没有 `package.json` 时，报告和终端后续步骤不再只提示不可执行的 `npm run`，而是提供 `node scripts/req-cli.mjs` fallback 和可选 package 绑定建议
- [x] 安装报告包含清晰的“能力差距 / 未绑定原因 / 下一步”信息，能解释默认安装不是完整镜像
- [x] README、`.claude/commands/harness-setup.md`、`.agents/skills/source-command-harness-setup/SKILL.md` 与真实安装器行为一致
- [x] `npm test`、`npm run docs:verify`、`npm run check:governance` 通过

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-057-design.md`（Feature 建议创建设计文档）
- 相关规范：`AGENTS.md`, `README.md`, `.claude/commands/harness-setup.md`, `.agents/skills/source-command-harness-setup/SKILL.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-057-code-review.md`
- QA：`requirements/reports/REQ-2026-057-qa.md`
- Ship：不适用（本次为模板仓库安装器与文档优化，无独立发布动作）
- Experience：`context/experience/REQ-2026-057-feat-harness-setup-execution-optimization.md`
- Invariant：`context/invariants/INV-090-REQ-2026-057-feat-harness-setup-executio.md`

## 验证计划
- 计划执行的命令：
  - `npm test`
  - `npm run docs:verify`
  - `npm run check:governance`
- 需要的环境：本仓库
- 需要的人工验证：检查接入报告和文档是否能解释根无 package / 子目录 package 的真实后续动作

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：功能是否完整实现？是否覆盖了核心场景？
- [x] 旧功能保护：新功能是否破坏了现有功能？
- [x] 逻辑正确性：边界情况是否处理？错误处理是否完备？
- [x] 完整性：是否有遗漏的子功能？
- [x] 可维护性：代码是否清晰？接口是否合理？

#### 对齐检查（record 阶段）
- [x] 目标对齐：实现是否服务于最初的用户痛点？
- [x] 设计对齐：实现是否符合设计文档？
- [x] 验收标准对齐：所有验收标准是否满足？

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 风险与回滚
- 风险：新增 package 定位参数可能让用户误以为治理文件也会安装到子目录；文档需明确只有 `package.json` 绑定目标可切换，治理文件仍安装到 Git 根目录
- 回滚方式：移除新增参数解析、package 定位逻辑、文档和测试改动，恢复 `updateTargetPackageJson(targetDir)` 只绑定根 package 的行为

## 关键决策
- 2026-05-11：Feature 型 REQ，建议创建设计文档
- 2026-05-11：本轮只做真实项目安装执行优化，不做高级治理能力完整镜像迁移

<!-- Source file: REQ-2026-057-feat-harness-setup-execution-optimization.md -->
