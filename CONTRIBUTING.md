# Contributing to ModelSweeper

Thanks for contributing.

## Development Setup

1. Fork and clone the repo.
2. Install dependencies:
   - `npm install`
3. Run in dev mode:
   - `npm run dev`

## Quality Gates

Before opening a PR, run:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

## Pull Request Guidelines

- Keep PRs focused on a single concern.
- Prefer small, composable changes over broad rewrites.
- Update docs when behavior changes.
- For UI changes, include screenshots.
- Use clear commit messages in imperative form.

## Coding Standards

- TypeScript strictness must stay green.
- Keep components readable and purpose-driven.
- Avoid dead code and untracked TODO blocks.

## Reporting Bugs

Use the bug issue template with:

- Repro steps
- Expected behavior
- Actual behavior
- Environment details

## Feature Requests

Use the feature template and include:

- Problem statement
- Proposed solution
- Scope and tradeoffs
