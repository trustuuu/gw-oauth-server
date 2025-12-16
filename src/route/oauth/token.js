import * as R from "ramda";
//const { default: R } = await import("ramda");
import {
  decodeClientCredentials,
  generateServiceAccessToken,
  getUTCNow,
  //getJwtExpire,
} from "../../helper/utils.js";
import { getClient } from "./auth_service.js";
import apiService from "../../service/api-service.js";
//import { handleTokenExchange } from "../../helper/handleTokenExchangeGrant.js";
import { refreshTokenGrant } from "../../helper/refreshTokenGrant.js";
import { tokenGrant } from "../../helper/tokenGrant.js";
import { API_PATH, APP_PATH } from "../../service/remote-path-service.js";
import { deviceCodeGrant } from "../../helper/deviceCodeGrant.js";
import applicationService from "../../service/application-service.js";
import { tokenExchangeGrant } from "../../helper/tokenExchangeGrant.js";

async function token(req, res, routerAuth) {
  if (
    req.body.grant_type === "urn:ietf:params:oauth:grant-type:token-exchange"
  ) {
    //return handleTokenExchange(req, res);
    return tokenExchangeGrant(req, res);
  }

  const auth = req.headers["authorization"];
  let clientId = "";
  let clientSecret = "";
  if (auth) {
    // check the auth header
    const clientCredentials = decodeClientCredentials(auth);
    clientId = clientCredentials.id;
    clientSecret = clientCredentials.secret;
  }
  // otherwise, check the post body
  if (req.body.client_id) {
    if (clientId) {
      // if we've already seen the client's credentials in the authorization header, this is an error
      console.log(
        "Client attempted to authenticate with multiple methods",
        routerAuth
      );
      res.status(401).json({ error: "invalid_client" });
      return;
    }
    clientId = req.body.client_id;
    clientSecret = req.body.client_secret;
    //var { client_id: clientId, client_secret: clientSecret } = req.body;
  }

  const client = await getClient(clientId);

  if (!client) {
    console.log("Unknown client %s", clientId);
    res.status(401).json({ error: "invalid_client" });
    return;
  }

  let clientScopes = await applicationService.getApplicationPermissionScopes(
    APP_PATH,
    clientId
  );
  if (Array.isArray(clientScopes)) {
    clientScopes = clientScopes.map((s) => s.permission);
  } else {
    clientScopes = [];
  }

  if (!R.includes(req.body.grant_type, client.grant_types)) {
    console.log(
      "Mismatched grant_type %s does not exist in %s",
      req.body.grant_type,
      client.grant_types.join(",")
    );
    res.status(401).json({ error: "invalid_client_grant_type" });
    return;
  }
  if (req.body.grant_type == "client_credentials") {
    if (client.client_secret != clientSecret) {
      console.log(
        "Mismatched client secret, expected %s got %s",
        client.client_secret,
        clientSecret
      );
      res.status(401).json({ error: "invalid_client" });
      return;
    }
    const api = await apiService.getApiByAudience(API_PATH, client.audience);
    if (api.length < 1) {
      console.log(
        "Authence has not been found, expected %s got %s",
        clientId,
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

    // const refresh_expires_in =
    //   Math.floor(now_utc / 1000) + api[0].tokenExpiration * 600;
    // const refresh_token = generateRefreshAccessToken(
    //   null,
    //   api[0].audience,
    //   refresh_expires_in,
    //   client,
    //   deviceId
    // );

    // const id_token = generateIdToken(
    //   process.env.OAUTH_ISSUER,
    //   code.user,
    //   clientId
    // );

    const tokenClient = {
      client_id: clientId,
      companyId: client.companyId,
      domain: client.domain,
    };
    const token_response = {
      access_token,
      //refresh_token,
      expires_in,
      token_type: "Bearer",
      client: tokenClient,
      scope: clientScopes,
    };
    res.status(200).json(token_response);
    return;
  } else if (req.body.grant_type == "authorization_code") {
    const token_response = await tokenGrant(req, res);
    return token_response;
  } else if (req.body.grant_type == "refresh_token") {
    const token_response = await refreshTokenGrant(req, res);
    return token_response;
  } else if (
    req.body.grant_type == "urn:ietf:params:oauth:grant-type:device_code"
  ) {
    const token_response = await deviceCodeGrant(req, res);
    return token_response;
  } else {
    console.log("Unknown grant type %s", req.body.grant_type);
    res.status(400).json({ error: "unsupported_grant_type" });
  }
}

export default token;
