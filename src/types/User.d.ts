import { Timestamp } from "./Timestamp";

export interface UserName {
  givenName: string | null;
  familyName: string | null;
  formatted: string | null;
  honorificPrefix: string | null;
  honorificSuffix: string | null;
}

export interface Address {
  streetAddress: string;
  locality: string;
  region: string;
  postalCode: string;
  country: string;
  type: "work" | "home" | "other";
  primary: boolean;
  formatted: string | null;
}

export interface MultiValue {
  value: string;
  type: string;
  primary: boolean;
}

export interface EnterpriseExtension {
  employeeNumber: string | null;
  department: string | null;
  division: string | null;
  organization: string | null;
  costCenter: string | null;
  manager: string | null; // This is often an object or ID string
}

/**
 * Main User Interface based on SCIM 2.0 Core User Schema
 */
export interface User {
  id: string;
  session: string | null;
  password: string | null;
  authVerification: string | null;
  externalId: string | null;
  userName: string;
  displayName: string;
  nickName: string | null;
  title: string | null;
  userType: string | null;
  preferredLanguage: string | null;
  locale: string | null;
  timezone: string | null;
  active: boolean;
  mfa: boolean;
  status: "active" | "deleted" | "suspended";

  // Complex Objects
  name: UserName;
  meta: {
    resourceType: string;
  };

  email: string;
  // Arrays
  emails: MultiValue[];
  phoneNumbers: MultiValue[];
  addresses: Address[];
  Schemas: string[];

  // Extensions & Metadata
  enterpriseExtension: EnterpriseExtension;
  customExtension: Record<string, any>;
  whenCreated: Timestamp;
  whenUpdated: Timestamp;

  // Placeholder for the "0" key if your API returns the object nested under index keys
  [key: string]: any;
}
