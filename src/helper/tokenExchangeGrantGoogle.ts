import {
  findConnection,
  findExternalAccount,
  redirectToGoogleAuth,
  refreshGoogleAccessToken,
} from "./externalAuth.js";
import { Request, Response } from "express";
import { IApplication } from "../types/Application.js";

// Note: 'update' from ramda was unused in original code?
// Original code: import { update } from "ramda"; ... but 'update' never used.
// Removing it.

export const tokenExchangeGrantGoogle = async (
  req: Request,
  res: Response,
  client: IApplication,
  targetAudience: string
) => {
  try {
    const auth: any = (req as any).authService || (req as any).auth;
    const userId = auth.sub;
    const companyId = auth.companyId || auth.tenant_id;
    const domainId = auth.domainId || auth.domain; // Added domain fallback

    if (!userId) {
      return res.status(400).json({ error: "Missing sub in UniDir token" });
    }

    const { id: connectionId } = req.body.connection
      ? JSON.parse(req.body.connection)
      : { id: null };

    // Original code calls findExternalAccount.
    // We need to find valid account.

    const extAccount: any = await findExternalAccount({
      companyId,
      domainId,
      userId,
    });

    const connection = await findConnection({
      companyId,
      domainId,
      connectionId: extAccount.connection,
    });

    const updatedAccount = await ensureGoogleAccessToken(
      companyId,
      domainId,
      userId,
      extAccount,
      connection
    );

    const response = {
      access_token: updatedAccount.providerAccessToken,
      issued_token_type: "urn:ietf:params:oauth:token-type:access_token",
      token_type: "Bearer",
      expires_in: updatedAccount.providerAccessExpiresAt || 3600,
      scope: updatedAccount.providerScopes,
    };

    return res.status(200).json(response);
  } catch (err: any) {
    console.error("ALL /google/proxy/* error:", err);
    return res
      .status(500)
      .json({ error: "server_error", message: err.message });
  }
};

/**
 * Helper: check if the stored provider access token is still valid.
 *
 * Assumes providerAccessExpiresAt is a UNIX timestamp (seconds).
 * If you’re storing it as Date/Timestamp, adapt accordingly.
 */
function isAccessTokenValid(account: any) {
  if (!account.providerAccessToken || !account.providerAccessExpiresAt) {
    return false;
  }

  const nowSec = Math.floor(Date.now() / 1000);
  // refresh a little earlier (e.g. 60s before actual expiry)
  return account.providerAccessExpiresAt - nowSec > 60;
}

/**
 * Helper: ensure we have a valid Google access token for this user+provider.
 * - If current providerAccessToken is valid, return it.
 * - Otherwise refresh using providerRefreshToken.
 */
async function ensureGoogleAccessToken(
  companyId: string,
  domainId: string,
  userId: string,
  extAccount: any,
  connection: any
) {
  if (isAccessTokenValid(extAccount)) {
    return { ...extAccount, source: "store" };
  }

  const refreshed = await refreshGoogleAccessToken(
    companyId,
    domainId,
    userId,
    extAccount,
    connection
  );
  return { ...refreshed, source: "provider" };
}
