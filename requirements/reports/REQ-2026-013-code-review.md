# REQ-2026-013 Code Review

**日期**：2026-03-29
**审查者**：AI Assistant
**状态**：✅ 通过

## 变更摘要

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `tests/governance.test.mjs` | 新增 | 仓库级自动化回归入口 |
| `.github/workflows/governance.yml` | 新增 | push / pull request 自动门禁 |
| `package.json` | 修改 | 将 `npm test` 绑定到仓库级自动化测试 |
| `scripts/check-governance.mjs` | 修改 | 把测试入口和 workflow 纳入最小治理契约 |
| `README.md` / `CONTRIBUTING.md` / `CLAUDE.md` | 修改 | 对齐仓库级自动化验证说明 |
| `scripts/req-cli.mjs` / `scripts/harness-install.mjs` | 修改 | 暴露可测试入口并避免 import 时自动执行 CLI |

## 主要检查点

### 正确性

- [x] `npm test` 在当前仓库通过
- [x] 自动化测试覆盖了 `docs-verify`、`req-cli` 生命周期、`harness-install` 关键路径
- [x] workflow 覆盖 `push` 和 `pull_request`
- [x] `check-governance` 会检查测试文件、workflow 和 `test` script 的存在性

### 可维护性

- [x] 采用 Node 内置能力，没有引入第三方测试依赖
- [x] 没有把自动化逻辑塞进目标项目模板，只增强仓库自身
- [x] 通过为脚本增加“可导入不自执行”的结构提升可测试性，而不是复制第二套逻辑

### 风险评估

- [x] 避免使用 `node --test`，改为单进程脚本，规避当前沙箱对测试子进程的限制
- [x] 保持现有 `docs:verify` / `check:governance` 命令不变，CI 直接复用现有治理门禁

## 发现的问题

本次 review 未发现新的阻断问题。

## 结论

这次改动把 Harness Lab 从“需要手动跑治理命令”推进到了“仓库本身具备自动化回归 + CI 门禁”的阶段，建议合并。
