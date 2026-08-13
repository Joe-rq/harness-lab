# 2026-07-11 首次用户旅程必须同时验证命名、真实命令与独立安装基线

## 场景

一个治理框架即使安装成功，首个 REQ 仍可能因中文 slug、错误技术栈假设、虚假的 mode 文案或未隔离安装 diff 而在 create/start/complete 任一阶段中断。文档可执行性必须从发布候选产物验证，而不只是检查字符串存在。

## 关联材料

- REQ: `requirements/completed/REQ-2026-091-p0-executable-user-docs.md`
- Design: `docs/plans/REQ-2026-091-design.md`
- Code Review: `requirements/reports/REQ-2026-091-code-review.md`
- QA: `requirements/reports/REQ-2026-091-qa.md`

## 问题 / 模式

- 人类语言标题与文件系统 slug 是两个问题；不能要求用户为了创建需求先翻译标题。
- 显式 slug 是文件路径输入，必须在写入前严格校验，不能对 traversal 或空白做静默“修正”。
- 识别到 Python/Go/Rust 不等于对应测试工具已配置；候选命令与真实验证证据必须分开。
- 安装 profile 决定装哪些 Hook，mode 决定不了全部 Hook 的统一行为；分散实现只能按 Hook 如实说明。
- fresh install 后的治理文件若未形成独立基线，会污染首个业务 REQ 的 diff-aware 文档义务。

## 关键决策

- 无 ASCII 标题使用固定 `requirement` 文件后缀，experience 使用 `experience`；REQ ID 提供唯一性，正文/索引保留原标题。
- 显式 slug 仅接受 lowercase ASCII kebab-case，路径、空白、大小写和连续连字符均拒绝。
- `/first-req` 选择已安装的 npm alias 或 direct Node 入口；业务验证命令只能来自项目配置或维护者确认。
- README 用逐 Hook 表代替三行全局 mode 口号，并明确这只是当前事实。
- packed fixture 先审阅并提交安装基线，再用公开默认命令完成中文 REQ 生命周期，不使用 `--no-docs-gate`。

## 复用建议

- CLI 产品应把国际化标题与安全文件名策略分别设计，并为无 ASCII 输入提供确定性 fallback。
- “文档命令测试”至少要有静态契约和真实产物运行两层；前者抓漂移，后者抓缺文件、缺 alias 和隐含前提。
- diff-aware 工具的 onboarding 文档必须说明基线边界，否则首个业务变更会继承安装噪音。
- 技术栈模板应写“如何确认真实命令”，而不是把流行工具名当成默认事实。
