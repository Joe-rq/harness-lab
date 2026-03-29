# REQ-2026-011 Design

## Background

2026-03-29 的治理增强提交同时引入了三类契约漂移：

- 入口文档裁剪后不再满足模板仓库自己的治理自检要求
- 安装器复制的文件集合小于它对目标项目宣称的治理能力
- 安装器输出的 hook 结构与示例配置不一致

这些漂移会直接削弱 Harness Lab 的核心价值：同一套协议必须从“文档入口”“自动检查”“安装产物”三个维度描述同一个事实。

## Goal

- 恢复仓库自身治理自检为绿灯
- 让安装器产物与 README / `/harness-setup` / 配置示例保持一致
- 把这次修复保持在“校正事实”层面，不扩展额外功能

## Scope

### In scope

- 修复 `scripts/harness-install.mjs` 的模块清单与 hook 写入逻辑
- 更新 `README.md` 与 `CLAUDE.md` 中与治理自检、启动路径、安装清单相关的入口说明
- 更新 `.claude/commands/harness-setup.md`，让安装文档与安装器行为一致
- 产出本次修复的 code review / QA 报告

### Out of scope

- 新增卸载、覆盖策略或更复杂的安装交互
- 调整 `scripts/check-governance.mjs` 的治理标准以适配错误文档
- 引入新的 CI、依赖管理或发布流程

## Product Review

### User Value

- 解决的问题：模板仓库自检失败、安装后产物与说明不一致
- 目标用户：维护 Harness Lab 的仓库贡献者，以及通过安装器接入治理层的项目维护者
- 预期收益：README 与自动检查重新可信，目标项目接入后不再缺失关键治理脚本或错误 hook 结构

### Recommendation

- Proceed

## Engineering Review

### Architecture Impact

- 影响模块：安装器模块清单、hook 配置写入、入口文档的固定片段
- 依赖方向：无新增依赖；保持 `scripts/check-governance.mjs` 继续作为严格校验器
- 需要新增或修改的边界：安装器必须复制它所声明的治理脚本与示例文件，文档必须反映 diff-aware 约束和启动路径

### Verification

- 自动验证：
  - `npm run docs:verify`
  - `npm run check:governance`
- 人工验证：
  - 在临时 Git 仓库中执行 `node scripts/harness-install.mjs --defaults --with-hook`
  - 检查是否复制 `check-governance.mjs`、`session-start.sh`、核心 context 文件
  - 检查 `.claude/settings.local.json` 是否写入 `hooks.PreToolUse`
- 回滚：
  - 回退本次对安装器、README、CLAUDE 和 skill 文档的修改

## Design

### 1. 恢复安装器的治理产物完整性

- `cli` 模块补齐 `scripts/check-governance.mjs`
- `hook` 模块补齐 `scripts/session-start.sh` 与 `.claude/settings.example.json`
- `context` 模块补齐最小技术与业务骨架，避免目标项目拿到残缺索引
- `--with-hook` 与交互模式都必须显式选中 `hook` 模块，消除“实际配置了 hook 但报告未安装 hook”的分叉

### 2. 统一 hook 配置契约

- 安装器写入 `.claude/settings.local.json` 时，遵循示例文件的 `hooks.PreToolUse` 结构
- 保留用户已有的 `permissions` 或其他 `hooks.*` 配置
- 清理历史上可能遗留的顶层 `PreToolUse` 字段，避免双写和歧义

### 3. 恢复入口文档与治理检查一致性

- `README.md` 补回治理自检需要的固定入口信息：
  - `diff-aware` 文档同步约束
  - “人类维护者最短路径”
  - “AI agent / Codex 完整路径”
  - `REQ-2026-901-suspended-example.md`
- 手动接入清单改成逐项路径，避免 docs verifier 把组合字符串识别成不存在的单一路径
- `CLAUDE.md` 明确模板仓库改动后需要执行 `npm run docs:verify` 与 `npm run check:governance`

## Implementation Checklist

- [x] 补齐 REQ 与设计稿
- [x] 修复安装器模块清单和 hook 写入逻辑
- [x] 对齐 README / CLAUDE / `/harness-setup`
- [x] 运行真实验证命令
- [x] 生成 review / QA 报告并完成 REQ
