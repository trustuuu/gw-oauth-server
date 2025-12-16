import { update } from "ramda";
import {
  findConnection,
  findExternalAccount,
  redirectToGoogleAuth,
  refreshGoogleAccessToken,
} from "./externalAuth.js";

export const tokenExchangeGrantGoogle = async (req, res) => {
  try {
    const auth = req.authService || req.auth;
    const userId = auth.sub;
    const companyId = auth.companyId || auth.tenant_id;
    const domainId = auth.domainId;

    if (!userId) {
      return res.status(400).json({ error: "Missing sub in UniDir token" });
    }

    const extAccount = await findExternalAccount({
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
    // if (!updatedAccount || !updatedAccount.providerAccessToken) {
    //   await redirectToGoogleAuth(
    //     companyId,
    //     domainId,
    //     userId,
    //     extAccount.id,
    //     connection,
    //     res
    //   );
    //   return;
    // }

    const response = {
      access_token: updatedAccount.providerAccessToken,
      issued_token_type: "urn:ietf:params:oauth:token-type:access_token",
      token_type: "Bearer",
      expires_in: updatedAccount.providerAccessExpiresAt || 3600,
      scope: updatedAccount.providerScopes,
    };

    return res.status(200).json(response);
  } catch (err) {
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
function isAccessTokenValid(account) {
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
  companyId,
  domainId,
  userId,
  extAccount,
  connection
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
