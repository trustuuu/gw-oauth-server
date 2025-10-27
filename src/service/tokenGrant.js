import {
  decodeClientCredentials,
  generateCodeAccessToken,
  generateIdToken,
  generateRefreshAccessToken,
  verifyCodeChallenge,
} from "../helper/utils.js";
import { getClient } from "../route/oauth/auth_service.js";
import apiService from "./api-service.js";
import codeService from "./code-service.js";
import reqidService from "./reqid-service.js";

const authId = "authorization";
const apiId = "api";

export const tokenGrant = async (req, res) => {
  const auth = req.headers["authorization"];
  const deviceId = req.headers[process.env.DEVICE_ID_HEADER];

  let clientId = "";
  if (auth) {
    // check the auth header
    const clientCredentials = decodeClientCredentials(auth);
    clientId = clientCredentials.id;
  }
  if (!clientId) {
    console.log("Unknown client");
    return res.status(400).json({ error: "invalid_grant" });
  }
  const client = await getClient(clientId);

  const code = await codeService.getData(authId, req.body.code);
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
    [{}].concat([authId, req.body.code])
  );

  if (code.request.id) {
    await reqidService.deleteData.apply(
      reqidService,
      [{}].concat([authId, code.request.id])
    );
  }

  //const api = await apiService.getApiByIdentifier.apply(apiService, [{}].concat([apiId, client.audience]));
  const api = await apiService.getApiByIdentifier(apiId, client.audience);
  if (api.length < 1) {
    console.log(
      "Authence has not been found, expected %s got %s",
      clientId,
      client.audience
    );
    return res.status(400).json({ error: "invalid_grant" });
  }

  const date = new Date();
  const now_utc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
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
    code.scope
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
  console.log("code.scope", code.scope);
  if (code.scope.includes("openId")) {
    const id_token = generateIdToken(
      api[0].issuer, //process.env.OAUTH_ISSUER,
      Math.floor(now_utc / 1000),
      code.user,
      clientId,
      code.scope
    );
    token_response = { ...token_response, id_token };
  }

  console.log("token_response", token_response);
  return res.status(200).json(token_response);
};
