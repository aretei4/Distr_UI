export interface StatusCfg {
  label: string;
  color: string;
  bg: string;
  border: string;
}

export interface StatusOption {
  value: string;
  label: string;
}

export interface DayEndDto {
  dayendId: number;
  deliveryId: number;
  date: string;
  totalAmount: number;
  rejectReason: string;
}
