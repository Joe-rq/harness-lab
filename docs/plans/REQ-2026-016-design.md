# REQ-2026-016 Design

## Background

当前 `/harness-setup` 和 `harness-install.mjs` 已经与仓库真实治理契约分叉：

- 文档没有说明 `req:create` 只生成骨架，容易让接入者误以为创建 REQ 后就能直接实施
- 安装器仍生成 `prompt` 型 PreToolUse 提示，而不是当前仓库使用的 `command` 硬阻断
- 安装器没有把 `req-check.sh`、`req-validation.mjs` 作为接入依赖完整带过去

这会直接导致“一键接入项目”和“模板仓库自身”处在两套不同治理机制上。

## Goal

- 保证一键安装产物与当前模板仓库的 hook 契约一致
- 保证一键安装说明与真实接入步骤一致
- 让测试能够稳定发现未来的一键接入契约漂移

## Scope

### In scope

- 更新安装器模块清单，补齐 hook / REQ 校验依赖脚本
- 更新安装器写入的 hooks 配置与权限白名单
- 更新安装报告、进度初始化文案和 CLI 收尾提示
- 更新 `/harness-setup` 文档中的模块说明、后续步骤和注意事项
- 更新治理测试，验证安装结果中的脚本和 hook 结构

### Out of scope

- 不改变模块选择 UI
- 不新增安装来源或 npm 发布方式
- 不重写 README 的整体结构

## Product Review

### User Value

- 解决的问题：避免接入者通过一键安装得到过期的治理行为
- 目标用户：首次接入 Harness Lab 的项目维护者和 AI agent
- 预期收益：一键安装后得到的 hooks、脚本和说明与模板仓库保持一致，不需要额外排查契约漂移

### Recommendation

- Proceed

## Engineering Review

### Architecture Impact

- 影响模块：`scripts/harness-install.mjs`, `.claude/commands/harness-setup.md`, `tests/governance.test.mjs`
- 依赖方向：安装器需与 `.claude/settings.example.json`、`scripts/req-check.sh`、`scripts/req-validation.mjs` 保持一致
- 需要新增或修改的边界：
  - hook 配置应使用 `command` 类型且包含 `SessionStart` / `PreToolUse`
  - `req:create` 骨架约束必须在安装说明和接入报告中显式出现
  - 自动化测试需要覆盖复制的依赖脚本与 hook 类型

### Verification

- 自动验证：`npm test`, `npm run docs:verify`, `npm run check:governance`
- 人工验证：检查安装报告和 `/harness-setup` 的文字说明是否与硬阻断行为一致
- 回滚：恢复安装器与 skill 文档原实现，并重新运行治理验证
