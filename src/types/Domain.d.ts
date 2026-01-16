import { Timestamp } from "./Timestamp";
/**
 * Represents the site or resource entry.
 */
export interface Domain {
  id: string;
  name: string;
  description: string;
  primary: boolean;
  status: "Updated" | "Pending" | "Created"; // Using a union type for better safety
  whenCreated: Timestamp;
  whenUpdated: Timestamp;
}
