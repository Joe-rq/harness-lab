# Installer Contract Drift Needs Tests

## 场景

入口文档、示例配置和安装器很容易在多轮迭代后分叉。仓库自己已经升级到硬阻断治理，但一键安装仍可能继续产出旧版软提醒配置。

## 经验

- “README 已更新”不代表“一键接入已更新”
- 只检查文档存在性不够，安装器产物本身也要进自动化测试
- 对治理模板来说，安装器复制的脚本清单和生成的 hook 类型都属于契约，而不是实现细节

## 在 Harness Lab 中的落地

- 测试固定了安装器必须复制 `req-validation.mjs` 与 `req-check.sh`
- 测试固定了 `SessionStart` / `PreToolUse` 使用 `command` hook
- `/harness-setup`、安装报告和 CLI 收尾提示统一说明“`req:create` 只生成骨架”

## 复用建议

- 每次治理机制升级时，把“模板仓库入口文档”“示例配置”“安装器产物”当成同一批契约一起验证
- 对安装器增加至少一条“产物验证”测试，而不是只测函数返回值
