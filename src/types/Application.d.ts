import { Timestamp } from "./Timestamp";
/**
 * Supported Grant Types for the application
 */
export type GrantType =
  | "authorization_code"
  | "client_credentials"
  | "refresh_token"
  | "urn:ietf:params:oauth:grant-type:device_code"
  | string;

/**
 * Application Type (e.g., Single Page App, Native, Machine to Machine)
 */
export type AppType = "SPA" | "Native" | "Regular Web" | "M2M";

export interface IApplication {
  id: string;
  client_id: string;
  client_secret: string;
  client_name: string;
  description: string;
  domain: string;
  companyId: string;
  app_type: AppType;
  logo_uri: string;

  // Statuses
  status: "Updated" | "Created" | "Active" | string;
  client_status: "New" | "Active" | "Inactive" | string;

  // OAuth / OIDC Configuration
  audience: string;
  grant_types: GrantType[];
  redirect_uris: string[];
  allowed_web_orgins: string[]; // Note: matches typo "orgins" in your JSON
  client_uri: string;
  client_logout_uri: string[];
  permissions_consent_screen: boolean;

  // Token Lifetimes & Rotation
  id_token_expiration: string | number;
  refresh_absolute_lifetime: string | number;
  refresh_absolute_expiration: boolean;
  refresh_token_rotation: boolean;
  refresh_reuse_interval: string | number;

  // Timestamps
  client_id_created_at: Timestamp;
  whenUpdated: Timestamp;
}

export interface PermissionScope {
  /** * Unique identifier, typically following the pattern:
   * {api_identifier}#{permission_name}
   */
  id: string;

  /** The raw permission string used in access tokens (e.g., "company:admin") */
  permission: string;

  /** Human-readable explanation of what this permission allows */
  description: string;

  /** Lifecycle status of the permission */
  status: "New" | "Updated" | "Active" | string;

  /** Audit timestamp for record creation */
  whenCreated: Timestamp;

  /** Optional: Audit timestamp for record updates */
  whenUpdated?: Timestamp;
}
