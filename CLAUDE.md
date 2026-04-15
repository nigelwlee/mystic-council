@AGENTS.md

# Mystic Council

AI-powered mystical advisory council combining Western astrology, Vedic astrology, Chinese astrology, tarot, and numerology. Built with Next.js 16, React 19, Vercel AI SDK v4, and OpenRouter.

## Repository

- **GitHub**: https://github.com/nigelwlee/mystic-council
- **Vercel**: https://mystic-council.vercel.app
- **Linear**: https://linear.app/nigel-hobby/project/mystic-council-7d5f8d11f7b3/issues
  - Team: Nigel Hobby (key: `NIG`)
  - Project ID: `ebeb5e1c-2de9-4611-9839-e2b5455193be`
  - Team ID: `60c3eaa5-1b82-4495-8ec0-2f97fbfe2e4e`

## Development Workflow

Every change follows this loop:

```
Plan in Claude Code CLI
  → Create/update Linear issue (Backlog or Todo)
    → Agent picks up Todo → works in worktree → pushes PR
      → Review → merge to main → Vercel deploys
```

### Linear Status Flow

| Status | Meaning | Who sets it |
|--------|---------|-------------|
| **Backlog** | Ideas, not yet approved | User or planner agent |
| **Todo** | Approved to build now/soon | User or planner agent |
| **In Progress** | Agent is actively working | Implementation agent (on start) |
| **In Review** | PR created, awaiting review | Implementation agent (after `gh pr create`) |
| **Done** | Merged to main | User or review agent (after merge) |

### Linear Labels

**Type labels** (existing): Bug · Feature · Improvement
**Domain labels** (new): Engine · UI · Infra

Every issue should have one type label + one domain label.

### Branch Naming

```
feat/nig-{issue-number}-{short-description}   # new feature
fix/nig-{issue-number}-{short-description}    # bug fix
```

Always reference the Linear issue ID in branch name and PR body (`Closes NIG-{id}`).

---

## Worktree Structure

```
mystic-council/           # main branch — port 3000
  worktrees/
    engine/               # feat/engine branch — port 3001
    ui/                   # feat/ui branch — port 3002
```

- **main**: stable, always deployable
- **worktrees/engine** (`feat/engine`): orchestrator, experts, tools, API routes — engine domain
- **worktrees/ui** (`feat/ui`): components, pages, styling — UI domain
- **Ephemeral worktrees**: spawned via `isolation: "worktree"` for task-scoped agent work, deleted after PR is created

Each worktree has its own `.env.local` and `node_modules`. After any `package.json` change on main, run `npm install` in each worktree independently.

Worktrees are git-ignored (`.gitignore` excludes `worktrees/`).

---

## Agent Roles

### Planner Agent
Runs in main worktree. Reviews the Linear backlog, prioritizes issues, creates detailed issues with acceptance criteria, assigns labels and estimates.

### Implementation Agent
Runs in an **isolated worktree** (`isolation: "worktree"` or existing `worktrees/engine`, `worktrees/ui`).

Checklist:
1. Read the Linear issue — understand requirements and acceptance criteria
2. Update Linear status to **In Progress**
3. Create feature branch: `feat/nig-{id}-{slug}` from latest `main`
4. Implement the feature
5. Run `npm run lint` — must pass
6. Run `npm run build` — must pass
7. Commit with conventional commit messages (`feat:`, `fix:`, `refactor:`, etc.)
8. Push branch and create PR: `gh pr create --title "feat(NIG-{id}): ..." --body "Closes NIG-{id}\n\n..."`
9. Update Linear status to **In Review**

### Review Agent
Runs in main worktree. Reads the PR diff, checks code quality and conventions, approves or leaves comments. Updates Linear to **Done** after merge.

---

## Stack & Key Conventions

- **Framework**: Next.js 16 + React 19 (App Router)
- **AI**: Vercel AI SDK v4 (`ai@^4.3.19`) — do NOT upgrade to v6 (breaks useChat)
- **Zod**: v3 (`^3.25.0`) — do NOT upgrade to v4; `@ai-sdk/openai` peer dep requires v3
- **Provider**: OpenRouter via `@ai-sdk/openai` with `baseURL: https://openrouter.ai/api/v1`
- **UI**: shadcn/ui + Tailwind CSS v4. Always use shadcn primitives — add via `npx shadcn@latest add <component>`
- **TypeScript**: strict mode. Use `z.infer<>` for all AI SDK tool schemas
- **Commits**: conventional commits — `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`

## Environment Variables

| Variable | Purpose | Value |
|----------|---------|-------|
| `OPENROUTER_API_KEY` | Real LLM calls via OpenRouter | Set in `.env.local` and Vercel |
| `MOCK_MODE` | Skip LLMs for UI dev | `true` (dev) / `false` (prod) |
| `PORT` | Dev server port | 3000 / 3001 / 3002 per worktree |

## Key Directories

```
app/                    # Next.js App Router pages and API routes
  api/chat/route.ts     # Main chat API — council orchestration entry point
  chat/page.tsx         # Chat UI page
lib/
  orchestrator.ts       # Sequential expert dispatch + judge synthesis
  experts/              # Expert implementations (one file per tradition)
  tools/                # AI SDK tool definitions per tradition
  context/              # React context providers
  knowledge/loader.ts   # Loads markdown knowledge base files
knowledge/              # Reference data per mystical tradition (markdown)
components/             # React components
  ui/                   # shadcn/ui primitives
  chat/                 # Chat-specific components
data/                   # Static data (tarot deck JSON, etc.)
worktrees/              # Git worktrees — git-ignored
```

## The Council

- **Stella** — Western astrology (`astronomy-engine`)
- **Master Wei** — Chinese astrology (`lunar-typescript`)
- **Priya** — Vedic astrology (`astronomy-engine` + Lahiri ayanamsa)
- **Madame Crow** — Tarot (JSON deck)
- **Pythia** — Numerology (pure math)
- **The Oracle** — Judge/synthesizer (streams after all experts complete)

Test birth data: Nigel Lee, June 1 1991, 11:44 AM, Manila.
