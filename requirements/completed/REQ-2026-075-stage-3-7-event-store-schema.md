# REQ-2026-075: Stage 3 §7 评估表口径定义 + event-store schema 扩展

## 状态
- 当前状态：completed
- 当前阶段：qa

## 背景

路线图 `docs/plans/multi-agent-roadmap.md` 当前阶段为 S3-CP1 真实使用观察期,§7 决策评估表 6 维度(单 agent 复杂任务失败率 / 并行任务真实数量 / 独立 verifier 拦截率 / progress 冲突次数 / 人工调度成本 / 是否仍想承担复杂度)在 S3-CP2 填表时面临 4 个根本性缺陷(详见 `requirements/observations/2026-06-03-multi-angle-roadmap-deduction.md` 角度 A 总结):

1. **6 维度里 5 个客观指标依赖自报告,无口径定义**:"30% 失败率"和"20% 拦截率"等关键数字在路线图里没有分子分母定义,user/agent/verifier 无法达成一致;到 S3-CP2 时所有数字必然沦为估算,违反 §6.1 "§7 评估表有真实数据,不是估计"。

2. **事件账本零遥测**:`.claude/events/session-main.jsonl` 实测 11 行 2026-05-31 当天的 REQ lifecycle 事件,零条与"verifier 拦截率 / 失败率 / 调度成本 / 冲突次数"相关的遥测;§7 6 维度物理上不可计算,这是 F5 CRITICAL 债务。

3. **6 维度无聚合规则、无反向否决项、无启用条件**:维度间高度耦合(拦截率上升 ↔ 失败率下降),单一聚合规则缺失意味着 S3-CP3 决策时无可执行的判定函数,只能凭 gut feel。

4. **"修订" 选项无前置触发条件**:Stage 1+2 之外最可能的真实结论("任务图不是答案但另两个 Stage 也没解决的事")在 §7 表里几乎走不到。

5. **事件 schema 无 version / migration 策略**:REQ-075 引入 9 个新 type 后,旧 consumer 拒绝新事件;无 deprecation 路径。

6. **事件账本无大小上限/rotation**:append-only 但无界,session-main.jsonl 6 个月后单文件 200K 行,readEvents 一次读全部会 OOM。

综合报告建议(已被 user 在 2026-06-03 决策采纳):"沿用路线图原值,只补 REQ-075 口径定义"。

## 目标

- **目标 1**:在 `scripts/event-store.mjs` 增加 9 个新事件 type(schema + 写入 API + 校验),覆盖 §7 6 维度所需遥测 + §6.2 触发反向否决项所需信号
- **目标 2**:定义 §7 6 维度的数据源事件 type、计分公式、分子分母、不可用时 fallback,并落盘为可查询的 metadata(由 `node scripts/event-store.mjs stats --metrics` 暴露)
- **目标 3**:在 schema 中引入 `version` 字段 + `EVENT_TYPE_SCHEMAS` map,支持后续 type 演进的 semver 规则(新增 type 是 minor,删除 type 是 major + 1 minor 警告期)
- **目标 4**:实现按月 rotation 策略(`MAX_EVENT_LINES` 软上限),防止 session-main.jsonl 单文件无界增长

## 非目标

- 不实现 Stage 3 任务图(§11 禁令)
- 不替换 `progress.txt` 主真相源角色(REQ-076 处理)
- 不改 hook 拦截层
- 不实现事件流的 deterministic replay / hash 验证(§1.3 不做清单)
- 不实现跨 worktree 事件聚合(REQ-076 处理)
- 不做全量事件归档到 SaaS / 数据库(§1.3 不做清单)

## 颗粒度自检
- [x] 目标数 ≤ 4？(4)
- [x] 涉及文件数 ≤ 4？(3: `event-store.mjs` + `tests/event-store.test.mjs` + 新增 1 个 metrics 文档)
- [x] 涉及模块/目录 ≤ 4？(2: `scripts/` + `tests/`)
- [x] 能否用一句话描述"解决了什么问题"？✅ 把 §7 评估表从橡皮尺变成可计算指标
- [x] 如果失败,能否干净回滚？✅ 新增 type 走 EVENT_TYPE_SCHEMAS map,删除 type 不破坏旧 consumer;MAX_EVENT_LINES 软上限可通过 env 调整

## 范围

- 涉及目录 / 模块：`scripts/`、`tests/`
- 影响接口 / 页面 / 脚本：
  - `scripts/event-store.mjs` — 增加 9 个 type 写入 + `stats` 子命令 + rotation
  - `tests/event-store.test.mjs` — 增加 9 个新 type + stats + rotation 测试

### 约束（Scope Control，可选）

**允许（CAN）**：
- 可修改的文件 / 模块：`scripts/event-store.mjs`、`tests/event-store.test.mjs`
- 可新增的测试 / 脚本：`tests/event-store-metrics.test.mjs`(可选,若 stats 命令复杂可独立)

**禁止（CANNOT）**：
- 不可修改的文件 / 模块：其他 REQ 范围(`session-start.js`、`verifier-session.mjs`、`progress.txt`、hook)
- 不可引入新的 npm 依赖
- 不可改事件文件路径(REQ-076 处理)

**边界条件**：
- 9 个新 type 命名严格遵循现有 snake_case + 动词命名规范
- `version` 字段默认为 `"1.0"`,符合 semver
- rotation 策略:单文件 > 1000 行时滚动到 `events-archive/YYYY-MM.jsonl`;不删除旧文件,只停止向旧文件 append
- 9 个新 type 不引入 payload 中的新必填字段(只扩展 type 集合,保持向后兼容)

## 验收标准

- [x] **AC-1**:9 个新 type 在 `EVENT_TYPE_SCHEMAS` 中有 schema 定义:`verifier_blocked`、`verifier_passed`、`verifier_failed`、`conflict_detected`、`retry_attempted`、`human_decision_made`、`monthly_verifier_invocation_count`、`verifier_degraded`、`s3_verifier_cost_alert`
- [x] **AC-2**:`s3_observation_window_start`、`s3_observation_window_end`、`s3_observation_data_recorded`、`s3_observation_paused` 4 个观察期专用 type 也在 `EVENT_TYPE_SCHEMAS` 中(共 13 个,合并入 AC-1 计数为 13 个)
- [x] **AC-3**:每个事件写入时 `version: "1.0"` 字段自动附加;旧 consumer 不识别新 type 时不抛错(只 warn)
- [x] **AC-4**:`node scripts/event-store.mjs stats --metrics` 命令可输出 6 维度原始计数 + 各自启用条件(分母 < 阈值时输出 N/A 而非 0)
- [x] **AC-5**:§7 6 维度计分公式、分子分母、不可用 fallback 落盘为 `docs/plans/REQ-2026-075-evaluation-metrics.md`,被 `stats --metrics` 命令引用
- [x] **AC-6**:`MAX_EVENT_LINES` env var(默认 1000)可配置;超过时自动 rotate 到 `events-archive/YYYY-MM.jsonl`
- [x] **AC-7**:坏 schema 事件(缺必填字段 / type 不在白名单 / version 不匹配)写入被拒,错误信息清晰
- [x] **AC-8**:9 个新 type 各自有 1 个写入 + 读取 + 校验测试
- [x] **AC-9**:`npm test`、`npm run docs:verify`、`npm run check:governance` 全部通过
- [x] **AC-10**:review / QA / experience 落盘：`requirements/reports/REQ-2026-075-{code-review,qa}.md` + `context/experience/REQ-2026-075-stage-3-7-event-store-schema.md`

## 设计与实现链接

- 设计稿：`docs/plans/REQ-2026-075-design.md`
- 关联综合报告：`requirements/observations/2026-06-03-multi-angle-roadmap-deduction.md` 角度 A 第 3 条 + 角度 B F5 + 综合 §5 observationInstrumentation
- 关联路线图章节：`multi-agent-roadmap.md §7 评估表`(待重写为可执行评估)

## 报告链接
- Code Review：`requirements/reports/REQ-2026-075-code-review.md`
- QA：`requirements/reports/REQ-2026-075-qa.md`
- Ship：`requirements/reports/REQ-2026-075-ship.md`（不适用,本地 REQ 无发布）
- Experience：`context/experience/REQ-2026-075-stage-3-7-event-store-schema.md`

## 验证计划
- 计划执行的命令：
  - `npm test`
  - `npm run docs:verify`
  - `npm run check:governance`
  - `node tests/event-store.test.mjs`
  - `node scripts/event-store.mjs stats --metrics`(手动验证)
- 需要的环境：Node.js 18+,仓库本地副本
- 需要的人工验证：
  - 检查 `events-archive/` 目录在 rotation 触发后确实有文件
  - 验证 9 个新 type 的 schema 字段在 writeEvents 拒绝坏数据时返回清晰错误

### 反馈与质量检查

#### 元反思检查（verify 阶段）
- [x] 目标实现：9 个新 type 全部落地?13 个(含观察期 4 个)是否齐全?
- [x] 旧功能保护：现有 `req_started` / `req_completed` / `session_started` 行为未变?
- [x] 逻辑正确性：rotation 触发后旧事件还能读取?`stats --metrics` 的 N/A 输出正确?
- [x] 完整性：边界(空 events 目录 / 单文件 < 1000 行)处理是否一致?
- [x] 可维护性：`EVENT_TYPE_SCHEMAS` map 易于后续扩展(下一个 type 添加只需 1 行 + 1 测试)?

#### 对齐检查（record 阶段）
- [x] 目标对齐：实现是否服务于"把 §7 评估表从橡皮尺变成可计算指标"?
- [x] 设计对齐：与综合报告 §5 observationInstrumentation 维度映射一致?
- [x] 验收标准对齐：AC-1~AC-10 全部有对应实现 + 测试 + 报告?

## 阻塞 / 搁置说明（可选）
- 原因：无
- 恢复条件：无
- 下一步：无

## 临时实现与债务
- 观察期 4 个 type (`s3_observation_*`)在 REQ-075 落地后才有 schema,期间 S3-CP1 临时方案:用现有 `session_started` 事件 + `payload.observation=true` 字段标记
  - **退出条件**:REQ-076 落地(预期 1 周内),把所有 `payload.observation=true` 的 session_started 事件迁移为 `s3_observation_window_start` type
  - **清理触发点**:REQ-076 完成时,grep `payload.observation=true` 应当返回 0 行;若 > 0 则报警并阻塞 REQ-076 收口
- 旧 0.9 事件(2026-05-31 写入的 13 行)被 readEvents 兼容读取,auto-fill `version: "0.9"`
  - **退出条件**:1 周观察期结束后,所有新写入事件 `version: "1.0"` 占比应 > 90%;若低于则回退兼容逻辑
  - **清理触发点**:S3-CP2 评估时统计 `version: "0.9"` 事件比例;占比 < 10% 时可关闭 readEvents 的兼容路径

## 风险与回滚
- 风险：
  - **R-1**:9 个新 type 的 schema 字段定义错误,导致后续 REQ-076/077 写入时数据格式不一致
  - **R-2**:`stats --metrics` 命令的 6 维度计分公式与 S3-CP2 实际填表口径不一致
  - **R-3**:rotation 策略破坏跨 session 读取,导致 S3-CP2 评估时数据丢失
- 回滚方式：
  - R-1:修改 `EVENT_TYPE_SCHEMAS` map 单点修复,无 schema migration(因新 type 尚未生产使用)
  - R-2:更新 `docs/plans/REQ-2026-075-evaluation-metrics.md` 文档 + 调整 `stats --metrics` 实现
  - R-3:删除 `events-archive/` 目录 + 把 `MAX_EVENT_LINES` 设回 `Infinity`,事件回归单文件

## 关键决策
- 2026-06-03:由 `req:create` 自动生成骨架;内容由综合报告 + user 6 个决策(v1 envelope / v2 补登记起算日 / v3 重验 / v4 沿用阈值 / v5 $5 预算 / v6 §10 推迟)填充
- 2026-06-03:13 个新 type(9 主 + 4 观察期)一次性落地,不分拆到 REQ-076/077;避免 REQ 数量膨胀,降低回归风险
- 2026-06-03:`MAX_EVENT_LINES` 默认 1000 是经验值(2 周观察期 + 3 REQ/周 + 5 事件/REQ ≈ 30-50 事件,远低于 1000),留有 20x 余量

<!-- Source file: REQ-2026-075-stage-3-7-event-store-schema.md -->
