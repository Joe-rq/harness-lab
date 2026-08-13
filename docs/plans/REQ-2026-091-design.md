# REQ-2026-091 Design

## Background

最后一组 P0 是首次采用契约而非新治理能力：创建中文 REQ、选择真实验证命令、理解安装 profile 与 mode、照 README 完成一个生命周期。

## Goal

- 中文主题不再因 ASCII slug 失败。
- 向导和模板不再把 Node/npm 当作所有项目的默认事实。
- README 只陈述真实 Hook 行为，公开命令由安装 fixture 执行。

## Scope

### In scope

- REQ create/experience 的安全 ASCII fallback 与显式 slug 校验。
- `/first-req` 的双入口和真实验证命令选择规则。
- 通用 REQ 模板、testing strategy 与 README 的事实校正。
- packed install 后的 README 命令契约测试。

### Out of scope

- capability manifest、mode 状态机、profile-aware doctor。
- transliteration、外部依赖、任意技术栈命令自动执行。
- Hook 行为、installer profile 或发布渠道修改。

## Product Review

### User Value

- 解决的问题：新用户可以用母语创建第一个 REQ，不因隐藏 slug 规则或错误 npm 假设在激活阶段中断。
- 目标用户：JavaScript、Python、Go、Rust 或通用仓库中的单一操作者。
- 预期收益：README 最短路径与真实安装产物一致，首次可启动 REQ 不再依赖猜测。

### Recommendation

- Proceed。它是原评审四组 P0 的最后一组，且可用小范围兼容修复闭合。

## Engineering Review

### Architecture Impact

- 影响模块：REQ filename policy、source-command 文档、验证上下文、README fixture。
- 依赖方向：CLI 提供稳定命名；skill/README 只消费公开入口；测试从候选 tarball验证。
- 边界：不抽取 capability manifest，不让文档测试成为新的运行时来源。

### Design

#### 1. Slug policy

```text
explicit --slug ──> strict /^[a-z0-9]+(?:-[a-z0-9]+)*$/
title ASCII slug ─> existing slugify
no ASCII output ──> "requirement"
```

REQ ID 使 fallback 文件名保持唯一。experience 使用同一“非空 ASCII”原则，避免尾部空 slug。

#### 2. Verification truth policy

- package alias 存在时可通过 npm 入口运行治理 CLI；否则使用已安装的 `node scripts/req-cli.mjs`。
- 业务验证命令必须先检查项目配置；无法确认时保留“待填写真实命令”，不执行猜测。
- testing strategy 提供按生态选择的示例矩阵，明确只采用目标仓库实际存在的行。

#### 3. Mode/profile wording

- profile 描述“安装了哪些 Hook”。
- mode 描述“各 Hook 在各风险点当前如何响应”。
- README 明确没有统一的全局三档语义；基础 `req-check` 不读取 mode，`scope-guard` 对越界始终阻断，高级 Hook 各自解释 mode。

#### 4. Executable docs fixture

- 从真实 npm tarball 执行公开 installer bin。
- 在 fresh target 执行 doctor 与 REQ lifecycle aliases。
- lifecycle 包含中文 create、start、status、完整 block 参数、resume、experience、reflect、align、complete。
- 静态断言锁定 README/first-req 的必要参数与技术栈中立措辞；运行断言证明入口可调用。

### Verification

- 自动验证：中文/英文/显式 slug unit fixture；packed install README journey；文档契约断言；完整测试/文档/治理/doctor/pack 门禁。
- 人工验证：按 JS 与非 JS 两条 first-req 路径走读；按源码核对 mode 表。
- 回滚：整体还原六个范围文件，无数据迁移。

## Risks

- 固定 fallback 可读性有限，但比失败或不安全路径更可靠；标题和索引保留语义。
- mode 矩阵可能随未来 P1 实现变化；测试应要求关键事实而不锁定全部排版。
- packed journey 成本增加；复用现有 fresh-install fixture，避免第二次完整打包安装。
