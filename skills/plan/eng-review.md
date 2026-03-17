---
name: plan-eng-review
description: Technical architecture and engineering review. Use when designing technical solutions, assessing implementation approaches, or before coding complex features. Triggers on phrases like "engineering review", "technical design", "architecture review", " feasibility check", or when evaluating technical risks and solution options.
---

# /plan-eng-review

Technical perspective review to ensure solution feasibility.

## 80-Point Engineering Checklist

### Architecture (Points 1-20)
- [ ] Read context/tech/architecture.md
- [ ] Assess impact on existing architecture
- [ ] Verify layer compliance (Types→Config→Repo→Service→UI)
- [ ] Check dependency directions
- [ ] Identify new/modified modules

### Data (Points 21-35)
- [ ] Evaluate data model changes
- [ ] Plan database migrations
- [ ] Assess data consistency requirements
- [ ] Check sensitive data handling

### APIs (Points 36-45)
- [ ] Design API interfaces
- [ ] Check backward compatibility
- [ ] Verify permission controls
- [ ] Define API contracts

### Performance (Points 46-55)
- [ ] Assess performance impact
- [ ] Identify bottlenecks
- [ ] Design caching strategy
- [ ] Evaluate concurrency needs

### Security (Points 56-65)
- [ ] Check input validation
- [ ] Assess injection risks
- [ ] Verify XSS protection
- [ ] Check sensitive info exposure

### Operations (Points 66-80)
- [ ] Assess deployment impact
- [ ] Plan monitoring needs
- [ ] Design logging strategy
- [ ] Define rollback plan

## Output Template

```markdown
## ENG Review: [Requirement Name]

### Architecture Impact
- Affected modules:
- Architecture diagram: [link]
- Data flow: [link]

### Technical Solution
**Overview**: Brief description

**Key Decisions**:
1. Decision 1: Chose A over B because...
2. Decision 2: ...

### Risk Matrix
| Risk | Probability | Impact | Mitigation |
|-----|-------------|--------|------------|
| Risk 1 | High/Med/Low | High/Med/Low | Solution |

### Effort Estimate
- Development: X days
- Testing: Y days
- Documentation: Z days

### Checklist Results
- [ ] Architecture compliant
- [ ] API design complete
- [ ] Test strategy defined
- [ ] Deployment plan ready

### Recommendation
- [ ] Proceed as designed
- [ ] Revise and re-review
- [ ] Split into smaller tasks
```

## Stop Conditions

Do NOT proceed if:
- No architecture diagram provided
- Performance/security risks unaddressed
- Effort significantly underestimated
