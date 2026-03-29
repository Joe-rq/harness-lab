# Code Review: REQ-2026-017

## 审查范围
- `scripts/req-check.sh`

## 改动摘要
修复了当没有活跃 REQ 时 Hook 直接允许所有操作的漏洞。

## 代码质量
- ✅ 逻辑正确：当没有活跃 REQ 时，只允许写入 requirements/ 和 docs/plans/ 目录
- ✅ 错误提示清晰：明确告知用户需要创建 REQ
- ✅ 向后兼容：req:create 流程不受影响（自动创建豁免文件）

## 状态
- ✅ 通过
