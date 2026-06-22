# REQ-2026-087: OPT-3 — 经验文档自动草稿（聚合 commit/报告/事件账本）

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景
`req:experience` 当前生成空模板手填，是 REQ 完成路径上最大摩擦点之一——"完成摩擦"是同类工具被弃用的主因（OPT-3 背景原话）。实证：REQ-2026-085 / 086 都用了 `--skip-experience`，并非没有可沉淀经验，而是手填成本高于感知收益，导致 `--skip-experience` 被滥用。

`progress.txt` 已明确"修治理工具摩擦 + §7 采数工作流，不开任务图"。本 REQ 正是修一个已亲历、高频、低风险的摩擦点：把 `req:experience` 从"空模板手填"改为"脚本聚合草稿 + 人工确认"，在不降低沉淀质量的前提下降低完成税。

## 目标
1. `req-cli.mjs experience` 改为聚合生成预填草稿（**纯脚本聚合，不调 LLM**，守零依赖）：
   - REQ 文件：标题、背景、目标、验收勾选状态、关键决策、临时实现与债务
   - `git log --grep <REQ-ID>`：关联 commit 列表 + 改动文件统计
   - `requirements/reports/<REQ-ID>-*.md`：review/QA/ship 结论行
   - 事件账本（复用 `event-store.mjs` 读取 API）：REQ 生命周期时间线、blocked 记录
2. 草稿头部插入 `<!-- AUTO-DRAFT: 以下内容为脚本聚合，需人工确认后删除本标记 -->`。
3. `req:complete` 检测到 AUTO-DRAFT 标记时输出**提醒**（不阻断——经验质量靠人工确认兜底，不靠门禁；遵守"警告优先于阻断"）。
4. 无 git 历史 / 无报告时优雅降级为现有空模板行为。

## 非目标
- 不调 LLM（守零依赖原则；纯脚本聚合）。
- 不改 experience 模板结构（只预填内容，不改格式）。
- 不把 AUTO-DRAFT 设为阻断（人工确认兜底，不靠门禁强制）。
- 不追溯改写存量 experience 文档（只对新调用 `req:experience` 生效）。
- 不做 OPT-4（不变量宪法化）——先靠 OPT-3 攒真实 experience 素材。

## 颗粒度自检
- [x] 目标数 ≤ 4？（4）
- [x] 涉及文件数 ≤ 4？（3：scripts/req-cli.mjs / tests/governance.test.mjs / README.md）
- [x] 涉及模块/目录 ≤ 4？（2：scripts/ + tests/ + 根 docs）
- [x] 能否用一句话描述"解决了什么问题"？能——把 req:experience 从空模板手填改为脚本聚合草稿，降低完成摩擦、抑制 --skip-experience 滥用。
- [x] 如果失败，能否干净回滚？能——experience 命令还原为空模板生成。

## 范围
- 涉及文件：
  - `scripts/req-cli.mjs`（`experience` 子命令聚合草稿 + `complete` 检测 AUTO-DRAFT）
  - `tests/governance.test.mjs`（OPT-3 回归：聚合草稿 / AUTO-DRAFT 检测 / 降级）
  - `README.md`（REQ 生命周期段说明 experience 自动草稿 + AUTO-DRAFT 确认流程）

### 约束（Scope Control）

**允许（CAN）**：
- 可修改的文件 / 模块：上述 3 个文件
- 可新增：`req-cli.mjs` 内聚合函数、`tests` 内用例

**禁止（CANNOT）**：
- 不可修改：`scripts/event-store.mjs`（只复用其读取 API，不改）、`scripts/req-validation.mjs`、`requirements/REQ_TEMPLATE.md`、experience 模板格式、其他 hook 脚本
- 不可引入：LLM 调用、npm 依赖、新文件格式

**边界条件**：
- 改动规模：3 文件，主逻辑限于 req-cli.mjs 的 experience/complete
- 发布边界：模板仓库 + --with-hook 目标项目（experience 是 CLI，自动生效）

## 验收标准
- [x] When REQ 有关联 commit 与报告，`req:experience` shall 生成包含 commit 列表、报告结论行与 REQ 生命周期时间线的草稿，且含 AUTO-DRAFT 标记
- [x] When 经验文档仍含 AUTO-DRAFT 标记，`req:complete` shall 输出提醒且正常完成（不阻断）
- [x] When 无 git 历史 / 无报告，`req:experience` shall 优雅降级为现有空模板行为（不报错）
- [x] `npm test`、`npm run docs:verify`、`npm run check:governance` 全部通过

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-087-design.md`
- 相关规范：`docs/plans/optimization-roadmap-2026-06.md` OPT-3

## 报告链接
- Code Review：`requirements/reports/REQ-2026-087-code-review.md`
- QA：`requirements/reports/REQ-2026-087-qa.md`
- Ship：不适用（模板仓库）

## 验证计划
- 计划执行的命令：`npm test`、`npm run docs:verify`、`npm run check:governance`
- 需要的环境：Node.js + git fixture（有 commit 历史）
- 需要的人工验证：对刚完成的 REQ-086 跑 `req:experience` 看草稿质量

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] **目标实现**：聚合草稿 / AUTO-DRAFT 标记 / complete 提醒 / 降级，四目标全达
- [x] **旧功能保护**：无 git 历史/无报告时降级为空模板（向后兼容）；npm test 全绿
- [x] **逻辑正确性**：聚合源（REQ/git/reports/事件）是否正确提取；AUTO-DRAFT 检测是否可靠
- [x] **完整性**：四类验收场景（聚合/提醒/降级/门禁通过）都有实现与测试
- [x] **可维护性**：聚合逻辑是否分函数、可扩展（后续 OPT-4 可能复用）

**输出要求**：记录到 `requirements/reports/REQ-2026-087-qa.md`

#### 对齐检查（record 阶段）
- [x] **目标对齐**：实现服务于"降低完成摩擦、抑制 --skip-experience 滥用"
- [x] **设计对齐**：与 design 稿一致
- [x] **验收标准对齐**：四条验收全有实现与验证

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- 无

## 风险与回滚
- 风险：聚合草稿质量低导致"确认"流于形式 → 经验价值评估已有 `governance:health` 不变量统计兜底；若实测确认率差再考虑加强（OPT-4 方向）。AUTO-DRAFT 仅提醒不阻断，不新增强制摩擦。
- 回滚方式：`experience` 命令还原为空模板生成；`complete` 移除 AUTO-DRAFT 检测。

## 关键决策
- 2026-06-22：OPT-3 定性为"减少治理本身的税"，不是加机制。纯脚本聚合（无 LLM）守零依赖；AUTO-DRAFT 仅提醒不阻断（人工确认兜底，遵守"警告优先于阻断"）。
- 2026-06-22：聚合源选定 REQ 文件 + git log --grep + reports + 事件账本四处，复用 event-store.mjs 读取 API（不改其 schema）。
- 2026-06-22：本 REQ 是内循环最后一项（OPT-1 已完成、OPT-2/4 暂缓、OPT-5 不做、OPT-6 待第二项目）。完成后停内循环，转向"第二个真实项目"受控实验（评估清单：setup 时间 / REQ 摩擦 / hook 误杀漏拦 / --skip-experience 下降率）。
