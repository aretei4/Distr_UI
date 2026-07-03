export interface PaymentMode {
  mode:         string;
  amount:       number;
  chequeNo?:    string;
  bankName?:    string;
  referenceNo?: string;
}

export interface Delivery {
  delivery_id:     string;
  deliveryBoyName: string;
  direId?:         number;          // stage_sales_entery.dire_id — unique transaction reference
  invoiceNo?:      string;          // stage_sales_entery.sales_order_no
  picklist_no:     string;
  status:          "DELIVERED" | "FAILED" | "PENDING" | "CLOSED";
  otp:             boolean;
  payment_amount:  number;
  paymentModes:    PaymentMode[];   // e.g. [{mode:"CASH",amount:1000},{mode:"UPI",amount:500}]
  reason:          string;
  delivery_date:   string;          // dd/MM/yyyy
}
