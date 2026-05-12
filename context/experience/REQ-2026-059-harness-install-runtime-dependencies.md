# REQ-2026-059 经验：迁移安装不能只验证文件存在

## 场景

`harness-install` 会把模板仓库的治理脚本复制到目标项目。REQ-2026-058 给源仓库新增了 worktree 运行时工具，但迁移清单没有同步复制该工具，导致目标项目可能复制了 `req-cli.mjs` 入口，却缺少它 import 的依赖。

## 经验

- 安装器测试应在复制后的 fixture 中实际执行关键入口，而不是只断言文件存在。
- 对 ESM 脚本，运行时 import 依赖必须显式进入迁移清单。
- 迁移入口文档、source-command skill 和安装器清单需要作为同一契约维护。

## 下次复用

当修改 `scripts/*.mjs` 或跨平台 hook 的 import 依赖时，同步检查：

1. `scripts/harness-install.mjs` 的模块文件清单是否包含新增依赖。
2. `tests/governance.test.mjs` 是否在安装后的临时项目中实跑关键入口。
3. `/harness-setup` command、source-command skill、README 是否说明真实安装边界。
