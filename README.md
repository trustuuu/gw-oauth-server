[OAuth 2.0: Client Credentials vs Authorization Code]
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

[Role-Based Access Control (RBAC) Setup]
| Step | Description |
|-----------------------|--------------------------------------|
|1 | Predefine roles in the OAuth server|
|2 | Map users to specific roles|
|3 | Configure the OAuth server to include the roles claim in the Access Token|
|4 | API server reads the roles claim when validating the JWT Access Token|
|5 | Allow or deny API access based on required roles (RBAC enforcement)|