export interface Station {
  id: string;
  name: string;
  lineIds: string[];
  lat: number;
  lng: number;
  /**
   * Index within the line that first defined this station. For interchange
   * stations served by multiple lines (e.g. Majestic), this is NOT
   * necessarily the station's position on every line it belongs to — code
   * that needs a line-relative index should use
   * `line.stationIdsInOrder.indexOf(stationId)` (see
   * `getStationOrderOnLine` in `data/stations.ts`) instead of this field.
   */
  order: number;
}

export interface LineSegment {
  fromStationId: string;
  toStationId: string;
  distanceMeters: number;
  avgTravelTimeSeconds: number;
}

export interface Line {
  id: string;
  name: string;
  color: string;
  /** Station IDs in physical order along the line, terminus to terminus. */
  stationIdsInOrder: string[];
  /** One entry per adjacent station pair, same order as stationIdsInOrder. */
  segments: LineSegment[];
}
