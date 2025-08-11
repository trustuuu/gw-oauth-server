## OAuth 2.0: Client Credentials vs Authorization Code
| Category | client_credentials | authorization_code |
|-----------------------|--------------------------------------|---------------------------------------|
| Usage | Server-to-server API calls | API calls after user authentication |
| User Interface | None | Login required |
| Issued Tokens | access_token only | access_token + id_token |
| Authentication Method | client_id + client_secret | User login + client_id |

[Diagram]

    subgraph Client Credentials Flow
        A1[Client (Backend Server)]
        A2[Request Token (client_id + client_secret)]
        A3[OAuth Server issues access_token]
        A4[Client calls API with access_token]
        
        A1 --> A2
        A2 --> A3
        A3 --> A4
    end

    subgraph Authorization Code Flow
        B1[Client (Browser/App)]
        B2[Redirect to OAuth Login Page]
        B3[User Login]
        B4[Authorization Code Issued]
        B5[Exchange Code for access_token + id_token]
        B6[Client calls API with access_token]
        B7[Client decodes id_token to display user info]

        B1 --> B2
        B2 --> B3
        B3 --> B4
        B4 --> B5
        B5 --> B6
        B5 --> B7
    end

## Role-Based Access Control (RBAC) Setup
| Step | Description |
|-----------------------|--------------------------------------|
|1 | Predefine roles in the OAuth server|
|2 | Map users to specific roles|
|3 | Configure the OAuth server to include the roles claim in the Access Token|
|4 | API server reads the roles claim when validating the JWT Access Token|
|5 | Allow or deny API access based on required roles (RBAC enforcement)|


## ✅ All OAuth 2.0 `grant_type` Overview

| Grant Type              | Description                                                                 | Common Use Cases                | User Involved |
|-------------------------|-----------------------------------------------------------------------------|----------------------------------|---------------|
| authorization_code      | After user login, exchanges Authorization Code for Access Token             | Web or SPA login                 | ✅ Yes        |
| authorization_code + PKCE | Secure version of authorization_code (commonly used in SPAs and mobile)   | React apps, mobile apps          | ✅ Yes        |
| client_credentials       | Client app requests Access Token without user interaction                   | Server-to-server APIs, backend   | ❌ No         |
| password (deprecated)    | Token issued using user's username and password directly                    | Legacy mobile/internal apps      | ✅ Yes        |
| refresh_token            | Used to obtain new Access Token using a Refresh Token after expiration      | Persistent login sessions        | ❌ No         |
| implicit (deprecated)    | Access Token issued directly via browser redirect (less secure)             | Legacy SPAs                      | ✅ Yes        |
| device_code              | Used in environments without browsers; user authenticates on another device | TV apps, IoT, CLI login          | ✅ Yes        |
| jwt_bearer               | Requests Access Token using a signed JWT (for server-to-server auth)        | Backend service-to-service auth  | ❌ No         |
| saml2_bearer             | Exchanges SAML assertions for OAuth tokens                                  | SSO integration                  | ✅ Yes        |
| token_exchange           | Exchanges one token for another (delegated access)                          | Service-to-service delegation    | ❌ No         |

# ✅ Recommended `grant_type` by Scenario

| Scenario                                      | Recommended `grant_type`       |
|----------------------------------------------|---------------------------------|
| SPA (React, Vue, etc.)                        | `authorization_code + PKCE`    |
| Server-to-server communication (API → API)    | `client_credentials`           |
| Persistent authentication after login         | `refresh_token`                |
| Devices like CLI, Smart TV                    | `device_code`                  |
| Backend without user (e.g., Google Service Account) | `jwt_bearer`              |
