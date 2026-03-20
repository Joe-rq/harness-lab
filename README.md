# Harness Lab

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

> AI 项目的研发治理层模板
> 不替代业务框架；用于把需求、设计、实现、验证、发布和经验沉淀收进同一套协议

## 这是什么

Harness Lab 适合内嵌到已有仓库，负责提供一套稳定的协作机制：
- 固定需求流转和交付物
- 让人和 agent 都能按同一套入口接手工作
- 把 review / QA / ship 从口头流程变成仓库内证据链
- 把经验复用下来，减少跨会话和跨阶段的上下文损耗

仓库地址：
- GitHub: [Joe-rq/harness-lab](https://github.com/Joe-rq/harness-lab)

## 这不是什么

- 不是 Web / App / Backend 的业务框架
- 不强行替换目标项目的目录结构、架构分层或运行时
- 不预设 lint / test / build 的具体命令；这些必须由接入项目自己绑定

## 核心目录

```text
.
├── AGENTS.md                 # 主入口：治理规则和目录地图
├── CLAUDE.md                 # 会话入口：默认读取顺序
├── context/                  # 业务 / 技术 / 经验索引与知识沉淀
├── docs/plans/               # 与 REQ 对应的设计和实施方案
├── docs/specs/               # 长期有效的产品 / API / 运行规范
├── requirements/             # REQ 状态中心
│   ├── INDEX.md              # 当前活跃 REQ 与状态总览
│   ├── REQ_TEMPLATE.md       # REQ 模板
│   ├── in-progress/          # 进行中的需求
│   ├── completed/            # 已完成需求
│   └── reports/              # code review / QA / ship 报告
├── skills/                   # 通用治理技能
└── .claude/progress.txt      # 跨会话进度交接
```

## 默认工作方式

1. 先看索引，不要一上来读完整个仓库。
2. 先确认当前活跃 REQ，再决定读哪些 context 和代码。
3. 需求、设计、实现、评审、验证、发布都要落盘到仓库。
4. 验证结论只有在命令或实际操作真的执行后才成立。
5. 每次完成重要工作后，更新 `.claude/progress.txt` 和必要的经验文档。

## 快速开始

### 1. 接入到目标项目

把以下目录和文件引入目标项目：
- `AGENTS.md`
- `CLAUDE.md`
- `context/`
- `docs/`
- `requirements/`
- `skills/`
- `.claude/progress.txt`

### 2. 绑定真实命令

在目标项目的 `package.json` 或等价入口里绑定真实命令，例如：
- `lint`
- `test`
- `build`
- `verify`

如果命令不存在，先补说明或脚本，再启动治理流程。

`harness-lab` 自己的 [package.json](./package.json) 里的失败脚本只是模板守卫，用来防止把模板仓库误判成已验证项目；它不会自动迁移到目标项目。

推荐在目标项目里显式绑定真实命令，最少可以从下面片段开始改：

```json
{
  "scripts": {
    "lint": "eslint .",
    "test": "vitest run",
    "build": "next build",
    "verify": "npm run lint && npm run test && npm run build"
  }
}
```

如果目标项目不用 `npm`、`eslint`、`vitest` 或 `next`，就替换成自己的真实链路，不要照抄。

### 3. 会话启动顺序

在 Claude / Codex 中按顺序读取：
1. `AGENTS.md`
2. `requirements/INDEX.md`
3. `.claude/progress.txt`
4. 相关 `context/*/README.md`
5. 当前 REQ、设计稿、报告和必要代码

### 4. 开始一个真实 REQ

- 先在 `requirements/in-progress/` 创建需求文件
- 中大改动在 `docs/plans/` 创建对应设计稿
- 小改动可以把设计摘要直接写进 REQ，而不是强制拆单独设计稿
- 实现后把 review / QA / ship 结果落到 `requirements/reports/`
- 完成后移入 `requirements/completed/`

## 适用场景

适合：
- 持续迭代的产品仓库
- 多人或多 agent 协作的项目
- 需要跨会话延续上下文的项目
- 需要设计、实现、验证、发布、复盘闭环的项目

不适合：
- 一次性脚本
- 半天内结束的临时 demo
- 不需要长期知识沉淀的实验仓库

## 成功标准

接入后，仓库应该具备这些特征：
- 当前活跃 REQ 明确可见
- 每个重要需求有对应设计稿
- review / QA / ship 有固定落盘位置
- 验证命令真实可执行
- 新会话能用索引快速恢复上下文
- 已完成工作会沉淀成可复用经验

## Contributing

欢迎基于真实项目实践继续改进这个模板。

提交前建议先做这些事：
- 说明你要解决的模板问题或使用痛点
- 优先修改索引、模板、skills 和交付物约定，而不是引入业务特化假设
- 如果改动影响接入方式，请同步更新 `README.md`、`AGENTS.md`、`CLAUDE.md`
- 如果改动影响 REQ、reports 或 context 结构，请补充对应示例或模板

详细贡献方式见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## License

This project is licensed under the MIT License.
See [LICENSE](./LICENSE).
