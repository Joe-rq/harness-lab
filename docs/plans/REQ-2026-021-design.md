# REQ-2026-021 Design

## Background

当前 harness-lab 的 commit 历史混乱：
- 语言不统一（中英文混用）
- 格式不一致（有的用 conventional commits，有的用简单描述）
- REQ 编号引用方式不一致

## Goal

- 定义统一的 commit message 格式（中文为主）
- 支持 REQ 编号自动关联
- 提供文档和示例

## Scope

### In scope

- 更新 CONTRIBUTING.md 添加 commit 规范
- 定义格式、类型、scope
- 提供正确/错误示例
- 说明 REQ 编号关联方式

### Out of scope

- commitlint 等强制检查工具（后续可扩展）
- 修改历史 commit

## Product Review

### User Value

- 解决的问题：commit 历史混乱，难以阅读和追溯
- 目标用户：harness-lab 的所有贡献者
- 预期收益：统一的 commit 风格，便于生成 changelog

### Recommendation

- Proceed

## Engineering Review

### Architecture Impact

- 影响模块：CONTRIBUTING.md
- 依赖方向：无
- 需要新增或修改的边界：无

### Verification

- 自动验证：无
- 人工验证：检查文档完整性
- 回滚：删除文档

## Commit 规范设计

### 格式定义

```
<type>(<scope>): <中文描述> (REQ-YYYY-NNN)

<body>
```

### 类型定义

| type | 含义 | 示例 |
|------|------|------|
| feat | 新功能 | feat(req): 新增设计文档验证 |
| fix | Bug 修复 | fix(hook): 修复绕过漏洞 |
| docs | 文档更新 | docs: 统一 commit 规范 |
| refactor | 重构 | refactor(cli): 简化验证逻辑 |
| test | 测试相关 | test: 补充豁免机制测试 |
| chore | 杂项 | chore: 更新依赖 |

### Scope 定义

| scope | 范围 |
|-------|------|
| req | REQ 生命周期 |
| hook | PreToolUse hook |
| install | 安装器 |
| governance | 治理检查 |
| docs | 文档 |

### REQ 编号

- 必须关联：feat、fix 类型的改动
- 可选关联：docs、test、chore 类型
- 格式：`(REQ-YYYY-NNN)` 放在标题末尾

### 示例

**正确示例：**

```
feat(req): 新增设计文档内容验证 (REQ-2026-020)

在 req:start 阶段验证设计文档：
- 检查文件是否存在
- 检测未填充的模板占位符
- 支持豁免机制

fix(hook): 修复无活跃 REQ 时代码修改绕过漏洞 (REQ-2026-017)

只允许 requirements/ 和 docs/plans/ 目录的写入。

docs: 统一 commit 规范

定义格式、类型、scope，提供示例。
```

**错误示例：**

```
❌ Add design document content validation in req:start
   （全英文，无 REQ 编号）

❌ 完成 REQ-2026-019：移除入口文档中的版本历史
   （格式不规范，type/scope 缺失）

❌ feat: fix the bug
   （描述过于简略，无中文，无 REQ 编号）

❌ 修复bug
   （无 type，无 scope，无 REQ 编号）
```

### 与现有规范的兼容

- Conventional Commits 1.0.0 兼容
- 中文描述符合国内团队习惯
- REQ 编号后缀是扩展，不影响工具解析
