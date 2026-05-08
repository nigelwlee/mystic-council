# Mystic Council

AI-powered mystical advisory council — monorepo containing the web/API backend and the iOS mobile app.

## Repo layout

| Path | What it is |
|---|---|
| `/app`, `/lib`, `/components` | Next.js web app + API routes, deployed to Vercel |
| `/mobile` | Expo/React Native iOS app |

## Web / API (repo root)

Next.js 15 + Supabase + OpenRouter. The `/api/daily` and `/api/council` routes are the shared backend for both web and mobile.

```bash
npm run dev
```

## Mobile (`/mobile`)

Expo SDK 54, expo-router 6, React Native 0.81.

```bash
cd mobile
npm install --legacy-peer-deps
npx expo start --ios -c
```

See `mobile/CLAUDE.md` for mobile-specific dev rules.
