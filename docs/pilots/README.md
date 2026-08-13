# External Pilot Protocol

外部 pilot 用于验证 Harness Lab 在真实项目里的采用与恢复体验，不用于制造 demo 绿灯。

## 纳入标准

- 独立 Git 项目，类型为 JavaScript、Python 或 monorepo。
- 有维护者确认的真实待办与真实验证命令。
- 接入前完成只读 preflight、dirty state 记录与 installer dry-run。
- 维护者明确授权写入；现有 AGENTS/CLAUDE/REQ/设置必须合并或保留。

## 完成标准

- 每项目至少两个真实业务 REQ completed，均有 review、QA 和项目验证证据。
- observation window 为 14–28 天，包含一次或以上跨会话恢复。
- 有首个 REQ、恢复、incident、exemption、repeat-use 原始记录。
- `pilot:observe validate --complete true` 通过，并输出脱敏 summary。

fixture、安装自测、纯治理文档改动和 Harness Lab 自身 REQ 不计入两个周期。

## 数据边界

原始 `.harness/pilot/*.jsonl` 留在 pilot 项目，不上传代码、路径、环境变量或提示词。Harness Lab 仓库只接收脱敏 summary、REQ/report 相对引用和人工结论。三项目若由同一维护者操作，只能支持跨技术栈适配结论，不能称为独立用户留存。

## CLI 示例

```bash
npm run pilot:observe -- init --pilot-id pilot-js-01 --project-type javascript --baseline-ref a1b2c3d --at 2026-07-12T10:00:00+08:00 --output .harness/pilot/observation.jsonl
npm run pilot:observe -- record --input .harness/pilot/observation.jsonl --event cycle_started --req-id REQ-2026-001 --at 2026-07-12T11:00:00+08:00
npm run pilot:observe -- summary --input .harness/pilot/observation.jsonl --output .harness/pilot/summary.json
npm run pilot:observe -- validate --input .harness/pilot/observation.jsonl --complete true --as-of 2026-07-26T12:00:00+08:00
```

每次 record 都先验证整个事件序列；非法顺序、未知字段、失败验证周期或不足 14 天的 complete 会返回非零。
