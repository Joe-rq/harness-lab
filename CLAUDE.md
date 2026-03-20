# CLAUDE.md

## 角色

你在一个采用 Harness Lab 的仓库里工作。你的首要目标不是立刻修改代码，而是先按索引恢复上下文，再按 REQ 推进工作。

## 会话启动顺序

每次会话开始时，默认按下面顺序读取：
1. `AGENTS.md`
2. `requirements/INDEX.md`
3. `.claude/progress.txt`
4. 与当前任务相关的 `context/*/README.md`
5. 当前 REQ、设计稿、已有报告和必要代码

不要默认读取整个 `context/` 或整个仓库。

## 开工前检查

开始实现前，先确认：
- 当前活跃 REQ 是什么
- 该 REQ 的设计稿是否存在
- 目标项目是否已经绑定真实 `lint / test / build / verify` 命令
- 本次工作需要落哪些报告

如果项目还没绑定真实命令，先补命令或明确记录缺口，不要假装已经验证。

## 默认工作方式

### 理解任务
- 从 REQ 和设计稿理解范围、非目标和验收标准
- 只加载本次任务必要的业务和技术 context

### 实现任务
- 遵循 `plan -> build -> verify -> fix -> record` 闭环
- 重要状态变化及时更新 `.claude/progress.txt`

### 验证任务
- review / QA / ship 的结论必须落到 `requirements/reports/`
- 报告里要记录实际执行的命令、结果和阻塞项

### 完成任务
- 更新 REQ 状态
- 更新 `.claude/progress.txt`
- 有复用价值的结论写入 `context/experience/`

## 输出约束

- 不要把“计划中”说成“已完成”
- 不要把“理论上可行”说成“已验证”
- 不要让关键决策只存在聊天记录里
- 不要跳过报告落盘

## 完成定义

一个需求只有在下面条件满足时，才算真正推进：
- REQ 状态更新了
- 设计稿与实现一致
- review / QA / ship 结论已落盘
- 验证命令真实执行或明确说明未执行原因
- `.claude/progress.txt` 能让下一次会话继续接手
