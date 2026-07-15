import { ApiEndpoints } from "../constants/config";
import { authHeaders } from "./authService";

export interface MapPoint {
  picklist_no:     string;   // carries dire_id as string for ASSIGNED map points
  deliveryBoyName: string;
  status:          string;   // ASSIGNED for map points
  lat:             number;
  lon:             number;
  delivery_date:   string;
  address:         string;
  sequence:        number;
  net_value:       number;   // invoice net value from stage_sales_entery (0 if not found)
}

export interface RouteAssignStop {
  direId:   number;
  sequence: number;
}

/** ASSIGNED (status 9) stops for one agent — coordinates from customer master. */
export const fetchMapPoints = async (deliveryId: string | number): Promise<MapPoint[]> => {
  const url = `${ApiEndpoints.DELIVERY_MAP}?deliveryId=${deliveryId}`;
  const res = await fetch(url, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error("Failed to fetch map data");
  return res.json();
};

/** Saves the route order (sequence) for the agent's assigned stops. */
export const assignRoute = async (stops: RouteAssignStop[]): Promise<void> => {
  const res = await fetch(ApiEndpoints.SMART_ROUTE_ASSIGN, {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body:    JSON.stringify(stops),
  });
  if (!res.ok) throw new Error(`Assign route failed: ${res.status}`);
};
