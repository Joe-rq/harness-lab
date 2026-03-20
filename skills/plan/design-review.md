---
name: plan-design-review
description: UI/UX and interaction review for requirements that include user-facing experience.
---

# /plan-design-review

输出目标：围绕当前 REQ 的界面、交互和可用性给出设计评审，并把结论沉淀到设计稿中。

## 输入

开始前至少确认：
- 当前 REQ 文件
- 对应设计稿
- 相关产品或设计规范
- 目标仓库已有的设计系统约束

## 审查重点

### Interface
- [ ] 关键信息层级是否清楚
- [ ] 状态、错误、空态和加载态是否定义
- [ ] 交互路径是否与用户目标一致

### Consistency
- [ ] 是否遵循目标仓库已有设计系统
- [ ] 是否复用已有组件和模式
- [ ] 是否避免风格漂移或 AI 生成痕迹

### Accessibility and Responsiveness
- [ ] 可访问性要求是否覆盖
- [ ] 不同尺寸设备的布局是否考虑

## 输出建议

优先把结论写入：
- `docs/plans/REQ-YYYY-NNN-design.md`

## 输出最低内容

```markdown
## Design Review

### User Flow
- 主路径：
- 关键状态：

### Standards Check
| Area | Status | Notes |
|------|--------|-------|
| Visual | Pass / Fail | |
| Interaction | Pass / Fail | |
| Accessibility | Pass / Fail | |
| Responsive | Pass / Fail | |

### Issues
- High:
- Medium:
- Low:

### Recommendation
- Proceed / Revise
```

## 约束

- 没有真实用户路径时，不要只审美术细节
- 不要引入与目标仓库明显不一致的设计语言
- 存在严重可访问性或可用性问题时，不要给 Proceed 结论
