import * as R from "ramda";
import {
  decodeClientCredentials,
  generateAccessToken,
} from "../helper/utils.js";
import { getClient } from "./auth_service.js";
import apiService from "../service/api-service.js";
import tokenService from "../service/token-service.js";
import codeService from "../service/code-service.js";
import randomstring from "randomstring";

async function token(req, res, routerAuth) {
  const authId = "authorization";
  const apiId = "api";

  const auth = req.headers["authorization"];
  if (auth) {
    // check the auth header
    const clientCredentials = decodeClientCredentials(auth);
    var { id: clientId, secret: clientSecret } = clientCredentials;
  }

  // otherwise, check the post body
  if (req.body.client_id) {
    if (clientId) {
      // if we've already seen the client's credentials in the authorization header, this is an error
      console.log("Client attempted to authenticate with multiple methods");
      res.status(401).json({ error: "invalid_client" });
      return;
    }
    var { client_id: clientId, client_secret: clientSecret } = req.body;
  }

  const client = await getClient(clientId);
  if (!client) {
    console.log("Unknown client %s", clientId);
    res.status(401).json({ error: "invalid_client" });
    return;
  }

  if (client.client_secret != clientSecret) {
    console.log(
      "Mismatched client secret, expected %s got %s",
      client.client_secret,
      clientSecret
    );
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

    const access_token = generateAccessToken(
      "http://oauth.unidir.igoodworks.com/",
      client.client_name,
      api[0].identifier,
      Math.floor(now_utc / 1000),
      expires_in,
      client.scope
    );
    console.log("client_credentials Issuing access token %s", access_token);
    const tokenClient = {
      client_id: clientId,
      companyId: client.companyId,
      domain: client.domain,
    };
    const token_response = {
      access_token: access_token,
      expires_in: expires_in,
      client: tokenClient,
      scope: client.scope,
    };

    res.status(200).json(token_response);
    console.log("client_credentials Issued tokens for code %s", req.body);

    return;
  } else if (req.body.grant_type == "authorization_code") {
    const code = await codeService.getData(authId, req.body.code);

    if (code && code.request) {
      await codeService.deleteData.apply(
        codeService,
        [{}].concat([authId, req.body.code])
      );
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

        const access_token = generateAccessToken(
          "http://oauth.unidir.igoodworks.com/",
          client.client_name,
          api[0].identifier,
          Math.floor(now_utc / 1000),
          expires_in,
          client.scope
        );
        console.log("Issuing access token %s", access_token);
        const tokenClient = {
          client_id: clientId,
          companyId: client.companyId,
          domain: client.domain,
        };
        const token_response = {
          access_token: access_token,
          expires_in: expires_in,
          client: tokenClient,
          scope: code.scope,
          user: code.user,
        };

        res.status(200).json(token_response);
        console.log("Issued tokens for code %s", req.body.code);

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
          [data].concat([authId, req.body.refresh_token])
        );
        //nosql.remove().make(function(builder) { builder.where('refresh_token', req.body.refresh_token); });
        res.status(400).json({ error: "invalid_grant" });
        return;
      }
      const access_token = randomstring.generate();
      token_data = {
        access_token: access_token,
        client_id: clientId,
        whenCreated: new Date(),
        type: "access_token",
      };

      const token_response = {
        access_token: access_token,
        token_type: "Bearer",
        refresh_token: token.refresh_token,
      };
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
