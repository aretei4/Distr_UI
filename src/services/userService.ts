import { getApiBaseUrl } from "../constants/config";
import { api } from "./apiClient";

export type UserRole = "ADMIN" | "MANAGER" | "STAFF";

export interface UserRecord {
  id: number;
  username: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  fullName?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  enabled?: boolean;
  password?: string;
}

const BASE = () => `${getApiBaseUrl()}/users`;

export const userService = {
  async getAll(): Promise<UserRecord[]> {
    return api.get<UserRecord[]>(BASE());
  },

  async create(payload: CreateUserPayload): Promise<UserRecord> {
    return (await api.post<UserRecord>(BASE(), payload)) ?? ({} as UserRecord);
  },

  async update(id: number, payload: UpdateUserPayload): Promise<UserRecord> {
    return (await api.put<UserRecord>(`${BASE()}/${id}`, payload)) ?? ({} as UserRecord);
  },

  async remove(id: number): Promise<void> {
    await api.del(`${BASE()}/${id}`);
  },
};
