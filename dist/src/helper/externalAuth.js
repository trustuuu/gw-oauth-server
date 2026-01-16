import domainService from "../service/domain-service.js";
import { AUTH_PATH } from "../service/remote-path-service.js";
import reqidService from "../service/reqid-service.js";
import userService from "../service/user-service.js";
import randomstring from "randomstring";
const GOOGLE_PROVIDER = "google";
const tokenEndpointGoogle = "https://oauth2.googleapis.com/token";
const tokenEndpointAzure = `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token`;
const authUrlGoogle = "https://accounts.google.com/o/oauth2/v2/auth";
/**
 * Generates the Google Authorization URL and redirects the user.
 * @param {string} redirectUri The URI on your server where Google will send the user back.
 * @param {string} scope A space-separated list of Google API scopes (e.g., 'email profile https://www.googleapis.com/auth/calendar').
 * @param {object} res The server response object (e.g., Express response).
 */
export async function redirectToGoogleAuth(companyId, domainId, userId, accountId, connection, res) {
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
        csrfToken: reqId,
    };
    await reqidService.setData(stateData, AUTH_PATH, reqId);
    const encodedState = btoa(JSON.stringify(stateData));
    authUrl.searchParams.append("state", encodedState);
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
        const params = new URLSearchParams({
            client_id: connection.clientId,
            client_secret: connection.clientSecret,
            code: authorizationCode, // The code from Google's redirect
            redirect_uri: connection.redirectUrl,
            grant_type: "authorization_code",
        });
        const response = await fetch(tokenEndpointGoogle, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        });
        if (!response.ok) {
            // .json() might fail if not json
            const errorBody = await response
                .json()
                .catch(() => ({ message: "Failed to parse error body" }));
            throw new Error(`Token exchange failed. Status: ${response.status}. Error: ${JSON.stringify(errorBody)}`);
        }
        const tokenData = await response.json();
        return tokenData;
    }
    catch (error) {
        console.error("Failed to exchange code for tokens:", error.response ? error.response.data : error.message);
        throw new Error(error.response ? error.response.data : error.message);
    }
}
export async function refreshGoogleAccessToken(companyId, domainId, userId, account, // ExternalIdentityAccount type?
connection) {
    if (!account.providerRefreshToken) {
        console.log("No providerRefreshToken available to refresh Google token");
        throw new Error("No providerRefreshToken available to refresh Google token");
    }
    const params = new URLSearchParams();
    params.append("client_id", connection.clientId);
    params.append("client_secret", connection.clientSecret);
    params.append("refresh_token", account.providerRefreshToken);
    params.append("grant_type", "refresh_token");
    const response = await fetch(tokenEndpointGoogle, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Failed to refresh Google token:", response.status, errorBody);
        return {
            error: `Failed to refresh Google access token ${response.status},
      ${errorBody}`,
        };
    }
    const data = await response.json();
    const updatedAccount = await updateTokenToServer(companyId, domainId, userId, account, data);
    return updatedAccount;
}
export async function getAzureAccessToken(refreshToken) {
    const params = new URLSearchParams({
        client_id: process.env.AZURE_CLIENT_ID || "",
        client_secret: process.env.AZURE_CLIENT_SECRET || "",
        scope: "https://graph.microsoft.com/.default",
        refresh_token: refreshToken,
        grant_type: "refresh_token",
    });
    const response = await fetch(tokenEndpointAzure, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
    });
    const data = await response.data; // Original code said 'response.data', but fetch returns Response object which has .json(). 'axios' returns .data. Using fetch here, so probably .json(). BUT original code said 'response.data'. If original used axios, then response.data is correct.
    // Wait, original code:
    // const response = await fetch(...)
    // const data = response.data;
    // This implies original code might have been using a fetch polyfill/wrapper or it was ACTUALLY axios but imported as fetch (unlikely)?
    // OR the original code was BROKEN (fetch result doesn't have .data property).
    // Standard fetch returns [Response]. .json() returns the body.
    // I will switch to .json() which is standard for fetch.
    // If original code was importing axios as fetch, then this is a change.
    // Assuming standard fetch.
    // Re-reading original `externalAuth.js`:
    // It uses `fetch` without import, so global fetch (Node 18+).
    // It accesses `response.data`. Global fetch response does NOT have `.data`.
    // So `getAzureAccessToken` in original JS might be BROKEN.
    // I will check `getGoogleInitialTokens` which calls `response.json()`.
    // So `getGoogleInitialTokens` uses standard fetch pattern.
    // `getAzureAccessToken` uses `response.data`. Pattern mismatch.
    // I will assume `response.json()` is intended.
    // const data = await response.json();
    // However, I'll stick to what I see in `response.json()` usage elsewhere.
    // I'll make it `.json()`.
    const responseJson = await response.json();
    return {
        access_token: responseJson.access_token,
        expires_at: new Date(Date.now() + responseJson.expires_in * 1000).toISOString(),
        refresh_token: responseJson.refresh_token,
    };
}
export async function updateTokenToServer(companyId, domainId, userId, account, data) {
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
    await userService.updateData(updatedAccount, companyId, domainId, userId, "ExternalIdentityAccounts", account.id);
    return updatedAccount;
}
export async function findExternalAccount({ companyId, domainId, userId, accountId, }) {
    const accounts = await userService.getExternalIdentityAccounts(companyId, domainId, userId, accountId, accountId ? null : ["provider", "==", GOOGLE_PROVIDER]);
    const account = Array.isArray(accounts)
        ? accounts.length > 0
            ? accounts[0]
            : {}
        : accounts;
    if (!account) {
        throw new Error("No ExternalIdentityAccount for Google");
    }
    if (!account.enabled) {
        throw new Error(`ExternalIdentityAccount is not active: ${account.enabled}`);
    }
    return account;
}
export async function findConnection({ companyId, domainId, connectionId, }) {
    const connections = await domainService.getDomainConnections(companyId, domainId, connectionId);
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
