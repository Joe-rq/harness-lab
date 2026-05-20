# Code Review: REQ-2026-064

## Findings

未发现阻断性问题。

## Review Notes

- 根因明确：已有 invariant 中记录的是 `experience/foo.md` 或 `context/experience/foo.md`，但 incremental scan 用裸文件名 `foo.md` 判断是否处理过，导致去重永远匹配不上。
- 修复新增 `extractExperienceSources()`，从 invariant 内容中提取 experience 来源并统一归一到 basename。
- 回归测试覆盖两个关键行为：已处理来源不重复生成，新来源仍会生成 draft invariant。
- 清理了本次 completion 副作用生成的未跟踪重复 draft invariant，避免把噪音带入交付。

## Residual Risk

- 如果未来 invariant 来源格式完全脱离 `experience/*.md`，需要同步扩展来源解析规则。

## Conclusion

修复针对根因，范围小，可以进入 QA。