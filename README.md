# MeetRo — never miss your metro stop

MeetRo tracks the train's progress along a Namma Metro (Bangalore) line and
surfaces stops remaining, distance, speed, and ETA to your destination right
in the notification bar — with escalating alerts as your stop approaches and
a loud, DND-bypassing arrival alarm for when you've dozed off. Built for
earphone users and anyone who zones out and doesn't want to keep checking
outside or pulling a bud out to hear the announcement.

## Status: MVP, Android-first, Purple + Green lines only

This is a from-scratch first build. See `/root/.claude/plans/*` in the
session that built it for the full design rationale. Key scope decisions:

- **Android only** for now — the core mechanism (a persistent foreground
  notification, background GPS, a full-screen "wake up" alarm) relies on
  Android-specific APIs with no true iOS equivalent.
- **Purple Line and Green Line only**, hardcoded. Not a generic multi-city
  transit engine.
- **GPS + dead reckoning**: primary tracking is live GPS matched to the
  nearest point on the line; when GPS drops (tunnels, e.g. around the
  Majestic interchange), the engine estimates progress from elapsed time and
  each segment's known average travel time until GPS returns.

## ⚠️ Station data is a placeholder — verify before a real ride

`src/data/lines/purpleLine.ts` and `src/data/lines/greenLine.ts` contain
station coordinates and inter-station travel times assembled from general
knowledge, **not surveyed GPS fixes**. Station names and order are accurate;
exact lat/lng and timings are approximations. See `src/data/README.md` for
how to correct them (a quick "record mode" while riding, or cross-checking
against BMRCL/OpenStreetMap) before trusting this for your actual commute.

## Project layout

```
src/
  engine/         Pure TS tracking engine — GPS matching, dead reckoning,
                   ETA/distance calc, the escalating alert state machine.
                   No React Native imports; fully unit-testable.
  data/           Bundled Namma Metro station/line data (offline, no network).
  location/       LocationProvider interface + MockLocationProvider (simulated
                   playback) + RealLocationProvider (react-native-geolocation-service).
  notifications/  notifee channels, the ongoing journey notification, the
                   arrival alarm, and the foreground-service orchestration
                   that wires the engine to both.
  tts/            Spoken stop announcements (ducks into existing audio).
  store/          zustand journeyStore — single source of truth the UI and
                   the background service both read/write.
  screens/        StationPicker, ActiveJourney, Settings, ArrivalAlarm.
  navigation/      React Navigation stack.
__tests__/        Jest unit + integration tests (engine, dataset, App smoke test).
```

## Setup

This environment had no Android SDK/emulator, so the app has **not** been
built or run on a device — only type-checked and unit-tested. To actually
run it:

```sh
npm install
npx react-native run-android   # requires Android Studio / SDK + an emulator or device
```

First-run permission flow: the app will need to prompt for fine location →
notifications → background location → battery-optimization exemption →
(Android 14+) full-screen-intent access, in that order — see
`src/utils/permissions.ts` and the "Known limitations" section below.

## Verification

What's been verified in this environment (no device available):

- `npx tsc --noEmit` — clean across the whole project.
- `npx jest` — 52 tests passing:
  - `__tests__/data/` — dataset integrity (station ordering, segment
    distances/times, the Majestic interchange merge).
  - `__tests__/engine/` — geo math, GPS-to-line matching, dead reckoning
    (including the "never claims arrival early" cap and the "don't regress
    below a GPS-confirmed position" fix), ETA/stops-remaining calculation,
    the alert escalation state machine, and a headless integration test
    that runs `JourneyEngine` against `MockLocationProvider` under Jest fake
    timers — including a simulated GPS dead zone — and asserts the full
    `TWO_STOPS_OUT → ONE_STOP_OUT → ARRIVING → ARRIVED` sequence fires
    correctly with stopsRemaining never increasing.
  - `__tests__/App.test.tsx` — full app renders headlessly (native modules
    `@notifee/react-native`, `react-native-geolocation-service`, and
    `react-native-tts` are mocked under `__mocks__/`, since none have a real
    native module available under Jest).

What still needs a real device/emulator (not possible here):

- Actually building the Android app (Gradle/native compile).
- The permission-request flow, the foreground service surviving
  backgrounding, and the notification actually updating with the screen off.
- The arrival alarm's full-screen intent actually waking a locked/silent
  phone — Android 14+ requires the user to manually grant this in system
  settings; there's no way to silently confirm it works.

### Try it without a real train ride

Settings → **Simulate Mode** drives the journey from `MockLocationProvider`
(interpolating along the real bundled station coordinates at a configurable
speed, with a simulated GPS dead zone through the underground stretch)
instead of real GPS — this exercises the full engine → notification →
alert-escalation → arrival-alarm pipeline on an emulator or device without
needing to be on the metro. Pick a destination as normal from the Station
Picker; it uses whichever location provider Settings has selected.

## Known limitations (by design, for this MVP)

- OEM battery managers (Xiaomi/Samsung/etc.) can still kill background work
  despite a foreground service — not solved here, just documented.
- Full-screen-intent permission requires a manual grant on Android 14+
  (cannot be silently requested).
- Force-swiping the app from Recents kills the foreground service, same as
  most music-player apps.
- iOS, the full metro network, other cities, and the "share live ETA with
  whoever you're meeting" idea (fits the app's name, needs a backend) are
  all explicitly out of scope for this MVP.
