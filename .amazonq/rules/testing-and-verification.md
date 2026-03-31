# Testing and Verification Rules

## When to Write Tests

- When creating new modules, functions, or services
- When fixing bugs — write a test that reproduces the bug and verifies the fix
- When refactoring existing code — ensure existing behavior is preserved

## Test File Conventions

### Backend Tests (ts-mocha + chai + sinon)

- Location: `backend/test/` mirroring the `backend/src/` directory structure
- File naming: `<module>.test.ts`
- Test runner: ts-mocha with chai assertions and sinon for mocking
- Config: `.mocharc.yml`, tsconfig from `backend/tsconfig.json`

### Frontend Tests (Jest)

- Location: `src/__tests__/`
- Config: `jest.frontend.config.js`

### Mocking Patterns

- **Database layer tests** (testing DynamoDB commands directly): use `mockClient` from `aws-sdk-client-mock`
  - Known issue: `aws-sdk-client-mock@4.1.0` has type incompatibility with `@smithy/types@4.x` — use `as any` casts with a comment explaining the reason
- **Business logic / service tests** (testing application behavior): use `sinon.stub()` to stub dependencies

## Verification Steps

After writing or modifying tests, always run these checks **in order**. Fix any errors before proceeding to the next step.

### 1. Type Check

```bash
npx tsc --project backend/tsconfig.json --noEmit
```

Ensures there are no TypeScript compilation errors.

### 2. Lint

Run lint for the area you modified:

```bash
# Backend
npm run lint:backend

# Frontend
npm run lint:app

# Common
npm run lint:common

# Full type check
npm run lint:tsc

# All at once
npm run lint
```

Key lint rules to be aware of:

- `@typescript-eslint/consistent-type-assertions`: Do not use `as Type` on object literals. Use a variable or a helper function instead.
- `mocha-no-only/mocha-no-only`: Never commit `.only` on tests.

### 3. Run Tests

Run in this order — first the modified file alone, then all backend tests together (as CI does):

```bash
# Single test file
npx cross-env AWS_PROFILE=nonexistent npx ts-mocha -p "./backend/tsconfig.json" "backend/test/path/to/file.test.ts"

# All backend tests (must pass — catches mock collisions and test isolation issues)
npm run test:backend

# All frontend tests
npm run test:frontend

# All tests
npm run test
```

**Important:** Always run `npm run test:backend` (or `npm run test`) even if the single file passes. Tests that pass alone can fail when run together due to shared global state (e.g. `mockClient` patching `DynamoDBDocumentClient.prototype.send`).

### 4. Summary

Before considering the work done, confirm:

- [ ] `tsc --noEmit` passes
- [ ] `lint` passes (no errors)
- [ ] Single test file passes
- [ ] All backend tests pass together (`npm run test:backend`)
