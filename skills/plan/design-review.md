---
name: plan-design-review
description: UI/UX design system compliance review. Use when implementing user interfaces, creating new components, or ensuring visual consistency. Triggers on phrases like "design review", "UI check", "design system", "component review", or when working with visual interfaces and user experience.
---

# /plan-design-review

Design system compliance and UX quality review.

## 80-Point Design Checklist

### Visual Standards (Points 1-20)
- [ ] Colors follow design system
- [ ] Typography matches specs
- [ ] Spacing uses design tokens
- [ ] Icons from approved library

### Interaction Standards (Points 21-40)
- [ ] Interaction patterns consistent
- [ ] State feedback provided
- [ ] Error handling designed
- [ ] Loading states defined

### Components (Points 41-55)
- [ ] Uses standard components
- [ ] New components justified
- [ ] Component naming follows convention
- [ ] Component docs updated

### Responsive Design (Points 56-65)
- [ ] Mobile layout tested
- [ ] Tablet layout tested
- [ ] Breakpoints appropriate
- [ ] Layout strategy defined

### Accessibility (Points 66-80)
- [ ] Color contrast sufficient
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Semantic HTML used

## AI Slop Detection

Watch for these AI generation issues:
- [ ] Fake/non-existent references
- [ ] Inconsistent visual styles
- [ ] Overly complex designs
- [ ] Poor UX patterns

## Output Template

```markdown
## Design Review: [Requirement Name]

### Standards Check
| Check | Status | Notes |
|-------|--------|-------|
| Color | ✅/❌ | |
| Typography | ✅/❌ | |
| Components | ✅/❌ | |
| Responsive | ✅/❌ | |
| Accessibility | ✅/❌ | |

### Design Decisions
- Key choices made
- Reference patterns used
- Special handling noted

### Issues Found

**Critical (Must Fix)**:
1. Issue → Solution

**Medium (Should Fix)**:
1. Issue → Solution

**Minor (Optional)**:
1. Issue → Solution

### Recommendation
- [ ] Proceed
- [ ] Revise design
```

## Stop Conditions

Do NOT proceed if:
- Critical accessibility issues
- Major design system violations
- UX patterns harm usability
