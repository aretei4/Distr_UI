export interface Delivery {
  delivery_id: string;
  picklist_no: string;
  delivered: boolean;
  otp: boolean;
  payment_amount: number;
  payment_mode: string;
  reason: string;
  delivery_date: string;
}
