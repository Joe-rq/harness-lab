---
name: plan-ceo-review
description: Product and business review for requirements. Use when starting a new requirement or feature to ensure value alignment, scope clarity, and risk assessment. Triggers on phrases like "review this requirement", "product review", "CEO review", "business value check", or when assessing user value and business goals before implementation.
---

# /plan-ceo-review

Product and business perspective review for requirements.

## Execution Checklist

- [ ] Read requirements/INDEX.md for context
- [ ] Read context/business/ for domain knowledge
- [ ] Confirm user value and business goals
- [ ] Define scope boundaries (include/exclude)
- [ ] Identify key dependencies and blockers
- [ ] Assess risks with mitigation plans
- [ ] Document go/no-go recommendation

## Output Template

```markdown
## CEO Review: [Requirement Name]

### User Value
- Problem being solved
- Target users
- Expected impact

### Business Goals
- Strategic alignment
- Key metrics affected

### Scope
**Includes**: Feature A, Feature B
**Excludes**: Feature C (reason)

### Acceptance Criteria
1. Criterion 1
2. Criterion 2

### Risks
| Risk | Probability | Impact | Mitigation |
|-----|-------------|--------|------------|
| Risk 1 | High/Med/Low | High/Med/Low | Solution |

### Recommendation
- [ ] Proceed - Reason
- [ ] Pivot - Reason  
- [ ] Defer - Reason
```

## Stop Conditions

Do NOT proceed if:
- User value is unclear
- Critical dependencies unresolved
- Scope boundaries undefined
