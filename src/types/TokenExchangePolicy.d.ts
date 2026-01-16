import { Timestamp } from "./Timestamp";
/**
 * Defines the rules for exchanging an existing security token
 * for a new token with different audiences or scopes.
 */
export interface TokenExchangePolicy {
  id: string;
  name: string;
  enabled: boolean;
  status: "New" | "Updated" | "Active" | string;

  /** The ID of the application/client this policy applies to */
  clientId: string;

  /** * Indicates if the requester can act on behalf of the user
   * (impersonation) or as the user (delegation).
   */
  allowImpersonation: boolean;
  allowDelegation: boolean;

  /** * Audiences permitted in the incoming subject token
   * (e.g., your internal API)
   */
  allowedSubjectAudiences: string[];

  /** * Audiences permitted for the newly exchanged token
   * (e.g., Google Calendar API)
   */
  allowedTargetAudiences: string[];

  /** Specific OAuth scopes authorized for the exchange */
  allowedScopes: string[];

  /** * Maximum duration for the new token.
   * Typed as string | number to handle empty string defaults.
   */
  maxTokenLifetimeSeconds: number | "";

  /** Audit timestamps */
  whenCreated: Timestamp;
  whenUpdated?: Timestamp;
}
