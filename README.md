# Harness Lab

> 完整的 Harness Engineering 实践框架
> 基于 OpenAI Harness + gstack + 腾讯技术工程实践

## 🎯 这是什么

Harness Lab 是一个**可直接使用的 AI 工程化框架**，提供：

✅ **结构化知识系统** - context/ 目录沉淀业务、技术、经验
✅ **多 Agent 协作** - Subagent 工作流，状态文件传递
✅ **技能层封装** - 规划/审查/验证/发布全流程 Skill
✅ **复合工程机制** - 知识复利，边际成本递减

## 🚀 快速开始

### 1. 初始化

```bash
# 克隆仓库
git clone <repo-url> harness-lab
cd harness-lab

# 用 Claude Code 打开
claude
```

### 2. 配置项目

在 Claude Code 中执行：

```
# 1. 读取项目地图
请读取 AGENTS.md 了解项目结构和核心原则

# 2. 配置业务背景
请帮我填写 context/business/business-overview.md

# 3. 配置技术规范
请帮我填写 context/tech/architecture.md
```

### 3. 开始需求研发

```
# 创建新需求
请创建新需求：实现用户登录功能

# 或使用 Skill
/plan-ceo-review
/plan-eng-review
```

## 📁 目录结构

```
.
├── AGENTS.md           # 项目地图（必读）
├── CLAUDE.md           # Claude Code 快速入口
├── README.md           # 本文件
├── context/            # 知识沉淀
│   ├── tech/          # 技术规范
│   ├── business/      # 业务背景
│   ├── experience/    # 历史经验
│   └── session/       # 会话上下文
├── docs/               # 详细文档
│   ├── architecture/  # 架构设计
│   ├── plans/         # 执行计划
│   └── specs/         # 产品规格
├── requirements/       # 需求管理
│   ├── INDEX.md       # 需求总览
│   ├── in-progress/   # 进行中
│   └── completed/     # 已完成
├── skills/             # Skill 定义
│   ├── plan/          # 规划类
│   ├── review/        # 审查类
│   ├── qa/            # 验证类
│   └── ship/          # 发布类
└── .claude/            # Claude 配置
    └── progress.txt   # 跨会话进度
```

## 🎨 核心理念

### 1. 人类掌舵，智能体执行
- 人设定目标和验收标准
- Agent 自主完成具体任务
- 关键决策点人介入确认

### 2. 用约束换自主
- 明确的规范让 Agent 更可靠
- 架构约束编码成 Linter 规则
- 审查清单标准化

### 3. 知识复利
- 第 1 次：45 分钟建立知识库
- 第 2 次：15 分钟复用
- 第 N 次：3 分钟一键完成

### 4. 结构化的状态传递
- Subagent 独立上下文
- 通过文件传递状态
- 避免上下文累积爆炸

## 🛠️ 可用技能

### 规划类
- `/plan-ceo-review` - 产品掌舵审查
- `/plan-eng-review` - 工程方案审查（80项检查）
- `/plan-design-review` - 设计规范审查（80项检查）

### 审查类
- `/review` - 代码审查

### 验证类
- `/qa` - 质量验证

### 发布类
- `/ship` - 发布工程

## 📖 使用文档

- [核心理念](docs/core-concepts.md)
- [快速上手指南](docs/quick-start.md)
- [Skill 使用手册](docs/skills.md)
- [最佳实践](docs/best-practices.md)

## 🤝 贡献

欢迎贡献新的 Skill 和改进建议！

1. Fork 本仓库
2. 创建特性分支
3. 提交 Pull Request

## 📄 许可证

MIT License

## 🙏 致谢

- [OpenAI Harness Engineering](https://openai.com/index/harness-engineering/)
- [gstack](https://github.com/garrytan/gstack)
- [腾讯技术工程](https://mp.weixin.qq.com/s/CXx-0ar1EBf14vgQHHjU7A)

---

**开始你的 Harness 工程化之旅吧！** 🚀
