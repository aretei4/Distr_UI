export interface DayEndRecord {
  dayendId: number;
  deliveryId: number;
  deliveryBoyName: string;
  deliveryDate: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  totalAmount: number;
  rejectReason: string | null;
  requestDate: string;
  approvedAt: string | null;
}

export interface StatusCfg {
  label: string; color: string; bg: string; border: string;
}

export interface ToastState {
  message: string;
  type: "success" | "error";
}

export interface StatusOption {
  value: string;
  label: string;
}
