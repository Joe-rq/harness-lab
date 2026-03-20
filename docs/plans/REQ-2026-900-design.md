# REQ-2026-900 Design

> 公开脱敏示例。
> 仅用于演示设计稿应该如何与 REQ、review、QA 和 ship 报告形成闭环。

## Background

列表页已有关键词搜索，但缺少显式状态筛选。
结果是用户只能依赖搜索词和人工翻页定位目标记录。

## Goal

- 提供状态筛选入口
- 保证筛选与 URL 同步
- 不破坏已有搜索体验

## Scope

### In scope
- 新增状态筛选控件
- 为查询层增加状态参数
- 在 URL 中持久化筛选值

### Out of scope
- 不改视觉规范
- 不新增服务端搜索索引
- 不改权限模型

## Technical plan

### UI
- 在列表页工具栏增加一个状态下拉框
- 默认值为 `all`

### Query handling
- 从 URL 读取 `status`
- 只接受 `open`、`closed`、`all`
- 非法值回退到 `all`

### Data flow
- 页面层负责读取和写入 URL 参数
- 查询层负责把状态参数映射到既有查询条件

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 非法 URL 参数导致异常结果 | 中 | 对未知值回退到 `all` |
| 搜索和筛选组合时逻辑不一致 | 中 | 为组合场景补测试和手工验证 |
| 旧链接兼容性问题 | 低 | 默认值保持与旧逻辑一致 |

## Validation plan

- Commands:
  - `npm run test`
  - `npm run verify`
- Manual checks:
  - 打开 `/items?status=open`
  - 切换筛选并刷新页面
  - 搜索词与状态筛选组合验证

## Rollback

- 回退列表页状态筛选控件
- 删除查询层新增的 `status` 条件分支
- 保留原有关键词搜索路径
