---
name: qa
description: Quality assurance and functional verification. Use when testing implementations, verifying features work correctly, or validating requirements are met. Triggers on phrases like "test this", "QA check", "verify feature", "quality assurance", or when confirming functionality before release.
---

# /qa

Functional verification and quality assurance.

## QA Checklist

### Functional Verification
- [ ] Test against requirements document
- [ ] Verify happy path works
- [ ] Test error scenarios
- [ ] Check boundary conditions
- [ ] Validate data handling

### Browser Testing (if UI)
- [ ] Start application
- [ ] Navigate through UI flows
- [ ] Capture screenshots
- [ ] Verify visual rendering
- [ ] Check responsive behavior

### Log Verification
- [ ] Check for error logs
- [ ] Review performance logs
- [ ] Verify key log outputs
- [ ] Check warning messages

### Regression Testing
- [ ] Run full test suite
- [ ] Check for regressions
- [ ] Verify core workflows
- [ ] Test integration points

## Output Template

```markdown
## QA Report: [Feature/Requirement]

### Test Environment
- Branch:
- Version:
- Environment:

### Functional Tests
| Test Case | Status | Notes |
|-----------|--------|-------|
| Test 1 | ✅/❌ | |
| Test 2 | ✅/❌ | |

### Browser Verification
- Screenshot: [link]
- Result: ✅/❌

### Issues Found
1. Issue → Severity → Recommendation

### Conclusion
- [ ] Pass - Ready for release
- [ ] Fail - Requires fixes
```

## Stop Conditions

Do NOT pass if:
- Tests not executed
- Critical functionality broken
- Requirements not met
- "Looks good" without verification
