// src/models/DeliveryModel.ts

export interface Delivery {
  delivery_id: string;
  picklist_no: string;
  delivered: boolean;
  otp: boolean;
  payment_amount: number;
  payment_mode: string;
  reason: string;
  delivery_date: string; // ISO string from backend, e.g. "2025-11-01T10:00:00Z"
}
