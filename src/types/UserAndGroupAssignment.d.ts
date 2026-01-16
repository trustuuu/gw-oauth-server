import { DocumentReference } from "firebase/firestore"; // If using Firebase Web SDK
import { Timestamp } from "./Timestamp";
/**
 * Represents a link between a Role and a User or Group.
 */
export interface UserAndGroupAssignment {
  /** * Composite ID, likely: {objectType}#{role}#{objectId}
   */
  id: string;

  /** Discriminator to identify if the member is a user or a group */
  objectType: "user" | "group";

  /** The unique ID of the specific user or group being assigned */
  objectId: string;

  /** Human-readable name of the user or group */
  displayName: string;

  /** The technical value of the role being assigned (e.g., "Ops:Admin") */
  role: string;

  /** * The live Firestore reference to the document.
   * If you don't use the Firebase SDK types, use 'any' or a custom Ref interface.
   */
  ref: {
    firestore: any; // Contains the complex _delegate and app config
  };

  /** Audit timestamp for when this assignment was created */
  whenCreated: Timestamp;
}
