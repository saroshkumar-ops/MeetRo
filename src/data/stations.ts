import type { Line, Station } from './types';
import { purpleLine, purpleLineStations } from './lines/purpleLine';
import { greenLine, greenLineStations } from './lines/greenLine';

export const lines: Line[] = [purpleLine, greenLine];

/**
 * Flat station lookup, deduped by id. Interchange stations (e.g. Majestic,
 * shared by Purple and Green) are merged so their lineIds cover every line
 * that serves them.
 */
export const stationsById: Record<string, Station> = {};

for (const station of [...purpleLineStations, ...greenLineStations]) {
  const existing = stationsById[station.id];
  if (existing) {
    const mergedLineIds = Array.from(new Set([...existing.lineIds, ...station.lineIds]));
    stationsById[station.id] = { ...existing, lineIds: mergedLineIds };
  } else {
    stationsById[station.id] = station;
  }
}

export const allStations: Station[] = Object.values(stationsById);

export function getLineById(lineId: string): Line | undefined {
  return lines.find(l => l.id === lineId);
}

export function getStationById(stationId: string): Station | undefined {
  return stationsById[stationId];
}

/** A station's index within a *specific* line — safe for interchange stations, unlike Station.order. */
export function getStationOrderOnLine(line: Line, stationId: string): number {
  return line.stationIdsInOrder.indexOf(stationId);
}

/** Case-insensitive substring search over station names. */
export function searchStations(query: string): Station[] {
  const q = query.trim().toLowerCase();
  if (!q) return allStations;
  return allStations.filter(s => s.name.toLowerCase().includes(q));
}

export function stationsGroupedByLine(): Array<{ line: Line; stations: Station[] }> {
  return lines.map(line => ({
    line,
    stations: line.stationIdsInOrder
      .map(id => stationsById[id])
      .filter((s): s is Station => Boolean(s)),
  }));
}
