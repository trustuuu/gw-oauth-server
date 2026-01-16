import { Timestamp } from "./Timestamp";
/**
 * Defines a role within the application that can be assigned
 * to entities (Users or Groups).
 */
export interface AppRole {
  /** Unique identifier for the role */
  id: string;

  /** The technical string value used in claims/tokens (e.g., "Ops:Support") */
  value: string;

  /** Human-readable name shown in the UI */
  displayName: string;

  /** Detailed explanation of the role's responsibilities */
  description: string;

  /** * Specifies which entities can be assigned to this role.
   * "UsersGroups" implies both User and Group objects are valid members.
   */
  allowedMemberType: "Users" | "Groups" | "UsersGroups" | string;

  /** Whether the role is currently active and assignable */
  enable: boolean;

  /** Lifecycle status of the role definition */
  status: "New" | "Updated" | "Active" | string;

  /** Audit timestamp for when the role was created */
  whenCreated: Timestamp;

  /** Optional audit timestamp for the last update */
  whenUpdated?: Timestamp;
}
