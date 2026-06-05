# REQ-2026-079 verified governance defects 经验

## 场景

一次全面评审报告经过二次核实后，形成了“哪些成立、哪些数字需修正、哪些只是本地配置问题”的清单。后续动作不能停留在报告层，必须把已核实且影响治理可信度的问题转成可验证修复。

## 问题

治理框架最容易出现的失信点不是单个 bug，而是“报告说得对，但仓库继续带病运行”：

- dogfood hook 指向已删除入口。
- REQ 文件名契约在 `req-cli` 和 `req-check` 之间漂移。
- event rotation 的测试只覆盖首次归档，没覆盖 archive 已存在分支。
- 安全问题藏在辅助检查路径里，例如 shell 文件语法检查。

## 根因

1. 历史迁移删除 `.sh` 入口后，分发模板修了，但本地 `settings.local.json` 没同步。
2. `req-check.js` 没复用 `req-cli.mjs` 的按 ID 查 slug 文件思路。
3. rotation 测试只验证“有 archive 且总数可读”，没有验证第二次同月 rotation 后的唯一性。
4. 自动 review 的 legacy 路径仍保留早期 shell 拼接写法。

## 解决方案

1. 把核实清单拆成“成立 / 修正数字 / 定性修正”，只修成立且影响执行的缺陷。
2. 每个缺陷至少补一个能复现原失败的回归点。
3. 对本地配置和模板分发配置分开定性：`settings.example.json` 正确时，不把 local 污染扩大成分发风险。
4. 对超出本 REQ 的债务明确非目标，例如权限表清理、`req-cli` 拆分和 draft invariant 批量处理。

## 后续复用

以后处理审计报告时，按这个顺序推进：

1. 先复核事实和数字，不直接照单全收。
2. 把“定性错误但底层问题成立”的项重新降级或改名。
3. 只把已复现的问题纳入修复 REQ。
4. 给每个修复补最小回归测试，并把命令证据写入 QA。

<!-- Source file: REQ-2026-079-verified-governance-defects.md -->
