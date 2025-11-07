import { getClient } from "../route/oauth/auth_service.js";
import apiService from "../service/api-service.js";
import deviceService from "../service/device-service.js";
import { API_PATH, AUTH_PATH } from "../service/remote-path-service.js";
import userService from "../service/user-service.js";
import {
  generateIdToken,
  generateRefreshAccessToken,
  generateServiceAccessToken,
  getUTCNow,
} from "./utils.js";

export const deviceCodeGrant = async (req, res) => {
  const { client_id, device_code } = req.body;

  if (!device_code || !client_id) {
    return res.status(400).json({ error: "invalid_request" });
  }

  let device = await deviceService.getData(AUTH_PATH, device_code);
  console.log("device, client_id", device, client_id);
  // if (!device || device.client_id !== client_id) {
  //   return res.status(400).json({ error: "invalid_grant" });
  // }

  const now = Date.now();
  // Calculate deviceExpiresAt from whenUpdated + expires_in
  const deviceUpdatedMs =
    device.whenUpdated.seconds * 1000 +
    Math.floor(device.whenUpdated.nanoseconds / 1e6);
  const deviceExpiresAt = deviceUpdatedMs + device.expires_in * 1000;
  console.log("now, deviceUpdatedMs", now, deviceUpdatedMs);
  if (now > deviceExpiresAt) {
    return res.status(400).json({ error: "expired_token" });
  }

  if (device.rejected) {
    return res.status(400).json({ error: "access_denied" });
  }

  if (!device.approved) {
    if (device.last_poll && now - device.last_poll < device.interval * 1000) {
      return res.status(400).json({ error: "slow_down" });
    }
    device = {
      ...device,
      last_poll: now,
      whenUpdated: new Date(),
    };
    await deviceService.setData.apply(
      deviceService,
      [device].concat([AUTH_PATH, device.device_code])
    );
    return res.status(400).json({ error: "authorization_pending" });
  }

  const client = await getClient(client_id);
  if (!client) {
    console.log("Unknown client %s", client_id);
    return res.status(401).json({ error: "invalid_client" });
  }

  const api = await apiService.getApiByAudience(API_PATH, client.audience);
  if (api.length < 1) {
    console.log(
      "Authence has not been found, client %s expected %s",
      client_id,
      client.audience
    );
    res.status(400).json({ error: "invalid_grant" });
    return;
  }
  const now_utc = getUTCNow();
  const expires_in = Math.floor(now_utc / 1000) + api[0].tokenExpiration * 60;
  const access_token = await generateServiceAccessToken(
    api[0].issuer,
    client.client_name,
    api[0].audience,
    Math.floor(now_utc / 1000),
    expires_in,
    client,
    api[0]
  );

  let user = await userService.getData(
    device.tenant_id,
    device.domain_id,
    device.user_id
  );
  if (!user) {
    console.log("user is not found", device.user_id);
    return res.status(401).send("user is not found");
  }
  if (user && user.session) delete user.session;
  if (user && user.authVerification) delete user.authVerification;

  const refresh_expires_in =
    Math.floor(now_utc / 1000) + api[0].tokenExpiration * 600;
  const refresh_token = await generateRefreshAccessToken(
    api[0].audience,
    refresh_expires_in,
    client,
    device.device_code,
    user,
    device.scope,
    "refresh-device"
  );
  const tokenClient = {
    client_id: client_id,
    companyId: device.company_id,
    domain: device.domain_id,
  };

  let token_response = {
    access_token,
    refresh_token,
    expires_in,
    token_type: "Bearer",
    client: tokenClient,
  };
  if (device.scope.includes("openId")) {
    const id_token = generateIdToken(
      api[0].issuer, //process.env.OAUTH_ISSUER,
      Math.floor(now_utc / 1000),
      user,
      client_id,
      device.scope
    );
    token_response = { ...token_response, id_token };
  }
  //saveTokenToDB(sessionData);

  ///////////////////////////////////////////////////////////
  return res.status(200).json(token_response);
};
