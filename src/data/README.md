# Namma Metro dataset — placeholder data notice

The station coordinates (`lat`/`lng`) and per-segment `avgTravelTimeSeconds`
in `lines/purpleLine.ts` and `lines/greenLine.ts` are **best-effort
approximations**, not surveyed GPS fixes. Station names and their order along
each line are accurate; exact positions and timings are not guaranteed.

Before relying on this for a real commute, correct the values using one of:

1. **Record mode** (recommended): add a small dev-only screen that just logs
   `{ timestamp, lat, lng }` with a station-name label while physically
   riding the line, and use the samples captured while standing at each
   platform to replace the placeholder coordinates over a couple of rides.
2. Cross-check against an authoritative source: BMRCL's official station
   list, or station coordinates on OpenStreetMap.

`avgTravelTimeSeconds` per segment also matters for the dead-reckoning
fallback (`src/engine/deadReckoning.ts`) used when GPS drops in underground
stretches — if real inter-station timings differ noticeably from the
placeholder ~34 km/h assumption, dead reckoning will drift further before
re-syncing on the next GPS fix.
