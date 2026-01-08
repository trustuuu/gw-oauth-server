import {
  decodeClientCredentials,
  generateCodeAccessToken,
  generateIdToken,
  generateRefreshAccessToken,
  getUTCNow,
  verifyCodeChallenge,
} from "./utils.js";
import { getClient } from "../route/oauth/auth_service.js";
import apiService from "../service/api-service.js";
import codeService from "../service/code-service.js";
import { API_PATH, AUTH_PATH } from "../service/remote-path-service.js";
import reqidService from "../service/reqid-service.js";

export const tokenGrant = async (req, res) => {
  const auth = req.headers["authorization"];
  const deviceId = req.headers[process.env.DEVICE_ID_HEADER];

  let clientId = "";
  if (auth) {
    // check the auth header
    const clientCredentials = decodeClientCredentials(auth);
    clientId = clientCredentials.id;
  } else {
    clientId = req.body.client_id;
  }
  console.log(
    "auth, clientId, req.body in tokenGrant",
    auth,
    clientId,
    req.body,
    deviceId
  );

  if (!clientId) {
    console.log("Unknown client");
    return res.status(400).json({ error: "invalid_grant" });
  }
  const client = await getClient(clientId);

  const code = await codeService.getData(AUTH_PATH, req.body.code);
  if (!code || !code.request) {
    console.log("Unknown code, %s", req.body.code);
    return res.status(400).json({ error: "invalid_grant" });
  }
  if (code.request.client_id != clientId) {
    console.log(
      "Client mismatch, expected %s got %s",
      code.request.client_id,
      clientId
    );
    return res.status(400).json({ error: "invalid_grant" });
  }

  await codeService.deleteData.apply(
    codeService,
    [{}].concat([AUTH_PATH, req.body.code])
  );

  if (code.request.id) {
    await reqidService.deleteData.apply(
      reqidService,
      [{}].concat([AUTH_PATH, code.request.id])
    );
  }

  const api = await apiService.getApiByAudience(API_PATH, client.audience);

  if (api.length < 1) {
    console.log(
      "Authence has not been found, expected %s got %s",
      clientId,
      client.audience
    );
    return res.status(400).json({ error: "invalid_grant" });
  }

  const now_utc = getUTCNow();
  const expires_in = Math.floor(now_utc / 1000) + api[0].tokenExpiration * 60;

  if (
    !verifyCodeChallenge(req.body.code_verifier, code.request.code_challenge)
  ) {
    return res.status(400).send("Invalid code_verifier");
  }
  const access_token = await generateCodeAccessToken(
    api[0].issuer, //process.env.OAUTH_ISSUER,
    code.user.id, //client.client_name,
    api[0].audience,
    Math.floor(now_utc / 1000),
    expires_in,
    client,
    api[0],
    code.user
  );

  const refresh_expires_in =
    Math.floor(now_utc / 1000) + api[0].tokenExpiration * 600;
  const refresh_token = await generateRefreshAccessToken(
    api[0].audience,
    refresh_expires_in,
    client,
    deviceId,
    code.user,
    code.scope,
    "refresh"
  );

  const tokenClient = {
    client_id: clientId,
    companyId: code.user.companyId,
    domain: code.user.domainId,
  };

  let token_response = {
    access_token,
    refresh_token,
    expires_in,
    token_type: "Bearer",
    client: tokenClient,
  };

  if (code.scope.includes("openId") || code.scope.includes("openid")) {
    const id_token = generateIdToken(
      api[0].issuer, //process.env.OAUTH_ISSUER,
      Math.floor(now_utc / 1000),
      code.user,
      clientId,
      code.scope
    );

    token_response = { ...token_response, id_token };
  }

  return res.status(200).json(token_response);
};
