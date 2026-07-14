# Task 001 - Project Scaffolding

## Objective
Initialize the project configurations, package manifests, and compilers.

## Architecture References
- [docs/architecture/system-architecture.md](file:///home/turan/tinc-workbench/docs/architecture/system-architecture.md)#layer-roles

## Dependencies
NONE

## Files Allowed to Modify
- `package.json, tsconfig.json, jest.config.js, .eslintrc.json, .prettierrc`

## Files Forbidden to Modify
- `docs/specifications/*`
- `docs/architecture/*`
- `docs/audits/*`

## Required Implementation
Create a Node.js project scaffold using npm. Configure tsconfig.json for target ES2022, strict type checks, and path mappings. Setup Jest for testing TypeScript modules. Setup ESLint and Prettier.

## Required Tests
Validate the tool configuration by running npm test with a dummy spec.

## Acceptance Criteria
- [ ] package.json contains core scripts (build, test, lint)
- [ ] tsconfig.json compiles successfully
- [ ] jest executes TS test suites without errors

## Validation Commands
npm install && npm run lint && npm test

## Stop Conditions
The coding agent must stop if:
- a frozen architecture contradiction is discovered
- a dependency task is incomplete
- a required contract is missing
- implementation requires ownership reassignment
- a forbidden file must be modified

## Git Rules
- do not commit
- do not push
