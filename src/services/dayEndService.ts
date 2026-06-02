import type { DayEndRecord } from "../pages/types";
import { ApiEndpoints } from "../constants/config";

const DEMO_DATA: DayEndRecord[] = [
  { dayendId: 1, dayEndCode: "DE-2026-1504-001", deliveryId: 101, deliveryBoyName: "Ravi Kumar",   deliveryDate: "15-04-2026", status: "PENDING",  totalAmount: 4850.00, rejectReason: null,              requestDate: "2026-04-15 09:10:00", approvedAt: null },
  { dayendId: 2, dayEndCode: "DE-2026-1604-002", deliveryId: 102, deliveryBoyName: "Amit Sharma",  deliveryDate: "16-04-2026", status: "APPROVED", totalAmount: 7200.50, rejectReason: null,              requestDate: "2026-04-16 10:30:00", approvedAt: "2026-04-16 11:00:00" },
  { dayendId: 3, dayEndCode: "DE-2026-1704-003", deliveryId: 103, deliveryBoyName: "Suresh Patel", deliveryDate: "17-04-2026", status: "REJECTED", totalAmount: 3100.00, rejectReason: "Amount mismatch", requestDate: "2026-04-17 16:20:00", approvedAt: null },
  { dayendId: 4, dayEndCode: "DE-2026-1804-004", deliveryId: 104, deliveryBoyName: "Priya Singh",  deliveryDate: "18-04-2026", status: "PENDING",  totalAmount: 5600.75, rejectReason: null,              requestDate: "2026-04-18 11:05:00", approvedAt: null },
  { dayendId: 5, dayEndCode: "DE-2026-1904-005", deliveryId: 105, deliveryBoyName: "Deepak Rao",   deliveryDate: "19-04-2026", status: "PENDING",  totalAmount: 2980.00, rejectReason: null,              requestDate: "2026-04-19 12:00:00", approvedAt: null },
  { dayendId: 6, dayEndCode: "DE-2026-1904-006", deliveryId: 106, deliveryBoyName: "Neha Verma",   deliveryDate: "19-04-2026", status: "APPROVED", totalAmount: 6120.00, rejectReason: null,              requestDate: "2026-04-19 08:45:00", approvedAt: "2026-04-19 09:30:00" },
];

export const fetchDayEndSummary = async (): Promise<DayEndRecord[]> => {
  try {
    const res = await fetch(ApiEndpoints.DAY_END_SUMMARY);
    if (!res.ok) throw new Error("API error");
    const json = await res.json();
    return Array.isArray(json) ? json : (json.data ?? []);
  } catch {
    return DEMO_DATA;
  }
};

export const approveDayEnd = async (dayendId: number): Promise<void> => {
  const res = await fetch(ApiEndpoints.DAY_END_APPROVE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dayendId }),
  });
  if (!res.ok) throw new Error("Approve failed");
};

export const rejectDayEnd = async (dayendId: number, rejectReason: string): Promise<void> => {
  const res = await fetch(ApiEndpoints.DAY_END_REJECT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dayendId, rejectReason }),
  });
  if (!res.ok) throw new Error("Reject failed");
};
