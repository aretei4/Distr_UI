import { getApiBaseUrl } from "../constants/config";
import { api } from "./apiClient";

/** One GPS point with the distance/time figures computed server-side. */
export interface TrackPoint {
  seq:            number;
  id:             number;
  latitude:       number;
  longitude:      number;
  accuracy:       number | null;
  speed:          number | null;
  trackedAt:      string;   // dd/MM/yyyy HH:mm:ss
  timeText:       string;   // HH:mm:ss
  legDistanceKm:  number;   // from the previous point
  cumulativeKm:   number;   // covered up to this point
  elapsedSeconds: number;
  elapsedText:    string;
  dwellSeconds:   number;   // time spent here before moving on
  dwellText:      string;
  stopped:        boolean;
}

export interface TrackTrail {
  deliveryId:        number;
  agentName:         string | null;
  date:              string;
  pointCount:        number;
  totalDistanceKm:   number;
  firstPointAt:      string | null;
  lastPointAt:       string | null;
  totalSeconds:      number;
  totalDurationText: string;
  movingSeconds:     number;
  movingText:        string;
  stoppedSeconds:    number;
  stoppedText:       string;
  stopCount:         number;
  points:            TrackPoint[];
}

export interface TrackAgent {
  deliveryId: number;
  agentName:  string;
  phone:      string | null;
  pointCount: number;
  lastSeenAt: string | null;
}

const BASE = () => `${getApiBaseUrl()}/tracking`;

/** Agents with their point count for the given date (dd/MM/yyyy). */
export const fetchTrackAgents = async (date: string): Promise<TrackAgent[]> => {
  return api.get<TrackAgent[]>(`${BASE()}/agents?date=${encodeURIComponent(date)}`);
};

/** One agent's trail for one day. */
export const fetchTrackTrail = async (deliveryId: number, date: string): Promise<TrackTrail> => {
  return api.get<TrackTrail>(
    `${BASE()}/trail?deliveryId=${deliveryId}&date=${encodeURIComponent(date)}`,
  );
};

/** Dates this agent has data for, newest first. */
export const fetchTrackDates = async (deliveryId: number): Promise<string[]> => {
  return api.get<string[]>(`${BASE()}/dates?deliveryId=${deliveryId}`);
};
