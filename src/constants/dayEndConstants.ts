import type { StatusCfg, StatusOption } from "../types";

export const STATUS_CONFIG: Record<string, StatusCfg> = {
  PENDING: {
    label:  "PENDING",
    color:  "#f59e0b",
    bg:     "#fef3c7",
    border: "#fcd34d",
  },
  APPROVED: {
    label:  "APPROVED",
    color:  "#10b981",
    bg:     "#d1fae5",
    border: "#6ee7b7",
  },
  REJECTED: {
    label:  "REJECTED",
    color:  "#ef4444",
    bg:     "#fee2e2",
    border: "#fca5a5",
  },
};

export const TABLE_HEADERS: string[] = [
  "Name",
  "Request date",
  "Status",
  "Total amt",
  "Reason",
  "Action",
];

export const STATUS_OPTIONS: StatusOption[] = [
  { value: "ALL",      label: "All statuses" },
  { value: "PENDING",  label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];
