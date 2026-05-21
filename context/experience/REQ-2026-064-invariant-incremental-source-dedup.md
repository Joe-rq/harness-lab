# REQ-2026-064 invariant incremental 来源去重经验

## 场景

`req:complete` 会自动触发 experience 到 invariant 的增量抽取。这个链路如果去重失效，会在每次完成 REQ 时生成一批重复 draft invariant，污染 git status 并降低经验回流信号质量。

## 问题或模式

- 已有 invariant 里记录的来源通常是 `experience/foo.md` 或 `context/experience/foo.md`。
- incremental scan 比较时使用的是裸文件名 `foo.md`。
- 两边格式不一致，导致已处理 experience 仍被当成新来源。

## 根因或关键判断

去重不能比较展示用字符串，必须先把来源归一成稳定 key。本场景的稳定 key 是 experience 文件 basename。

## 解决方案

- 从 invariant 内容中提取所有 `experience/*.md` / `context/experience/*.md` 来源。
- 统一取 basename 存入 `processedSources`。
- 回归测试同时验证“旧来源跳过”和“新来源仍生成”。

## 后续项目如何复用

- 对自动生成链路做 incremental 模式时，source key 要先归一化。
- 清理生成噪音只能作为临时操作，真正修复必须落到去重判断。
- 回归测试要同时覆盖跳过路径和新增路径，避免把生成能力误关掉。

## 相关交付物

- REQ：`requirements/completed/REQ-2026-064-fix-invariant-incremental-source-dedup.md`
- Code Review：`requirements/reports/REQ-2026-064-code-review.md`
- QA：`requirements/reports/REQ-2026-064-qa.md`
