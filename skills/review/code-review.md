---
name: review
description: Code quality and standards review. Use when reviewing code changes, pull requests, or ensuring implementation quality. Triggers on phrases like "code review", "review this PR", "check this code", "quality review", or when verifying code meets standards and best practices.
---

# /review

Code quality, standards, and correctness review.

## Review Checklist

### Architecture Compliance
- [ ] Follows layer architecture (Types→Config→Repo→Service→UI)
- [ ] Dependency direction correct
- [ ] Module boundaries respected
- [ ] No circular dependencies

### Code Quality
- [ ] Readable and maintainable
- [ ] Naming follows conventions
- [ ] Comments where needed
- [ ] Complexity reasonable

### Functional Correctness
- [ ] Business logic correct
- [ ] Edge cases handled
- [ ] Error handling complete
- [ ] Concurrency safe (if applicable)

### Test Coverage
- [ ] Unit tests present
- [ ] Integration tests present
- [ ] Edge cases tested
- [ ] Error paths tested

### Security
- [ ] Input validated
- [ ] No SQL injection risks
- [ ] No XSS vulnerabilities
- [ ] No sensitive data leaks

### Performance
- [ ] Algorithm complexity acceptable
- [ ] Resource usage reasonable
- [ ] Caching used appropriately
- [ ] Database queries optimized

## Output Template

```markdown
## Code Review: [PR/Change]

### Result
- [ ] Approved
- [ ] Changes requested
- [ ] Needs discussion

### Critical Issues (Must Fix)
1. Issue → Suggested fix

### Medium Issues (Should Fix)
1. Issue → Suggested fix

### Minor Issues (Optional)
1. Issue → Suggested fix

### Positive Notes
- Well done aspects

### Action Items
- [ ] Fix issue 1
- [ ] Fix issue 2
- [ ] Update docs
```

## Stop Conditions

Do NOT approve if:
- Linter errors present
- No tests for new code
- Architecture violations
- Security vulnerabilities
