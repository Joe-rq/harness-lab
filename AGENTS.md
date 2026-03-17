# Harness Lab - AI 工程化实践仓库

> 基于 OpenAI Harness Engineering + gstack + 腾讯技术工程实践
> 核心理念：人类掌舵，智能体执行

## 🎯 项目定位

本仓库是一个**完整的 Harness Engineering 实践框架**，提供：
- 结构化知识系统（context/ 目录）
- 多 Agent 协作架构（Subagent 工作流）
- 技能层封装（skills/ 目录）
- 复合工程机制（知识沉淀与复用）

## 📁 目录导航

```
.
├── AGENTS.md                 # 本文件：主入口地图
├── CLAUDE.md                 # Claude Code 快速入口
├── context/                  # 知识沉淀目录
│   ├── tech/                # 技术规范、架构设计
│   ├── business/            # 业务背景、流程文档
│   ├── experience/          # 历史经验、坑点记录
│   └── session/             # 会话级临时上下文
├── docs/                     # 详细文档
│   ├── architecture/        # 架构文档
│   ├── plans/               # 执行计划（版本控制）
│   └── specs/               # 产品规格
├── requirements/             # 需求管理
│   ├── INDEX.md             # 需求状态总览
│   ├── in-progress/         # 进行中需求
│   └── completed/           # 已完成需求
├── skills/                   # Skill 定义
│   ├── plan/                # 规划类 Skill
│   ├── review/              # 审查类 Skill
│   ├── qa/                  # 验证类 Skill
│   └── ship/                # 发布类 Skill
└── .claude/                  # Claude Code 配置
    └── progress.txt         # 跨会话进度文件
```

## 🚀 快速开始

### 1. 冷启动新项目

```bash
# 初始化项目记忆
请读取 context/ 目录下的所有文件，了解项目背景

# 加载服务上下文（如果有）
请分析 codebase/ 目录，生成技术摘要到 context/tech/
```

### 2. 开始需求研发

```bash
# 方式一：创建新需求
请创建新需求：实现 [功能描述]

# 方式二：继续已有需求
请继续处理需求 [REQ-XXX]
```

### 3. 使用 Skill

```bash
/plan-ceo-review    # 产品掌舵审查
/plan-eng-review    # 工程方案审查
/plan-design-review # 设计规范审查
/review             # 代码审查
/qa                 # 质量验证
/ship               # 发布工程
```

## 🎨 核心原则

### 1. 渐进式信息披露
- 不要一次性加载所有知识
- 从 AGENTS.md 地图开始
- 按需深入具体文档

### 2. 结构化的状态传递
- 使用 .claude/progress.txt 记录进度
- 每个 Subagent 完成原子任务后更新状态
- 通过文件传递，而非上下文累积

### 3. 知识复利
- 每次实践沉淀经验到 context/
- 第 1 次：45 分钟建立知识库
- 第 2 次：15 分钟复用
- 第 N 次：3 分钟一键完成

### 4. 用约束换自主
- 规矩越明确，Agent 独立做的事越多
- 关键约束编码成 Linter 规则
- 审查清单标准化

## 📋 工作流规范

### 需求研发流程

```
1. 需求理解 (phase-router)
   ├── 读取 context/business/ 业务背景
   ├── 读取 requirements/INDEX.md 需求状态
   └── 输出：需求边界确认

2. 方案设计 (design-manager)
   ├── 读取 context/tech/ 技术规范
   ├── 读取 docs/architecture/ 架构设计
   └── 输出：技术方案文档

3. 代码实现 (implementation-executor)
   ├── 遵循技术规范
   ├── 执行 plan-build-verify-fix 闭环
   └── 输出：可运行的代码 + 测试

4. 质量验证 (test-agent)
   ├── 运行测试用例
   ├── 检查架构约束
   └── 输出：验证报告

5. 知识沉淀 (human)
   ├── 总结本次经验
   ├── 更新 context/experience/
   └── 优化 Skill 提示词
```

## 🔧 关键约束

### 必须遵循
1. **所有代码必须有测试**
2. **提交前必须通过 Linter**
3. **架构变更必须更新文档**
4. **经验必须沉淀到 context/**

### 禁止事项
1. 不要在一个会话里完成整个需求
2. 不要省略验证步骤
3. 不要把知识只留在脑子里

## 📝 状态文件格式

.claude/progress.txt 示例：

```markdown
## 当前需求：REQ-001 实现用户认证

### 状态：进行中（实现阶段）

### 已完成
- [x] 需求理解（phase-router）
- [x] 技术方案设计（design-manager）
  - 方案文档：docs/plans/REQ-001-design.md

### 进行中
- [ ] 接口开发（implementation-executor）
  - 当前任务：实现登录接口
  - 已知约束：
    - 必须使用 JWT
    - 密码必须加密存储
    - 需要防暴力破解

### 待办
- [ ] 单元测试
- [ ] 集成测试
- [ ] 代码审查

### 历史经验（自动加载）
- context/experience/认证模块坑点.md
- context/tech/JWT最佳实践.md
```

## 🤝 Subagent 协作协议

### 交接规范
1. 每个 Subagent 只完成一个原子任务
2. 完成后更新 progress.txt
3. 关键决策必须记录原因
4. 异常情况必须标注

### 上下文管理
1. 启动时读取 progress.txt
2. 加载相关的 context/ 文件
3. 执行专注任务
4. 结束时更新状态

## 📚 参考资料

- OpenAI Harness Engineering
- gstack (github.com/garrytan/gstack)
- 腾讯技术工程实践

## 💡 最佳实践

1. **小步快跑**：每次只做一件事，但做完做透
2. **文档即代码**：把知识编码进工具，不只是写文档
3. **自动化一切**：能自动化的绝不手动
4. **持续优化**：每次迭代都改进工具和流程

---

**记住**：不要为了用工具而用工具。工具应该适配人，而不是让人适配工具。
