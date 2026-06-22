# REQ-2026-087 Code Review：OPT-3 — 经验文档自动草稿

## 状态
- ✅ 通过（自审）

## 范围合规
- 改动限于声明范围：`scripts/req-cli.mjs`（`experienceCommand` 聚合 + `completeCommand` AUTO-DRAFT 检测 + 5 聚合函数 + `readEvents` import）/ `tests/governance.test.mjs`（`testExperienceAutoDraftFlow`）/ `README.md`
- **清理孤儿**：`buildExperienceContent`（`experienceCommand` 改用 `buildExperienceDraft` 后的死代码）已删
- 未触碰 CANNOT：`event-store.mjs`（只复用 `readEvents`，不改）/ `req-validation.mjs` / `REQ_TEMPLATE.md` / experience 模板格式

## 主要发现
1. **聚合四源**（REQ 背景/关键决策 + `git log --grep` + reports 结论行 + 事件账本时间线），纯脚本无 LLM，守零依赖。
2. **AUTO-DRAFT 标记** + `complete` 检测为 `console.warn`（不阻断）——人工确认是闸门，不是 hook（遵守"警告优先于阻断"）。
3. **降级**：无 git/报告 → 对应段写「(无)」，不报错。
4. **清理 `buildExperienceContent` 孤儿**（本次改动产生）。
5. **Bug 修正**：AUTO-DRAFT 检测的 `readFileSync` 路径需 `context/experience/` 前缀（`findExperienceDocs` 返回文件名不含目录）——首次测试 ENOENT 暴露，已修。

## 风险与回滚
- 草稿质量低 → `governance:health` 不变量统计兜底；AUTO-DRAFT 仅提醒不阻断，不新增强制摩擦。
- 回滚：`experience` 还原 `buildExperienceContent` 空模板 + `complete` 移除 AUTO-DRAFT 检测。

## 结论
OPT-3 降低完成摩擦（实证：REQ-085/086 都 `--skip-experience`，本 REQ 后 experience 自动聚合草稿，`--skip-experience` 滥用应下降）。为 invariant 系统攒真实素材（OPT-4 前置）。**内循环至此停**（OPT-1✅ / OPT-2 缓 / OPT-3✅ / OPT-4 缓 / OPT-5 不做 / OPT-6 待第二项目），下一步转向第二个真实项目受控实验。
