// googleResourceRouter.js
//
// Express router that uses UniDir token_exchange-issued access tokens
// to call Google APIs using ExternalIdentityAccount + connection.
//
// REQUIREMENTS:
//   npm install node-fetch (or use global fetch in Node 18+)
//   externalIdentityAccountService + connectionService already exist.
//
// NOTE: You can mount this with:
//   import googleResourceRouter from "./googleResourceRouter.js";
//   app.use("/api", googleResourceRouter);

import express from "express";
import fetch from "node-fetch"; // If you're on Node 18+, you can use global fetch instead.
import { authenticate } from "../route/jkws.js";

import externalIdentityAccountService from "../service/external-identity-account-service.js";
import connectionService from "../service/connection-service.js";

const router = express.Router();

const GOOGLE_PROVIDER = "google";

/**
 * Helper: check if the stored provider access token is still valid.
 * 
 * Assumes providerAccessExpiresAt is a UNIX timestamp (seconds).
 * If you’re storing it as Date/Timestamp, adapt accordingly.
 */
function isAccessTokenValid(account) {
  if (!account.providerAccessToken || !account.providerAccessExpiresAt) {
    return false;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  // refresh a little earlier (e.g. 60s before actual expiry)
  return account.providerAccessExpiresAt - nowSec > 60;
}

/**
 * Helper: refresh Google access token using refresh_token.
 * 
 * - Uses connection.clientId / clientSecret
 * - Calls Google's standard token endpoint
 * - Updates ExternalIdentityAccount with new access token, expiry, scopes
 * - Returns the updated account object
 */
async function refreshGoogleAccessToken(account, connection) {
  if (!account.providerRefreshToken) {
    throw new Error("No providerRefreshToken available to refresh Google token");
  }

  const tokenEndpoint = "https://oauth2.googleapis.com/token";
  const params = new URLSearchParams();
  params.append("client_id", connection.clientId);
  params.append("client_secret", connection.clientSecret);
  params.append("refresh_token", account.providerRefreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Failed to refresh Google token:", response.status, errorBody);
    throw new Error("Failed to refresh Google access token");
  }

  const data = await response.json();

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
  };

  // TODO: adapt to your real update API
  // e.g. externalIdentityAccountService.updateData(path, account.id, updatedAccount)
  await externalIdentityAccountService.updateAccount(updatedAccount);

  return updatedAccount;
}

/**
 * Helper: ensure we have a valid Google access token for this user+provider.
 * - If current providerAccessToken is valid, return it.
 * - Otherwise refresh using providerRefreshToken.
 */
async function ensureGoogleAccessToken(extAccount, connection) {
  if (isAccessTokenValid(extAccount)) {
    return extAccount.providerAccessToken;
  }

  const refreshed = await refreshGoogleAccessToken(extAccount, connection);
  return refreshed.providerAccessToken;
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
async function findUserGoogleAccount({ companyId, domainId, userId }) {
  // EXAMPLE: you may actually filter by tenant/domain in your DB query.
  // Replace this with your real implementation.
  const account = await externalIdentityAccountService.getByUserAndProvider({
    companyId,
    domainId,
    userId,
    provider: GOOGLE_PROVIDER,
  });

  if (!account) {
    throw new Error("No ExternalIdentityAccount for Google");
  }
  if (account.status !== "enabled" && account.status !== "active") {
    throw new Error(`ExternalIdentityAccount is not active: ${account.status}`);
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
async function findGoogleConnection({ companyId, domainId }) {
  const connection = await connectionService.getGoogleConnection({
    companyId,
    domainId,
    provider: GOOGLE_PROVIDER,
  });

  if (!connection) {
    throw new Error("No Google connection configuration found");
  }

  return connection;
}

/**
 * Example 1: GET /api/google/userinfo
 *
 * Calls Google OpenID Connect userinfo endpoint for the current UniDir user.
 * Requires:
 *   - Authorization: Bearer <UniDir access token (token_exchange)>
 *   - ExternalIdentityAccount configured for Google
 *   - Connection configured for Google (clientId/clientSecret/etc.)
 */
router.get("/google/userinfo", authenticate, async (req, res) => {
  try {
    // req.authService was populated by authenticate() (jkws.js)
    const auth = req.authService || req.auth;

    const userId = auth.sub;
    const companyId = auth.companyId || auth.tenant_id;
    const domainId = auth.domainId;

    if (!userId) {
      return res.status(400).json({ error: "Missing sub in UniDir token" });
    }

    // 1. Find ExternalIdentityAccount for this user + Google
    const extAccount = await findUserGoogleAccount({
      companyId,
      domainId,
      userId,
    });

    // 2. Find Google connection config
    const connection = await findGoogleConnection({
      companyId,
      domainId,
    });

    // 3. Ensure valid Google access token (refresh if needed)
    const googleAccessToken = await ensureGoogleAccessToken(
      extAccount,
      connection
    );

    // 4. Call Google userinfo endpoint
    const userinfoEndpoint = "https://openidconnect.googleapis.com/v1/userinfo";

    const googleResp = await fetch(userinfoEndpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${googleAccessToken}`,
      },
    });

    if (!googleResp.ok) {
      const body = await googleResp.text();
      console.error(
        "Google userinfo call failed:",
        googleResp.status,
        body
      );
      return res.status(502).json({
        error: "google_api_error",
        status: googleResp.status,
        body,
      });
    }

    const userinfo = await googleResp.json();
    return res.status(200).json(userinfo);
  } catch (err) {
    console.error("GET /google/userinfo error:", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});

/**
 * Example 2 (optional): Generic proxy to Google API
 *
 *   GET /api/google/proxy/calendar/v3/users/me/calendarList
 *
 * will call:
 *   https://www.googleapis.com/calendar/v3/users/me/calendarList
 *
 * You can extend this to support POST/PUT/DELETE as needed.
 */
router.all("/google/proxy/*", authenticate, async (req, res) => {
  try {
    const auth = req.authService || req.auth;

    const userId = auth.sub;
    const companyId = auth.companyId || auth.tenant_id;
    const domainId = auth.domainId;

    if (!userId) {
      return res.status(400).json({ error: "Missing sub in UniDir token" });
    }

    const extAccount = await findUserGoogleAccount({
      companyId,
      domainId,
      userId,
    });

    const connection = await findGoogleConnection({
      companyId,
      domainId,
    });

    const googleAccessToken = await ensureGoogleAccessToken(
      extAccount,
      connection
    );

    // Build Google URL from the wildcard path
    const googlePath = req.params[0]; // part after /google/proxy/
    const baseUrl = "https://www.googleapis.com/";
    const googleUrl = new URL(googlePath, baseUrl);

    // Forward querystring from original request
    Object.entries(req.query || {}).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        v.forEach((vv) => googleUrl.searchParams.append(k, vv));
      } else {
        googleUrl.searchParams.append(k, v);
      }
    });

    // Forward method/body/headers (except auth-related)
    const method = req.method;
    const headers = {
      Authorization: `Bearer ${googleAccessToken}`,
    };

    // You can add more header passthrough here if needed
    if (req.headers["content-type"]) {
      headers["Content-Type"] = req.headers["content-type"];
    }

    const bodyAllowed = ["POST", "PUT", "PATCH"].includes(method.toUpperCase());
    const body = bodyAllowed ? JSON.stringify(req.body ?? {}) : undefined;

    const googleResp = await fetch(googleUrl.toString(), {
      method,
      headers,
      body,
    });

    const text = await googleResp.text();
    let json;

    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }

    res.status(googleResp.status).send(json);
  } catch (err) {
    console.error("ALL /google/proxy/* error:", err);
    return res.status(500).json({ error: "server_error", message: err.message });
  }
});

export default router;
