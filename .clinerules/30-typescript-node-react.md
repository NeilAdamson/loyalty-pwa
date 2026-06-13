# TypeScript, Node, And React

## TypeScript And Node

- Prefer strict typing over weak typing.
- Avoid `any`, `@ts-ignore`, disabled compiler checks, and broad type assertions unless absolutely necessary and justified.
- Follow existing service, route, controller, handler, DTO, schema, config, logging, and test conventions.
- Keep modules cohesive and avoid leaking concerns across layers.
- Reuse existing error-handling, validation, auth, logging, and response patterns.
- Keep configuration in environment/config modules, not inline constants for environment-specific values.
- Prefer existing package scripts for lint, typecheck, build, and test, executed through Docker.

## React And PWA Frontend

- Follow existing component, hook, route, styling, state management, and data-fetching patterns.
- Keep components focused; avoid bloated page files.
- Keep UI simple, responsive, accessible, and consistent with the existing design.
- Validate and sanitize client inputs where appropriate.
- Do not expose sensitive implementation details, secrets, tokens, stack traces, or internal infrastructure in browser-visible code.
- Preserve the different API auth modes:
  - platform admin routes use HttpOnly cookies and should not inject Bearer tokens
  - vendor admin routes use Bearer tokens
  - member and staff routes use Bearer tokens
- Preserve offline and PWA behavior unless the task explicitly changes it.

## Quality Gate

- Do not silence lint, type, or build errors casually.
- Fix the root cause instead of weakening checks.
- Add tests when the change touches shared behavior, auth, tenant isolation, data mutations, or user-facing flows.
