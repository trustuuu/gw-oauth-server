import { Timestamp } from "./Timestamp";
/**
 * Represents the configuration for an API Resource/Audience.
 */
export interface Api {
  id: string;
  name: string;
  description: string;
  identifier: string; // Often matches the audience URL
  audience: string;
  issuer: string;
  companyId: string;
  domain: string;

  /** The URL where the Public Keys (JWKS) are hosted for token validation */
  jwksUri: string;

  /** The algorithm used to sign the tokens */
  signingAlgorithm: "RS256" | "HS256" | string;

  /** Current lifecycle status */
  status: "Updated" | "New" | "Active" | string;

  // Access Control & Permissions
  RBAC: boolean;
  addPermissionAccessToken: boolean;
  allowSkippingUserConsent: boolean;
  allowOfflineAccess: boolean;

  // Token Settings
  /** Note: Matches the spelling 'tokjen' from your JSON */
  tokjenExpirationForBrowser: number;
  tokenExpiration: number;

  // Timestamps
  whenCreated: Timestamp;
  whenUpdated: Timestamp;
}

/**
 * Represents a defined permission scope within the system.
 */
export interface Scope {
  /** Unique identifier for the scope record */
  id: string;

  /** The human-readable name or purpose of the scope (e.g., "company:admin") */
  description: string;

  /** The actual permission string checked by the backend (e.g., "read:users") */
  permission: string;

  /** Lifecycle status of the scope definition */
  status: "Updated" | "New" | "Active" | "Deleted" | string;

  /** Timestamp of when the scope was first registered */
  whenCreated: Timestamp;

  /** Timestamp of the last modification to this scope definition */
  whenUpdated: Timestamp;
}
