# REQ-2026-900: Example status filter for a list page

> 公开脱敏示例。
> 本文件只用于演示 Harness Lab 的治理链路，不对应任何真实项目、真实用户或真实仓库。

## 状态
- 当前状态：completed
- 当前阶段：ship

## 背景
一个通用 Web 应用的列表页已经支持关键词搜索，但还不能按状态筛选。
用户在排查待处理项目时，需要反复翻页或手动搜索，效率较低。

## 目标
- 给列表页增加状态筛选能力
- 让 URL 能保留筛选状态，方便分享和回访

## 非目标
- 不改动底层权限模型
- 不重做列表页视觉设计
- 不引入新的搜索服务

## 范围
- 涉及目录 / 模块：
  - `src/app/items`
  - `src/lib/items/query`
- 影响接口 / 页面 / 脚本：
  - 列表页查询参数处理
  - 列表页数据查询逻辑

## 验收标准
- [x] 用户可按 `open / closed / all` 三种状态筛选
- [x] 切换筛选后 URL 查询参数同步更新
- [x] 刷新页面后筛选状态保持一致
- [x] 不影响已有关键词搜索行为

## 设计与实现链接
- 设计稿：`docs/plans/REQ-2026-900-design.md`
- 相关规范：`context/tech/testing-strategy.md`

## 报告链接
- Code Review：`requirements/reports/REQ-2026-900-code-review.md`
- QA：`requirements/reports/REQ-2026-900-qa.md`
- Ship：`requirements/reports/REQ-2026-900-ship.md`

## 验证计划
- 计划执行的命令：
  - `npm run test`
  - `npm run verify`
- 需要的环境：
  - 本地开发环境
  - 可访问列表页的演示数据
- 需要的人工验证：
  - URL 参数是否与筛选值一致
  - 搜索与筛选组合使用时是否正常

## 风险与回滚
- 风险：
  - 查询参数与默认值不一致时可能导致旧链接行为变化
  - 前端筛选值与后端枚举不一致时可能出现空结果
- 回滚方式：
  - 回退列表页查询参数解析逻辑
  - 移除状态筛选 UI 和对应查询分支

## 关键决策
- 2026-03-20：使用 URL 查询参数保存状态，避免仅依赖内存状态
- 2026-03-20：筛选逻辑复用现有查询层，不新增独立接口
