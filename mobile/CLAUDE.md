# Mystic Council Mobile — Claude Rules

## Stack

- **Expo SDK 54**, expo-router 6, React Native 0.81, New Architecture enabled
- **Supabase** for auth + database (`birth_data`, `daily_streaks` tables)
- **Backend**: `https://mystic-council.vercel.app` — lives in the monorepo root (`../app/api/`); Vercel deploys from root and ignores this `/mobile` folder via `.vercelignore`
- **Entry**: `expo-router/entry` (not `index.ts` — that file is dead code)

## Dependency installs

Always use `--legacy-peer-deps`:
```
npm install <pkg> --legacy-peer-deps
```
There are two known, benign peer conflicts:
- `react-dom` requires `react@^19.2.6` but this project pins `react@19.1.0` for Expo SDK 54 compatibility.
- `expo-doctor` reports "duplicate react" (`19.1.0` here vs `19.2.4` in `../node_modules`). React is not a native module so this is safe; `metro.config.js` ensures Metro uses the correct version from this folder. Ignore this specific warning.

**After every install, run the doctor gate:**
```
npm run doctor
```
Treat any "should be updated for best compatibility" line as a **hard failure** — fix the version before proceeding. Do not dismiss these as informational.

## Supabase types

Generated types live at `lib/database.types.ts`. The Supabase client in `lib/supabase.ts` is typed as `createClient<Database>()`. Every query is type-checked.

When the Supabase schema changes, regenerate:
```
npm run types:generate
```

## Supabase write rules

All user-scoped tables use RLS with `user_id = auth.uid()`. Rules:
- Always include `user_id: session.user.id` in inserts/upserts
- Default to **upsert** (not insert) for tables with a unique constraint on `user_id`:
  ```ts
  supabase.from('birth_data').upsert({ user_id, ... }, { onConflict: 'user_id' })
  ```
- Bare `.insert()` without `user_id` will violate RLS and return a 403

## Boot & verification

Start the simulator:
```
npx expo start --ios -c
```

After each code change, verify the Metro log at `/tmp/expo-*.log`:
1. **Must see**: `iOS Bundled Nms`
2. **Must NOT see**: any `should be updated for best compatibility` version warning
3. **Check for runtime errors**: `grep -E "\[GLOBAL_ERROR\]|Possible Unhandled|ERROR" /tmp/expo-*.log`

Uncaught JS errors are tagged `[GLOBAL_ERROR]` by the handler in `app/_layout.tsx` — always grep for these after a change that touches async code or Supabase queries.

## UI conventions

Colors (don't invent new ones — UI revamp is planned):
- Background: `#0A0B14`
- Surface / input bg: `#13141F`
- Border: `#2D2F3E` (primary), `#1E2030` (subtle)
- Primary text: `#F5F0E8`
- Muted text: `#9CA3AF`, `#6B7280`
- Accent gold: `rgba(191,168,130,1)` (also at 0.4, 0.7, 0.8 alpha)
- Error: `#F87171`

## Out of scope (for now)

- Edit birth data (no update flow on the Me tab yet)
- Chat tab (placeholder)
- TestFlight / EAS Build setup
- UI revamp (deferred)
