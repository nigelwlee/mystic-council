# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

---

# Agent Instructions

## Before Starting Work

1. Read `CLAUDE.md` — it has the full project context, workflow, stack conventions, and Linear/GitHub/Vercel links
2. Check your assigned Linear issue for requirements and acceptance criteria
3. Confirm you are in the correct worktree/branch for the task domain

## Implementation Checklist

When executing a Linear issue as an implementation agent:

1. Update Linear status to **In Progress** via the Linear MCP tool
2. Create a branch: `feat/nig-{id}-{slug}` from latest `main`
3. Implement the feature or fix
4. Run `npm run lint` — must pass with no errors
5. Run `npm run build` — must pass (no type errors, no build failures)
6. Commit using conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`
7. Push and open a PR: reference the Linear issue in body with `Closes NIG-{id}`
8. Update Linear status to **In Review**

## Code Conventions

- **TypeScript**: strict mode throughout. Use `z.infer<>` for AI SDK tool schemas
- **UI components**: always use shadcn/ui primitives from `components/ui/`. Add new ones via `npx shadcn@latest add <component>` — never raw HTML with custom Tailwind when a shadcn primitive exists
- **Styling**: Tailwind CSS v4. Dark theme: bg `#0A0B14`, text `#F5F0E8`, accent `rgba(191,168,130,x)`. No gradients, no glows, no rounded corners on UI elements
- **Fonts**: Cormorant Garamond (`var(--font-cormorant)`) for display/reading text, Geist Sans for labels/UI, Geist Mono for data
- **AI SDK**: v4 only (`ai@^4.3.19`). Do NOT upgrade to v6 — it removes `useChat` and has breaking API changes
- **Commits**: conventional — `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`

## Worktree Assignment

- **Engine domain** (orchestrator, experts, tools, API): work in `worktrees/engine` on `feat/engine`
- **UI domain** (components, pages, styling): work in `worktrees/ui` on `feat/ui`, set `MOCK_MODE=true`
- **Cross-cutting or infra work**: use an ephemeral worktree spawned from `main`

## PR Format

```
Title: feat(NIG-{id}): short imperative description

Body:
Closes NIG-{id}

## What
[What changed and why]

## Test
[How to verify — dev server URL, route, or test command]
```
