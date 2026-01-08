import * as R from "ramda";
//const { default: R } = await import("ramda");
import { getClient } from "./auth_service.js";
import randomstring from "randomstring";
import { buildUrl } from "../../helper/utils.js";
import { buildQueryUrl } from "../../helper/secure.js";
import reqIdService from "../../service/reqid-service.js";
import apiService from "../../service/api-service.js";
import { generateCodeUrlBuild } from "./auth_shared.js";
import {
  API_PATH,
  APP_PATH,
  AUTH_PATH,
} from "../../service/remote-path-service.js";
import applicationService from "../../service/application-service.js";

async function redirectToLogin(reqQuery, res) {
  const params = {
    client_id: reqQuery.client_id,
    redirect_uri: reqQuery.redirect_uri,
    scope: reqQuery.scope,
    state: reqQuery.state,
    code_challenge: reqQuery.code_challenge,
    code_challenge_method: reqQuery.code_challenge_method,
  };

  const redirectURL = await buildUrl("../../login", params);
  res.redirect(redirectURL);
}

async function authorize(req, res, routerAuth) {
  let client = null;

  const reqQuery = req.query;
  console.log("reqQuery", reqQuery);
  client = await getClient(reqQuery.client_id);
  if (R.includes("authorization_code", client.grant_types)) {
    if (!reqQuery.email && !reqQuery.password && reqQuery.stage != "mfa") {
      redirectToLogin(reqQuery, res);
      return;
    }
  }
  let rscope = [];
  if (!client) {
    console.log("Unknown client %s", reqQuery.client_id);
    res.render("error", { error: "Unknown client" });
    return;
  } else if (!R.includes(reqQuery.redirect_uri, client.redirect_uris)) {
    console.log(
      "Mismatched redirect URI, expected %s got %s",
      client.redirect_uris,
      reqQuery.redirect_uri
    );
    return res.status(400).json({ error: "Invalid redirect URI" });
    // res.render("error", { error: "Invalid redirect URI" });
    // return;
  } else {
    rscope = reqQuery.scope
      ? reqQuery.scope.toLowerCase().split(" ")
      : undefined;

    let clientScopes = await applicationService.getApplicationPermissionScopes(
      APP_PATH,
      reqQuery.client_id
    );
    if (Array.isArray(clientScopes)) {
      clientScopes = clientScopes.map((s) => s.permission.toLowerCase());
    }
    console.log("rscope, clientScopes", rscope, clientScopes);
    if (!Array.isArray(clientScopes)) {
      console.log("invalid_client_scope, %s", reqQuery.client_id);
      return res.status(400).json({ error: "invalid_client_scope" });
    }

    if (R.difference(rscope, clientScopes).length > 0) {
      const urlParsed = buildUrl(reqQuery.redirect_uri, {
        error: "invalid_scope",
      });
      res.redirect(urlParsed);
      return;
    }
  }

  const userConsent = await allowUserConsentSkip(res, client);

  if (userConsent) {
    const redirectURL = await generateCodeUrlBuild(
      { ...reqQuery, password: null },
      reqQuery.email,
      reqQuery.scope.split(" "),
      reqQuery.code_challenge,
      reqQuery.code_challenge_method
    );
    res.redirect(redirectURL);

    return;
  } else {
    const reqid = randomstring.generate(8);

    //const requests = [{reqid:reqQuery}];
    //routerAuth.locals.requests[reqid] = reqQuery;
    await reqIdService.setData.apply(
      reqIdService,
      [reqQuery].concat([AUTH_PATH, reqid])
    );

    const params = {
      client: client,
      reqid: reqid,
      scope: rscope,
      email: reqQuery.email,
      code_challenge: reqQuery.code_challenge,
      code_challenge_method: reqQuery.code_challenge_method,
    };

    const redirectURL = await buildQueryUrl("../../approve", params);
    res.redirect(redirectURL);

    return;
  }
}

const allowUserConsentSkip = async (res, client) => {
  const api = await apiService.getApiByAudience(API_PATH, client.audience);
  if (api.length < 1) {
    console.log(
      "Authence has not been found, expected %s got %s",
      client.Id,
      client.audience
    );
    res.status(400).json({ error: "invalid_grant" });
    return;
  }
  return api[0].allowSkippingUserConsent
    ? api[0].allowSkippingUserConsent
    : false;
};

export default authorize;
