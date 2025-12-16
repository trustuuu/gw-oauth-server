import domainService from "../service/domain-service.js";
import { AUTH_PATH } from "../service/remote-path-service.js";
import reqidService from "../service/reqid-service.js";
import userService from "../service/user-service.js";
import randomstring from "randomstring";

const GOOGLE_PROVIDER = "google";
const tokenEndpointGoogle = "https://oauth2.googleapis.com/token";
const authUrlGoogle = "https://accounts.google.com/o/oauth2/v2/auth";
// This function must be called from your server after the user is redirected
// back from Google with the authorization 'code' in the URL query parameters.

// This function runs on your server (e.g., in an Express route handler)

/**
 * Generates the Google Authorization URL and redirects the user.
 * @param {string} redirectUri The URI on your server where Google will send the user back.
 * @param {string} scope A space-separated list of Google API scopes (e.g., 'email profile https://www.googleapis.com/auth/calendar').
 * @param {object} res The server response object (e.g., Express response).
 */
export async function redirectToGoogleAuth(
  companyId,
  domainId,
  userId,
  accountId,
  connection,
  res
) {
  const authUrl = new URL(authUrlGoogle);
  authUrl.searchParams.append("client_id", connection.clientId);
  authUrl.searchParams.append("redirect_uri", connection.redirectUrl);
  authUrl.searchParams.append("response_type", "code"); // Requesting the authorization code
  authUrl.searchParams.append("scope", connection.scopes.join(" "));
  authUrl.searchParams.append("access_type", "offline"); // MANDATORY to get a Refresh Token
  authUrl.searchParams.append("prompt", "consent"); // MANDATORY to ensure you get a Refresh Token on first consent

  const reqId = `google-${randomstring.generate(8)}`;
  const stateData = {
    companyId,
    domainId,
    userId,
    accountId,
    connectionId: connection.id,
    // Add a unique token and store it in the session for CSRF check
    csrfToken: reqId,
  };

  await reqidService.setData.apply(
    reqidService,
    [stateData].concat([AUTH_PATH, reqId])
  );
  // Encode the object into a URL-safe string
  const encodedState = btoa(JSON.stringify(stateData));
  // Now send this encodedState in your authorization request
  authUrl.searchParams.append("state", encodedState);
  console.log(authUrl);
  // Example using Express:
  res.redirect(authUrl.toString());
}

/**
 * Exchanges the Google authorization code for an Access Token and Refresh Token.
 * @param {string} authorizationCode The temporary code received from Google's redirect.
 * @param {string} redirectUri The exact redirect URI used in Phase 1 (must match).
 * @returns {Promise<object>} An object containing the access_token, refresh_token, and expiration time.
 */
export async function getGoogleInitialTokens(connection, authorizationCode) {
  try {
    // 1. Setup the request parameters for the Token Endpoint
    const params = new URLSearchParams({
      client_id: connection.clientId,
      client_secret: connection.clientSecret,
      code: authorizationCode, // The code from Google's redirect
      redirect_uri: connection.redirectUrl, // MUST exactly match the URI used in the initial redirect
      grant_type: "authorization_code", // The critical parameter for initial exchange
    });

    // 2. Make the POST request to the Token Endpoint
    // const response = await axios.post(
    //   "https://oauth2.googleapis.com/token",
    //   params.toString(),
    //   { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    // );
    const response = await fetch(tokenEndpointGoogle, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    // 1. Check if the request was successful
    if (!response.ok) {
      // Handle error response (e.g., Google returns a non-200 status code)
      const errorBody = await response
        .json()
        .catch(() => ({ message: "Failed to parse error body" }));
      throw new Error(
        `Token exchange failed. Status: ${
          response.status
        }. Error: ${JSON.stringify(errorBody)}`
      );
    }

    // 2. THIS IS THE KEY STEP: Read the stream and parse the JSON body
    const tokenData = await response.json();

    return tokenData;
  } catch (error) {
    console.error(
      "Failed to exchange code for tokens:",
      error.response ? error.response.data : error.message
    );
    // Redirect to a login error page if token exchange fails.
    throw new Error(error.response ? error.response.data : error.message);
  }
  // const data = response.data;

  // // 3. Return the tokens
  // // NOTE: This initial exchange is where you receive the Refresh Token for the first time.
  // return {
  //   access_token: data.access_token,
  //   expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
  //   refresh_token: data.refresh_token, // This is the long-lived token! Store it securely.
  // };
}

/**
 * Helper: refresh Google access token using refresh_token.
 *
 * - Uses connection.clientId / clientSecret
 * - Calls Google's standard token endpoint
 * - Updates ExternalIdentityAccount with new access token, expiry, scopes
 * - Returns the updated account object
 */
export async function refreshGoogleAccessToken(
  companyId,
  domainId,
  userId,
  account,
  connection
) {
  if (!account.providerRefreshToken) {
    console.log("No providerRefreshToken available to refresh Google token");
    throw new Error(
      "No providerRefreshToken available to refresh Google token"
    );
  }

  const params = new URLSearchParams();
  params.append("client_id", connection.clientId);
  params.append("client_secret", connection.clientSecret);
  params.append("refresh_token", account.providerRefreshToken);
  params.append("grant_type", "refresh_token");

  //   const response = await axios.post(tokenEndpointGoogle, params.toString(), {
  //     headers: { "Content-Type": "application/x-www-form-urlencoded" },
  //   });
  const response = await fetch(tokenEndpointGoogle, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      "Failed to refresh Google token:",
      response.status,
      errorBody
    );
    return {
      error: `Failed to refresh Google access token ${response.status},
      ${errorBody}`,
    };
    //throw new Error("Failed to refresh Google access token");
  }

  const data = await response.json();

  const updatedAccount = await updateTokenToServer(
    companyId,
    domainId,
    userId,
    account,
    data
  );

  return updatedAccount;
}

export async function getAzureAccessToken(refreshToken) {
  const tenantId = process.env.AZURE_TENANT_ID;

  const params = new URLSearchParams({
    client_id: process.env.AZURE_CLIENT_ID,
    client_secret: process.env.AZURE_CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await axios.post(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    params.toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  const data = response.data;

  return {
    access_token: data.access_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    refresh_token: data.refresh_token, // sometimes rotated
  };
}

export async function updateTokenToServer(
  companyId,
  domainId,
  userId,
  account,
  data
) {
  const nowSec = Math.floor(Date.now() / 1000);
  const newAccessToken = data.access_token;
  const expiresIn = data.expires_in || 3600;
  const newRefreshToken = data.refresh_token || account.providerRefreshToken;
  const newScopes = data.scope
    ? data.scope.split(" ").filter(Boolean)
    : account.providerScopes || [];

  const updatedAccount = {
    ...account,
    providerAccessToken: newAccessToken,
    providerAccessExpiresAt: nowSec + expiresIn,
    providerRefreshToken: newRefreshToken,
    providerScopes: newScopes,
    whenUpdated: new Date(),
    status: "Updated",
  };

  // TODO: adapt to your real update API
  // e.g. externalIdentityAccountService.updateData(path, account.id, updatedAccount)
  //await userService.updateExternal.updateAccount(updatedAccount);

  await userService.updateData.apply(
    userService,
    [updatedAccount].concat([
      companyId,
      domainId,
      userId,
      "ExternalIdentityAccounts",
      account.id,
    ])
  );
  return updatedAccount;
}

/**
 * Helper: lookup ExternalIdentityAccount by UniDir user + provider.
 *
 * You said ExternalIdentityAccount has:
 *   id, name, provider, providerAccessExpiresAt, providerAccessToken,
 *   providerRefreshToken, providerScopes, providerUserId, status, userId
 *
 * Adjust the service call to match your real API.
 */
export async function findExternalAccount({
  companyId,
  domainId,
  userId,
  accountId,
}) {
  // EXAMPLE: you may actually filter by tenant/domain in your DB query.
  // Replace this with your real implementation.
  const accounts = await userService.getExternalIdentityAccounts(
    companyId,
    domainId,
    userId,
    accountId,
    accountId ? null : ["provider", "==", GOOGLE_PROVIDER]
  );
  const account = Array.isArray(accounts)
    ? accounts.length > 0
      ? accounts[0]
      : {}
    : accounts;
  if (!account) {
    throw new Error("No ExternalIdentityAccount for Google");
  }
  if (!account.enabled) {
    throw new Error(
      `ExternalIdentityAccount is not active: ${account.enabled}`
    );
  }

  return account;
}

/**
 * Helper: lookup Google connection (clientId/clientSecret/etc.)
 *
 * connection table fields:
 *   clientId, clientSecret, id, name, provider, redirectUrl, scopes
 *
 * Adjust this implementation to your real service.
 */
export async function findConnection({ companyId, domainId, connectionId }) {
  const connections = await domainService.getDomainConnections(
    companyId,
    domainId,
    connectionId
  );
  const connection = Array.isArray(connections)
    ? connections.length > 0
      ? connections[0]
      : {}
    : connections;

  if (!connection) {
    throw new Error("No Google connection configuration found");
  }

  return connection;
}
