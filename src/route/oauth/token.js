import * as R from "ramda";
//const { default: R } = await import("ramda");
import {
  decodeClientCredentials,
  generateCodeAccessToken,
  generateServiceAccessToken,
  generateIdToken,
  verifyCodeChallenge,
  generateRefreshAccessToken,
  //getJwtExpire,
} from "../../helper/utils.js";
import { getClient } from "./auth_service.js";
import apiService from "../../service/api-service.js";
import tokenService from "../../service/token-service.js";
import codeService from "../../service/code-service.js";
import reqidService from "../../service/reqid-service.js";
import { handleTokenExchange } from "../../helper/handleTokenExchange.js";

async function token(req, res, routerAuth) {
  const authId = "authorization";
  const apiId = "api";

  if (
    req.body.grant_type === "urn:ietf:params:oauth:grant-type:token-exchange"
  ) {
    return handleTokenExchange(req, res);
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
    const api = await apiService.getApiByIdentifier(apiId, client.audience);
    if (api.length < 1) {
      console.log(
        "Authence has not been found, expected %s got %s",
        clientId,
        client.audience
      );
      res.status(400).json({ error: "invalid_grant" });
      return;
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
    const access_token = await generateServiceAccessToken(
      api[0].issuer,
      client.client_name,
      api[0].audience,
      Math.floor(now_utc / 1000),
      expires_in,
      client,
      api[0]
    );

    // const deviceId = req.headers["x-device-id"];
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
      scope: client.scope,
    };
    res.status(200).json(token_response);
    return;
  } else if (req.body.grant_type == "authorization_code") {
    const code = await codeService.getData(authId, req.body.code);
    if (code && code.request) {
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
        res.status(400).json({ error: "invalid_grant" });
        return;
      }
      if (code.request.client_id == clientId) {
        const date = new Date();
        const now_utc = Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate(),
          date.getUTCHours(),
          date.getUTCMinutes(),
          date.getUTCSeconds()
        );
        const expires_in =
          Math.floor(now_utc / 1000) + api[0].tokenExpiration * 60;

        if (
          !verifyCodeChallenge(
            req.body.code_verifier,
            code.request.code_challenge
          )
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
          //client.scope,
          //appRoles ? appRoles.map((r) => r.role) : [],
          api[0],
          code.user
        );

        const deviceId = req.headers["x-device-id"];
        const refresh_expires_in =
          Math.floor(now_utc / 1000) + api[0].tokenExpiration * 600;
        const refresh_token = await generateRefreshAccessToken(
          null,
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
          //scope: code.scope,
          //user: code.user,
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
        res.status(200).json(token_response);

        return;
      } else {
        console.log(
          "Client mismatch, expected %s got %s",
          code.request.client_id,
          clientId
        );
        res.status(400).json({ error: "invalid_grant" });
        return;
      }
    } else {
      console.log("Unknown code, %s", req.body.code);
      res.status(400).json({ error: "invalid_grant" });
      return;
    }
  } else if (req.body.grant_type == "refresh_token") {
    const token = await tokenService.getData(req.body.refresh_token);
    if (token) {
      console.log(
        "We found a matching refresh token: %s",
        req.body.refresh_token
      );
      if (token.client_id != clientId) {
        tokenService.deleteData.apply(
          tokenService,
          [{}].concat([authId, req.body.refresh_token])
        );

        return res.status(400).json({ error: "invalid_grant" });
      }

      const deviceId = req.headers["x-device-id"];
      const expectedDevice = token.device_id;
      if (deviceId !== expectedDevice) {
        return res.status(401).json({ error: "device_mismatch" });
      }

      ///////////////////////////////////////////////////////////
      const api = await apiService.getApiByIdentifier(apiId, client.audience);
      if (api.length < 1) {
        console.log(
          "Authence has not been found, expected %s got %s",
          clientId,
          client.audience
        );
        res.status(400).json({ error: "invalid_grant" });
        return;
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
      const expires_in =
        Math.floor(now_utc / 1000) + api[0].tokenExpiration * 60;

      const access_token = await generateCodeAccessToken(
        api[0].issuer, //process.env.OAUTH_ISSUER,
        token.user.id, //client.client_name,
        api[0].audience,
        Math.floor(now_utc / 1000),
        expires_in,
        client,
        api[0],
        token.user
      );

      const refresh_expires_in =
        Math.floor(now_utc / 1000) + api[0].tokenExpiration * 600;
      const refresh_token = generateRefreshAccessToken(
        null,
        api[0].audience,
        refresh_expires_in,
        client,
        deviceId
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
        scope: token.scope,
        user: token.user,
      };

      if (token.scope.includes("openId")) {
        const id_token = generateIdToken(
          api[0].issuer, //process.env.OAUTH_ISSUER,
          Math.floor(now_utc / 1000),
          token.user,
          clientId,
          token.scope
        );
        token_response = { ...token_response, id_token };
      }

      ///////////////////////////////////////////////////////////

      res.status(200).json(token_response);
      return;
    } else {
      console.log("No matching token was found.");
      res.status(400).json({ error: "invalid_grant" });
      return;
    }
  } else {
    console.log("Unknown grant type %s", req.body.grant_type);
    res.status(400).json({ error: "unsupported_grant_type" });
  }
}

export default token;
