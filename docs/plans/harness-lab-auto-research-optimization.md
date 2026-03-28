# Harness Lab AutoResearch Optimization Plan

> 将 AutoResearch 的"自主实验"理念融入 harness-lab，增强 Agent 自主性，同时保持轻量治理哲学。

---

## 1. 背景与动机

### 1.1 AutoResearch 核心理念

[karpathy/autoresearch](https://github.com/karpathy/autoresearch) 项目展示了"自主研究"的核心范式：

| 特性 | 说明 |
|------|------|
| **Scope Control** | 明确"能做什么"和"不能做什么"边界 |
| **Time Budget** | 固定时间限制（5分钟），使实验可比 |
| **Results Logging** | baseline + 改进对比，`results.tsv` 记录历史 |
| **Experiment Loop** | 自主迭代：实验 → 记录 → keep/discard → 下一个 |
| **Knowledge Accumulation** | 通过日志和结果文件积累可复用知识 |

### 1.2 Harness Lab 现状

harness-lab 已有良好的治理结构：
- REQ 模板：清晰的生命周期和验收标准
- Skills：阶段导航（plan/review/qa/ship）
- Context：业务、技术、经验三层知识沉淀

### 1.3 融合目标

将 AutoResearch 的"自主实验"能力引入 harness-lab，使 Agent 能够：
1. 在明确边界内自主推进需求
2. 积累改进历史，形成可比的实验记录
3. 沉淀可复用的模式和反模式

---

## 2. 改进方向与设计原则

### 2.1 设计原则

| 原则 | 说明 |
|------|------|
| **轻量优先** | 新增字段和结构必须有明确价值，避免模板膨胀 |
| **增量改进** | 优先落地高价值、低成本的改进 |
| **向后兼容** | 不破坏现有 REQ 和 Skills 的使用方式 |
| **渐进采用** | 新字段可选，不强制填写 |

### 2.2 改进优先级矩阵

| 改进方向 | 价值 | 落地难度 | 优先级 |
|----------|------|----------|--------|
| Scope Control（约束字段） | 高 | 低 | P0 |
| Level System（复杂度分级） | 中 | 低 | P1 |
| Results Table（改进对比） | 高 | 中 | P0 |
| Structured Knowledge | 中 | 中 | P2 |
| Meta-Skills | 低 | 高 | P3 |

---

## 3. 详细设计

### 3.1 Scope Control（约束 Agent 行为边界）

**问题**：现有 REQ 的"范围"字段是描述性的，没有明确约束 Agent 能做什么、不能做什么。

**方案**：扩展 REQ 模板，增加 `scope.constraints` 字段。

#### REQ 模板新增字段

```markdown
## 范围

### 涉及
- 目录 / 模块：
- 接口 / 页面 / 脚本：

### 约束（Scope Control）
> 明确 Agent 能做什么、不能做什么

**允许（CAN）**：
- [ ] 示例：修改现有文件
- [ ] 示例：添加新的测试文件

**禁止（CANNOT）**：
- [ ] 示例：修改 `prepare.py`
- [ ] 示例：引入新依赖

**边界条件**：
- VRAM 限制：不超过 X GB
- 时间限制：不超过 X 分钟
- 代码行数：单文件不超过 X 行
```

#### 落地方式
1. 更新 `requirements/REQ_TEMPLATE.md`，增加约束字段
2. 约束字段**可选填写**，不强制
3. 在 `skills/plan/eng-review.md` 中增加约束审查检查项

#### 示例：AutoResearch 风格的约束

```markdown
### 约束（Scope Control）

**允许（CAN）**：
- [x] 修改 `train.py` 的模型架构
- [x] 修改 `train.py` 的超参数
- [x] 修改 `train.py` 的训练循环

**禁止（CANNOT）**：
- [x] 修改 `prepare.py`
- [x] 安装新包或添加依赖
- [x] 修改评估函数 `evaluate_bpb`

**边界条件**：
- 训练时间：固定 5 分钟
- VRAM：软约束，可适度增加
- 简洁性：等价改进时，更简洁的方案优先
```

---

### 3.2 Level System（复杂度分级）

**问题**：所有 REQ 使用相同模板，但实际上简单任务和复杂项目需要不同的时间预算和流程。

**方案**：引入 Level 分级，对应不同的时间预算和流程要求。

#### Level 定义

| Level | 名称 | 时间预算 | 典型场景 | 流程要求 |
|-------|------|----------|----------|----------|
| L0 | Quick Fix | < 30min | typo、小配置修改 | REQ + 简要说明即可 |
| L1 | Minor | < 2h | 单文件修改、小功能 | REQ + 代码review |
| L2 | Standard | < 1天 | 多文件修改、中等功能 | 完整流程 |
| L3 | Major | > 1天 | 架构变更、大功能 | 完整流程 + 设计评审 |

#### REQ 模板新增字段

```markdown
## 状态
- 当前状态：draft / in-progress / blocked / completed
- 当前阶段：design / implementation / review / qa / ship
- 复杂度：L0 / L1 / L2 / L3

## 时间预算（根据 Level 自动推断）
- 预计时间：
- 实际耗时：
```

#### Level 对应的流程简化

**L0 Quick Fix**：
- REQ 可简化为核心字段（状态、背景、目标、验收标准）
- 不强制要求设计稿
- review/qa 可合并到 REQ 文件中

**L1 Minor**：
- REQ 必填字段
- review 必需，qa 可选
- 设计稿可选

**L2 Standard**（默认）：
- 完整 REQ 模板
- 设计稿 + review + qa 必需
- ship 根据情况

**L3 Major**：
- 完整 REQ 模板 + 风险评估
- 设计评审（eng-review）必需
- 完整报告链（review + qa + ship）

#### 落地方式
1. 更新 REQ 模板，增加 Level 字段
2. 更新 `requirements/INDEX.md`，说明 Level 含义
3. 创建 `requirements/L0_TEMPLATE.md` 作为简化模板（可选）

---

### 3.3 Results Table（改进对比）

**问题**：REQ 完成后，缺少"改进前后的指标对比"记录，难以评估改进效果。

**方案**：引入 `results.md` 或 REQ 内嵌结果表，记录 baseline 和改进对比。

#### 方案 A：REQ 内嵌结果表（推荐）

在 REQ 模板中增加结果记录部分：

```markdown
## 结果记录

### Baseline
| 指标 | 值 | 说明 |
|------|-----|------|
| 示例：响应时间 | 500ms | 改进前 |
| 示例：内存占用 | 1.2GB | 改进前 |

### 改进后
| 指标 | 值 | 变化 | 说明 |
|------|-----|------|------|
| 示例：响应时间 | 200ms | -60% | 优化后 |
| 示例：内存占用 | 0.8GB | -33% | 优化后 |

### 实验/尝试记录
| 尝试 | 指标结果 | 状态 | 说明 |
|------|----------|------|------|
| 方案A | 400ms | discard | 效果不明显 |
| 方案B | 200ms | keep | 最终采用 |
```

#### 方案 B：独立 results.tsv（适用于高频实验）

对于需要频繁迭代的场景（如性能优化、模型训练），使用独立的 `results.tsv`：

```tsv
commit	metric_before	metric_after	change	status	description
a1b2c3d	500ms	400ms	-20%	discard	方案A：增加缓存
b2c3d4e	500ms	200ms	-60%	keep	方案B：优化算法
```

#### 落地方式
1. 更新 REQ 模板，增加"结果记录"部分（可选填写）
2. 对于 L2/L3 级别的 REQ，鼓励填写结果对比
3. 在 `skills/qa/qa.md` 中增加结果验证检查项

---

### 3.4 Structured Knowledge（知识积累结构化）

**问题**：现有 `context/experience/` 目录结构扁平，缺少分类，难以快速定位。

**方案**：扩展目录结构，引入 patterns/anti-patterns/experiments 分类。

#### 新目录结构

```
context/
├── business/          # 业务知识（保持不变）
├── tech/              # 技术知识（保持不变）
└── experience/        # 经验沉淀（扩展）
    ├── README.md      # 索引和使用指南
    ├── patterns/      # 可复用的成功模式
    │   ├── README.md
    │   └── YYYY-MM-DD-<pattern-name>.md
    ├── anti-patterns/ # 需要避免的反模式
    │   ├── README.md
    │   └── YYYY-MM-DD-<anti-pattern-name>.md
    └── experiments/   # 实验记录（AutoResearch 风格）
        ├── README.md
        └── YYYY-MM-DD-<experiment-name>/
            ├── README.md        # 实验总结
            └── results.tsv      # 实验数据
```

#### 各目录用途

| 目录 | 用途 | 示例 |
|------|------|------|
| `patterns/` | 成功的可复用模式 | "错误处理最佳实践"、"API 设计模式" |
| `anti-patterns/` | 需要避免的反模式 | "过度抽象"、"过早优化" |
| `experiments/` | 实验记录，包含对比数据 | "性能优化实验"、"模型调参记录" |

#### 落地方式
1. 创建新目录结构
2. 更新 `context/experience/README.md` 说明新结构
3. 现有文件保持原位置，新文件按新结构组织
4. 在 REQ 完成时，根据经验类型选择对应目录

---

### 3.5 Meta-Skills（Skills 的可迭代性）

**问题**：现有 Skills 缺少版本管理和迭代记录，难以追溯改进历史。

**方案**：引入 `skills/meta/` 目录，记录 Skills 的元信息和迭代历史。

#### 新目录结构

```
skills/
├── README.md          # Skill Map（保持不变）
├── meta/              # Skills 元信息（新增）
│   ├── README.md      # 元信息索引
│   └── <skill-name>.md # 各 Skill 的元信息
├── plan/
├── review/
├── qa/
└── ship/
```

#### Meta 文件格式

`skills/meta/ceo-review.md`：

```markdown
# ceo-review Meta

## 基本信息
- 版本：1.1.0
- 创建日期：2026-03-20
- 最后更新：2026-03-25

## 设计理念
此 Skill 用于在需求实现前做产品和业务审查，确保用户价值清晰、范围明确。

## 迭代历史
| 版本 | 日期 | 变更 | 原因 |
|------|------|------|------|
| 1.1.0 | 2026-03-25 | 增加"风险与依赖"检查项 | 发现缺失风险分析导致返工 |
| 1.0.0 | 2026-03-20 | 初始版本 | |

## 使用反馈
- 2026-03-25：建议在复杂 REQ 中使用，简单 REQ 可跳过
- 2026-03-28：与 Level System 结合，L0/L1 可简化审查流程
```

#### 落地方式
1. 创建 `skills/meta/` 目录
2. 为现有 Skills 创建元信息文件
3. 在 Skills 更新时同步更新元信息

---

## 4. 落地计划

### Phase 1：核心增强（Week 1）

**目标**：落地高价值、低成本的改进

| 任务 | 产出 | 预计时间 |
|------|------|----------|
| 更新 REQ 模板，增加 Scope Control | `requirements/REQ_TEMPLATE.md` | 0.5h |
| 增加 Level System | REQ 模板 + INDEX 更新 | 0.5h |
| 增加 Results Table 字段 | REQ 模板更新 | 0.5h |
| 更新 eng-review Skill | 增加 Scope 审查 | 0.5h |
| 更新 qa Skill | 增加结果验证 | 0.5h |

### Phase 2：结构扩展（Week 2）

**目标**：扩展知识结构

| 任务 | 产出 | 预计时间 |
|------|------|----------|
| 创建 patterns/anti-patterns 目录 | 新目录 + README | 0.5h |
| 创建 experiments 目录结构 | 新目录 + README | 0.5h |
| 迁移一个示例到新结构 | 示例文件 | 0.5h |
| 更新 experience/README.md | 更新后的索引 | 0.5h |

### Phase 3：Meta-Skills（Week 3）

**目标**：完善 Skills 元信息

| 任务 | 产出 | 预计时间 |
|------|------|----------|
| 创建 skills/meta/ 目录 | 新目录 | 0.5h |
| 为现有 Skills 创建 Meta 文件 | 6个 Meta 文件 | 1.5h |
| 更新 Skills 更新流程 | 流程文档 | 0.5h |

---

## 5. 兼容性说明

### 5.1 向后兼容

- 所有新增字段**可选填写**，不影响现有 REQ
- 现有目录结构保持不变，只做扩展
- Skills 的使用方式不变

### 5.2 渐进采用

- L0/L1 REQ 可使用简化流程
- Results Table 可选填写
- Meta-Skills 可按需创建

---

## 6. 示例：优化后的 REQ

```markdown
# REQ-2026-100: 性能优化实验

## 状态
- 当前状态：in-progress
- 当前阶段：implementation
- 复杂度：L2

## 背景
用户反馈列表页加载缓慢，需要优化响应时间。

## 目标
- 列表页响应时间从 500ms 降至 200ms 以下
- 内存占用不超过 1GB

## 非目标
- 不改动数据库 schema
- 不引入新的缓存服务

## 范围

### 涉及
- 目录：`src/pages/list/`, `src/api/`
- 接口：`GET /api/list`

### 约束（Scope Control）

**允许（CAN）**：
- [x] 修改列表页组件
- [x] 添加前端缓存逻辑
- [x] 优化 API 查询

**禁止（CANNOT）**：
- [x] 修改数据库 schema
- [x] 引入 Redis 等外部缓存
- [x] 修改其他页面的代码

**边界条件**：
- 内存：不超过 1GB
- 时间：本 REQ 预计 4 小时完成

## 结果记录

### Baseline
| 指标 | 值 |
|------|-----|
| 响应时间 | 500ms |
| 内存占用 | 1.2GB |

### 改进后
| 指标 | 值 | 变化 |
|------|-----|------|
| 响应时间 | - | - |
| 内存占用 | - | - |

### 实验记录
| 尝试 | 响应时间 | 状态 | 说明 |
|------|----------|------|------|
| - | - | - | 待填写 |

## 验收标准
- [ ] 响应时间 < 200ms
- [ ] 内存占用 < 1GB
- [ ] 无回归问题

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-100-design.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-100-code-review.md`
- QA：`requirements/reports/REQ-2026-100-qa.md`
```

---

## 7. 总结

本优化方案将 AutoResearch 的核心理念融入 harness-lab：

| AutoResearch 特性 | harness-lab 对应 | 改进点 |
|-------------------|------------------|--------|
| Scope Control | REQ 约束字段 | 明确 Agent 行为边界 |
| Time Budget | Level System | 不同复杂度对应不同时间预算 |
| Results Logging | Results Table | 记录改进前后对比 |
| Knowledge Accumulation | Structured Knowledge | 分类沉淀模式/反模式/实验 |
| Meta Information | Meta-Skills | Skills 版本管理和迭代历史 |

核心原则：
- **轻量优先**：新增字段可选，不强制
- **增量改进**：Phase 1/2/3 渐进落地
- **向后兼容**：不破坏现有结构
