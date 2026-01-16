export interface Connection {
  id: string;
  name: string;
  description: string;
  clientId: string;
  clientSecret: string;

  /** The OAuth service provider */
  provider: "google" | "azure" | "github" | string;

  /** The authorized callback URL */
  redirectUrl: string;

  /** List of OAuth scopes requested from the provider */
  scopes: string[];

  /** Current lifecycle status of the configuration */
  status: "Updated" | "Created" | "Enabled" | "Disabled";

  whenCreated: Timestamp;
  whenUpdated: Timestamp;
}
