# REQ-2026-092 Design

## Requirements

### Functional

- 一个 manifest 定义安装模块文件、目标 scripts、profile/overlay、doctor 基础期望和发布文件。
- installer/doctor/tests 消费同一对象。
- package files 可从 manifest 确定性生成并只读检查。

### Non-Functional

- 零第三方依赖，Node 20+。
- manifest import 与校验为毫秒级本地操作。
- 非法/重复/不闭合定义 fail fast，不产生部分安装。
- 保持 P0 分发隐私 allowlist 和 installer 兼容导出。

## High-Level Architecture

```text
capability-manifest.mjs
  ├── modules/files ───────────────▶ harness-install
  ├── targetPackageScripts ────────▶ harness-install
  ├── profiles + hook overlay ─────▶ installer / next doctor phase
  ├── doctor expectations ─────────▶ harness-doctor
  └── publishedFiles ──────────────▶ capability-sync ─▶ package.json.files
                         └─────────▶ governance tests

independent semantic capability IDs / public commands ─▶ tests (anti-self-bootstrapping)
```

## Components

### Manifest

- 深冻结的 plain objects/arrays。
- `validateCapabilityManifest()` 检查 ID、相对 POSIX 路径、重复、未知 module/profile、overlay 依赖与 script shape。
- 导出 derived helpers，避免消费者复制遍历逻辑。

### Sync

- `--check`：比较 manifest 发布列表与 package files，输出 missing/extra/order mismatch，非零退出。
- `--write`：只更新 package JSON 的 `files`，稳定格式化。

### Consumers

- installer 的 `modules` 成为 manifest modules 的兼容导出。
- target scripts 直接由 manifest 获取并按 package-dir 包装。
- doctor 使用 manifest 中的脚本扩展与基础 Hook expectation；profile detection 在 REQ-093 实现。
- tests 用 manifest 推导完整清单，用独立语义集合验证关键能力存在。

## Failure Modes

| Failure | Behavior | Recovery |
|---------|----------|----------|
| 重复/非法 manifest | import/check 失败 | 修 manifest |
| package files 漂移 | `capabilities:check` 非零 | 运行 sync 并审阅 diff |
| profile 引用未知 module | fail fast | 修 profile closure |
| manifest 与公开能力共同漏项 | 独立语义 ID/command 断言失败 | 补回能力或显式调整产品契约 |

## Security

- 所有文件必须为仓库相对 POSIX 路径，拒绝绝对路径、`..` 和 NUL。
- 不放宽 npm allowlist；session/runtime 禁止项继续由 packed fixture 独立扫描。
- sync 不接受任意输出路径，不执行 manifest 中命令。

## Verification

- 单元：schema/duplicate/path/profile closure/sync drift/write。
- 集成：fresh/core/hook/package-dir/reinstall。
- 产物：真实 pack + offline install + lifecycle。
- 人工：确认 manifest 只包含稳定事实且无业务技术栈假设。
