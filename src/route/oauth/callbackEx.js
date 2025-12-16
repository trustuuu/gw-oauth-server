import {
  findConnection,
  findExternalAccount,
  getGoogleInitialTokens,
  updateTokenToServer,
} from "../../helper/externalAuth.js";
import reqidService from "../../service/reqid-service.js";
import { AUTH_PATH } from "../../service/remote-path-service.js";

/**
 * @route GET /auth/google/callback
 * @description Receives the Authorization Code from Google and exchanges it
 * for the Access and Refresh Tokens.
 */
export const callbackEx = async (req, res, routerAuth) => {
  // 1. Extract 'code' and 'state' from the query parameters sent by Google.
  const { code, state } = req.query;

  // --- (Optional but CRITICAL Security Step) ---
  // 2. CSRF Defense: Compare the returned state value with the one stored in the user's session.
  // if (!state || state !== req.session.oauthState) {
  //     return res.status(400).send('State parameter mismatch or missing.');
  // }
  // delete req.session.oauthState; // Clear the state token after use.

  // 3. Retrieve Custom Data: Decode the custom data stored in the 'state' parameter.
  let customData = {};
  if (state) {
    try {
      // Base64 decoding and JSON parsing (must match how it was encoded in Phase 1)
      const decodedStateJson = Buffer.from(state, "base64").toString("utf8");
      customData = JSON.parse(decodedStateJson);
      // Now customData.redirect can be used to determine the final destination.
    } catch (error) {
      console.error("Failed to decode state parameter:", error);
      // Handle error if the state value is tampered with or malformed.
      return res.status(400).send("Invalid state parameter format.");
    }
  }
  // --- (End of Security Steps) ---
  const {
    companyId,
    domainId,
    userId,
    accountId,
    connectionId,
    csrfToken,
    origin,
  } = customData;

  // 4. Handle Authorization Denial
  if (!code) {
    // If the user denied access, Google sends error parameters instead of 'code'.
    const { error, error_description } = req.query;
    console.error("Google Auth Error:", error, error_description);
    return res.redirect("/login?auth_error=" + (error || "user_denied"));
  }

  const reqData = await reqidService.getData(AUTH_PATH, csrfToken);

  if (!reqData) return res.status(400).send("Invalid callback");
  await reqidService.deleteData.apply(
    reqidService,
    [{}].concat([AUTH_PATH, csrfToken])
  );

  try {
    const connection = await findConnection({
      companyId,
      domainId,
      connectionId: connectionId,
    });

    if (!connection) {
      console.error(
        "Google Auth Error:Connection has not been found.",
        connectionId
      );
      return res.redirect(
        "/login?auth_error=Google Auth Error:Connection has not been found."
      );
    }
    // 5. Exchange the Code for Tokens
    const token_data = await getGoogleInitialTokens(connection, code);
    //

    // 6. Token Storage and Final Redirect
    if (!token_data) {
      console.error("Failed to exchange code for tokens:");
      return res.redirect("/login?error=token_exchange_failed");
    }
    // Store the long-lived Refresh Token and expiration in your database.
    // e.g., await saveUserTokens(customData.userId, tokens);

    // Store the short-lived Access Token in the session/cookies or issue a JWT.
    const account = await findExternalAccount({
      companyId,
      domainId,
      userId,
      accountId,
    });

    const updatedAccount = await updateTokenToServer(
      companyId,
      domainId,
      userId,
      account,
      token_data
    );
    const payload = {
      accountId,
      origin,
      mode: "view",
      // etc.
    };

    // 2. Stringify and Base64 encode the payload
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      "base64"
    );

    // 3. Construct the final URL with the encoded data as a query parameter
    const redirectUrl = `${origin}/users-external-account-view?data=${encodedPayload}`;

    // 4. Redirect the browser
    // This tells the browser: "Stop here, now go load this new URL."
    res.redirect(redirectUrl);

    // const response = {
    //   access_token: updatedAccount.providerAccessToken,
    //   issued_token_type: "urn:ietf:params:oauth:token-type:access_token",
    //   token_type: "Bearer",
    //   expires_in: updatedAccount.providerAccessExpiresAt || 3600,
    //   scope: updatedAccount.providerScopes,
    // };
    // return res.status(200).json(response);
  } catch (error) {
    console.error(
      "Failed to exchange code for tokens:",
      error.response ? error.response.data : error.message
    );
    // Redirect to a login error page if token exchange fails.
    return res.redirect("/login?error=token_exchange_failed");
  }
};
