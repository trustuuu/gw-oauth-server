import { Timestamp } from "./Timestamp";

export interface Company {
  id: string;
  name: string;
  displayName: string;
  description: string;
  parent: string | null;
  status: "New" | "Active" | "Inactive" | string;
  type: "customer" | "reseller" | "root" | string;
  whenCreated: Timestamp;
}
