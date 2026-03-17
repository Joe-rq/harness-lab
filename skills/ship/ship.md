---
name: ship
description: Release engineering and deployment. Use when deploying to production, releasing features, or completing the delivery pipeline. Triggers on phrases like "ship this", "deploy to prod", "release feature", "go live", or when finalizing code delivery to production.
---

# /ship

Release engineering and safe deployment.

## Pre-Release Checklist

- [ ] All tests passing
- [ ] Code review approved
- [ ] Documentation updated
- [ ] Changelog updated

## Build
- [ ] Execute build process
- [ ] Verify build artifacts
- [ ] Check build logs

## Staging Verification
- [ ] Deploy to staging
- [ ] Run smoke tests
- [ ] Verify critical functions

## Production Release
- [ ] Execute release plan
- [ ] Monitor deployment
- [ ] Verify success

## Post-Release
- [ ] Monitor metrics
- [ ] Check error rates
- [ ] Verify user feedback
- [ ] Confirm rollback ready

## Output Template

```markdown
## Ship Report: [Version/Feature]

### Release Info
- Version:
- Date:
- Release manager:

### Changes
- Feature 1
- Feature 2
- Fix 1

### Pre-Release Check
- [ ] Tests pass
- [ ] Review approved
- [ ] Docs updated

### Result
- Status: ✅ Success / ❌ Failed / ⚠️ Partial
- Issues: [if any]

### Metrics
- Error rate:
- Performance:

### Rollback Plan
If issues detected:
1. Step 1
2. Step 2
```

## Stop Conditions

Do NOT ship if:
- No rollback plan
- Tests failing
- No monitoring in place
- Unattended deployment
