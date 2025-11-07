import * as R from "ramda";
import { getVerifyJwtWithJwks } from "../../jwks.js";
import { getClient, saveTokenToDB } from "../route/oauth/auth_service.js";
import refreshTokenService from "../service/refresh-token-service.js";
import apiService from "../service/api-service.js";
import {
  generateCodeAccessToken,
  generateIdToken,
  generateRefreshAccessToken,
  getUTCNow,
} from "./utils.js";
import { API_PATH, AUTH_PATH } from "../service/remote-path-service.js";

export const refreshTokenGrant = async (req, res) => {
  const { companyId, domainId, userId, sessionId } = JSON.parse(
    req.cookies.user
  );

  let deviceId = req.headers[process.env.DEVICE_ID_HEADER];
  const {
    client_id: clientId,
    refresh_token: refreshTokenBody,
    grant_type: grantType,
  } = req.body;

  const refreshTokenBodyPlain = await getVerifyJwtWithJwks(refreshTokenBody);
  if (refreshTokenBody.token_use === "refresh-device") {
    deviceId = refreshTokenBody.device_id;
  } else {
    if (deviceId !== refreshTokenBodyPlain.device_id) {
      console.log(
        `device_mismatch ${deviceId}:${refreshTokenBodyPlain.device_id}`
      );
      return res.status(401).json({ error: "device_mismatch" });
    }
  }

  const refreshTokenServer = await refreshTokenService.getData(
    AUTH_PATH,
    deviceId
  );
  if (refreshTokenServer) {
    console.log("We found a matching refresh token");
    console.log("refreshToken", refreshTokenServer);

    if (refreshTokenServer.client_id != clientId) {
      // tokenService.deleteData.apply(
      //   tokenService,
      //   [{}].concat([deviceId, req.body.refresh_token])
      // );
      console.log(
        `clientId_mismatch ${refreshTokenServer.client_id}:${clientId}`
      );
      return res.status(400).json({ error: "invalid_grant" });
    }

    const client = await getClient(clientId);

    if (!client) {
      console.log("Unknown client %s", clientId);
      return res.status(401).json({ error: "invalid_client" });
    }

    if (!R.includes(grantType, client.grant_types)) {
      console.log(
        "Mismatched grant_type %s does not exist in %s",
        grantType,
        client.grant_types.join(",")
      );
      return res.status(401).json({ error: "invalid_client_grant_type" });
    }

    ///////////////////////////////////////////////////////////
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

    const access_token = await generateCodeAccessToken(
      api[0].issuer, //process.env.OAUTH_ISSUER,
      refreshTokenServer.user.id, //client.client_name,
      api[0].audience,
      Math.floor(now_utc / 1000),
      expires_in,
      client,
      api[0],
      refreshTokenServer.user,
      refreshTokenServer.scope
    );

    const refresh_expires_in =
      Math.floor(now_utc / 1000) + api[0].tokenExpiration * 600;
    const refresh_token = await generateRefreshAccessToken(
      api[0].audience,
      refresh_expires_in,
      client,
      deviceId,
      refreshTokenServer.user,
      refreshTokenServer.scope,
      "refresh"
    );
    const tokenClient = {
      client_id: clientId,
      companyId: client.companyId,
      domain: client.domain,
    };

    let token_response = {
      access_token,
      refresh_token,
      expires_in,
      token_type: "Bearer",
      client: tokenClient,
    };

    let sessionData = {
      companyId,
      domainId,
      email: refreshTokenServer.user,
      accessToken: access_token,
      refreshToken: refresh_token,
      userId,
      sessionId,
    };

    if (refreshTokenServer.scope.includes("openId")) {
      const id_token = generateIdToken(
        api[0].issuer, //process.env.OAUTH_ISSUER,
        Math.floor(now_utc / 1000),
        refreshTokenServer.user,
        clientId,
        refreshTokenServer.scope
      );
      sessionData = { ...sessionData, idToken: id_token };
      token_response = { ...token_response, id_token };
    }
    saveTokenToDB(sessionData);

    ///////////////////////////////////////////////////////////
    return res.status(200).json(token_response);
  }
};
