# REQ-2026-014 Design

## Background

Harness Lab 当前的主要可移植性摩擦点，不是模板 guard 本身，而是接入后的命令绑定仍靠人工补：

- 目标项目可能已经有真实 `lint / test / build`
- 但安装器不会复用它们，也不会自动生成 `verify`
- 缺失绑定时只有 README 提示，没有统一的 placeholder 行为和缺口报告

这让接入体验停留在“文件接进去了，但还要自己收尾”的阶段。

## Goal

- 让安装器尽可能复用目标项目已有的真实命令
- 为无法自动绑定的命令提供统一 placeholder guard 和清晰缺口报告
- 把新的绑定契约写回文档、治理自检和自动化测试

## Scope

### In scope

- 新增 `scripts/template-guard.mjs`
- 增强 `scripts/harness-install.mjs` 的 `package.json` 绑定能力
- 更新 README / `/harness-setup` 说明
- 为绑定逻辑补自动化测试和安装回归测试

### Out of scope

- 猜测非标准脚本名的语义映射
- 为 pnpm / yarn / bun 各自生成不同风格的复杂脚本组合
- 自动改写目标项目现有业务命令

## Product Review

### User Value

- 解决的问题：接入后还要人工补命令绑定，导致治理模板落地摩擦大
- 目标用户：首次将 Harness Lab 接入已有项目的维护者
- 预期收益：已有真实命令的项目能更快完成接入，缺失命令的项目也能得到清晰缺口报告

### Recommendation

- Proceed

## Engineering Review

### Architecture Impact

- 影响模块：安装器、package scripts、安装报告、自动化测试、入口文档
- 依赖方向：继续使用 Node 内置能力，不新增依赖
- 需要新增或修改的边界：安装器允许对目标项目 `package.json` 做安全的增量更新，但不得覆盖已有真实脚本

### Verification

- 自动验证：
  - `npm test`
  - `npm run docs:verify`
  - `npm run check:governance`
- 人工验证：
  - 在临时 Git 仓库中分别验证“已有真实脚本”和“缺失真实脚本”两类安装场景
- 回滚：
  - 回退安装器、template guard、文档和测试改动

## Design

### 1. 把 placeholder guard 统一成单独脚本

- 新增 `scripts/template-guard.mjs`
- 模板仓库 `package.json` 的 guard 脚本改为复用该脚本
- 安装器的 CLI 模块一并复制该 guard，保证目标项目也能得到统一行为

### 2. 安装器对目标项目 `package.json` 做安全增量更新

- 如果目标项目存在 `package.json`：
  - 保留已有的真实 `lint / test / build / verify`
  - 对缺失的 `lint / test / build` 写入 placeholder guard
  - 如果 `verify` 缺失，优先用已存在的真实 `lint / test / build` 组合生成 `verify`
  - 如果三个基础命令都缺失，则 `verify` 也写入 placeholder guard
- 同时补齐 Harness Lab 的治理脚本入口，例如 `req:create`、`docs:verify`、`check:governance`

### 3. 安装报告显式展示绑定结果

- 报告中新增“命令绑定状态”区块：
  - 哪些脚本已复用目标项目真实命令
  - 哪些脚本仍是 placeholder，需要后续人工绑定
  - `verify` 是自动组合出来的还是占位脚本

### 4. 自动化验证覆盖绑定场景

- 测试“已有真实 lint/test/build”场景：应自动生成 `verify`
- 测试“缺失真实命令”场景：应写入 placeholder guard，不覆盖现有脚本
- README 与 `/harness-setup` 说明同步更新

## Implementation Checklist

- [x] 补齐 REQ 与设计稿
- [x] 新增 template guard 并统一 package scripts
- [x] 增强安装器的 package.json 绑定逻辑
- [x] 更新测试、文档和安装报告
- [x] 运行真实验证并完成 REQ
