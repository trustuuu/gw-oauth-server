import { Timestamp } from "./Timestamp";

export interface GroupMember {
  /** The unique identifier or username of the member */
  value: string;

  /** Discriminator to distinguish between a single user and a nested group */
  type: "user" | "group";

  /** The API path to the member resource */
  $ref: string;

  /** Metadata on when this member was added/updated in the group */
  whenUpdated: Timestamp;
}

export interface Group {
  id: string;
  name: string;
  displayName: string;
  email: string;
  notes: string | null;

  /** Status of the group lifecycle */
  status: "New" | "Active" | "Deleted" | string;

  /** List of users and nested groups */
  members: GroupMember[];

  whenCreated: Timestamp;

  /** Note: The top-level object doesn't show whenUpdated in your JSON,
   * but it's often good practice to include it as optional */
  whenUpdated?: Timestamp;
}
