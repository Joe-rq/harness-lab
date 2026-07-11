# 2026-07-11 公开分发与安装契约必须从真实产物验证

## 场景

治理框架源码仓库内“能运行”不等于用户从 npm tarball 获取后“能安装、能重装、失败可信”。本 REQ 将包名/bin 映射、发布文件边界、目标脚本与资产、用户状态保护和失败终态作为同一条信任链收口。

## 关联材料

- REQ: `requirements/completed/REQ-2026-089-review-plan-p0-distribution-installation.md`
- Design: `docs/plans/REQ-2026-089-design.md`
- Code Review: `requirements/reports/REQ-2026-089-code-review.md`
- QA: `requirements/reports/REQ-2026-089-qa.md`

## 问题 / 模式

- npm 包名与 bin 名不同，简写 `npx <bin>` 会被误解为另一个包；公开命令必须显式绑定 package 与 bin。
- 如果测试从运行时 manifest 动态生成预期，manifest 与实现一起漏项时测试仍会通过；最低公开契约必须有独立硬编码断言。
- progress、INDEX、REQ、settings 是用户状态，不是可随重装刷新的模板资产。
- 只验证 JSON 根对象不足以保护配置；Hook entry、hook item、permissions 和 npm script 值都需要写入前 shape 校验。
- 子串匹配 Hook 命令会把 `custom-session-start.js`、`echo scripts/req-check.js` 或不完整 matcher 当作有效配置。
- lexical path containment 不能阻止符号链接逃逸；安全敏感目标至少需要 realpath containment 与越界不写入测试。

## 关键决策

- 发布边界使用逐文件 npm allowlist，并从真实 `npm pack` 产物执行离线 npm exec 和 bin smoke，而不是只 import 源码安装器。
- 默认行为优先保护用户数据：已有状态逐字节保留；非法配置在任何复制前失败；显式升级/合并另设版本化协议。
- `success` 是零失败项的终态，不是流程走到末尾的横幅；copy/verify 任一失败都进入 partial、非零退出并保留诊断。
- core-only 是真实能力边界：不安装 CLI 就不修改 package、不提示可直接运行不存在的 CLI。

## 解决方案

1. 让 `package.json files`、安装 manifest、硬编码测试契约和三个公开说明面形成可交叉验证的四方约束。
2. 用 fresh、reinstall、clean-history、invalid-shape、copy/verify failure、symlink 和 Hook spoof 临时项目覆盖 happy/error/adversarial 路径。
3. 通过安装后的 npm aliases 跑完整 REQ lifecycle，证明的不只是文件存在，而是用户公开入口真正可调用。
4. 将候选 tarball 文件数、体积、禁止路径和本机路径扫描纳入 QA 证据。

## 复用建议

- 所有 CLI 分发项目都应区分“源码 smoke”“打包 smoke”“公开命令 smoke”，三者不可互相替代。
- 对安装器/脚手架，用户状态默认 preserve；reset/upgrade 必须显式、可回滚并有所有权依据。
- 安全断言要测试看起来很像正确输入的伪装样本，而不只测试完全缺失输入。
- 后续 capability manifest 仍需保留一份独立最低产品契约，避免再次出现自举式绿灯。
