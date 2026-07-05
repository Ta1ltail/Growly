# Project 101 — Mobile App

Expo (React Native) app for the Project 101 habit tracker — a gamified, local-first habit and task tracker. Works fully offline with optional Supabase cloud sync.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 57 (React Native 0.86) |
| Language | TypeScript 6 (strict) |
| Navigation | React Navigation (bottom tabs + drawer) |
| Storage | AsyncStorage (local-first) |
| Auth | Supabase Auth with PKCE |
| Icons | Emoji (cross-platform) |
| Animations | React Native Animated API |
| Shared Logic | `@project101/shared` workspace |

## Prerequisites

- **Node.js** ≥ 18 (v24.15.0+ recommended)
- **npm** ≥ 10
- **Expo CLI** — installed automatically via `npx expo`
- **Expo Go** (optional, for quick testing) — install from [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **EAS CLI** (for APK builds) — `npm install -g eas-cli`
- **Android SDK** (for local builds) — install Android Studio

## Getting Started

```bash
# 1. Install dependencies (from monorepo root)
cd ../..
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# 3. Start Expo dev server
npx expo start
```

This opens the Expo developer tools in your browser. You can then:

- **On your phone**: Install **Expo Go**, scan the QR code
- **In a web browser**: Press `w` in the terminal
- **In Android emulator**: Press `a` (requires Android SDK)

## Project Structure

```
mobile/
├── app.config.ts          # Expo config (reads env vars)
├── app.json               # Static app configuration
├── eas.json               # EAS Build profiles
├── App.tsx                # Root component
├── assets/                # Icons, splash screen, adaptive icons
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── celebrations/  # Celebration overlay animations
│   │   ├── economy/       # Coin display components
│   │   ├── habits/        # Habit card, mark button, streak flame
│   │   ├── progression/   # XP bar, rank avatar
│   │   ├── today/         # Daily quest, check-in
│   │   └── ui/            # Design system (Button, Card, Modal, etc.)
│   ├── hooks/             # useAuth hook
│   ├── lib/
│   │   ├── AppProvider.tsx # Global state (Context + useReducer)
│   │   ├── colors.ts      # Theme color constants
│   │   ├── storage.ts     # AsyncStorage persistence
│   │   └── supabase/      # Supabase client + SecureStore adapter
│   ├── navigation/        # Bottom tabs + drawer navigator
│   └── screens/           # 20 screens (Today, Tracker, Stats, etc.)
└── package.json
```

## Environment Variables

Create a `.env` file in the `mobile/` directory (already created for you):

```
EXPO_PUBLIC_SUPABASE_URL=https://kuhsnuhpjejkvolswsdw.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

> **Note:** Only `EXPO_PUBLIC_*` prefixed variables are exposed to the client. These are embedded at build time. The `.env` file was already created during initial setup — skip the `cp .env.example .env` step if it already exists.

## Building an APK

### Option 1: EAS Build (Recommended) — Cloud Build

EAS Build compiles your app on Expo's servers — no Android SDK needed locally.

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Log in to your Expo account
npx eas login

# 3. Configure EAS Build (links your app to an Expo project)
npx eas build:configure

# 4. Build a preview APK (~5-10 min)
npx eas build --platform android --profile preview

# 5. Download the APK
# EAS provides a URL to download. You can also install via QR code.
```

**Build profiles** (defined in `eas.json`):

| Profile | Output | Use Case |
|---------|--------|----------|
| `development` | Debug APK | Testing on device |
| `preview` | Release APK | Sharing with testers |
| `production` | App Bundle (AAB) | Play Store release |

### Option 2: Local Build — Android Studio Required

```bash
# Generate native Android project
npx expo prebuild --platform android

# Build debug APK
cd android && ./gradlew assembleDebug

# The APK will be at: android/app/build/outputs/apk/debug/app-debug.apk
```

### Option 3: Expo Go — No Build Required

1. Install **Expo Go** from Google Play
2. Run `npx expo start` in the `mobile/` directory
3. Scan the QR code with Expo Go

> ⚠️ **Limitations**: Expo Go cannot run native modules that require custom native code. This app uses `expo-secure-store` and `react-native-svg` which work in Expo Go.

## Supabase Setup

The mobile app uses Supabase for optional cloud sync and auth.

1. The Supabase project is already linked (ref: `kuhsnuhpjejkvolswsdw`)
2. All 12 database migrations are applied
3. Auth uses PKCE flow with SecureStore for token persistence

### Applying Migrations

```bash
npx supabase migration up
# or from the Supabase dashboard: SQL Editor → paste migration files
```

## Testing on a Physical Phone

### Via EAS Build (APK file):

1. Run `npx eas build --platform android --profile preview`
2. Wait for the build to complete (Expo sends a notification)
3. Download the APK from the provided URL
4. On your Android phone:
   - Open **Settings → Security → Install unknown apps**
   - Enable "Install from unknown sources" for your file manager/browser
   - Open the downloaded APK file and install
   - Launch "Project 101"

### Via Expo Go (No build):

1. Install **Expo Go** from Google Play
2. Run `npx expo start` in the `mobile/` directory
3. Scan the QR code using:
   - The Expo Go app's QR scanner
   - Or the Camera app (Android)

### Via ADB (Android Debug Bridge):

```bash
# Connect your phone via USB with USB debugging enabled
# Install the APK directly:
adb install app-debug.apk
```

## Scripts

```bash
npm run start        # Start Expo dev server
npm run android      # Start + launch on Android device/emulator
npm run ios          # Start + launch on iOS simulator
npm run web          # Start + launch in web browser
```

## Features

- **Tracker grid** — rows = habits, columns = dates; tap to cycle a mark
- **Today / Calendar / Stats** — daily dashboard with check-in, quests, spin wheel
- **Gamification** — XP, levels, 28 achievements, titles, ranks
- **Economy** — coins (derived from history), shop, cosmetics, streak freezes
- **Engagement** — daily check-in bonus, daily quests, daily spin wheel
- **Local-first** — all data in AsyncStorage, works fully offline
- **Cloud sync** — optional Supabase auth & sync
