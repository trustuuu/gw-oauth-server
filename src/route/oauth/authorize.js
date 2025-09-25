import * as R from "ramda";
//const { default: R } = await import("ramda");
import { getClient } from "./auth_service.js";
import randomstring from "randomstring";
import { buildUrl } from "../../helper/utils.js";
import { buildQueryUrl } from "../../helper/secure.js";
import reqIdService from "../../service/reqid-service.js";
import apiService from "../../service/api-service.js";
import { generateCodeUrlBuild } from "./auth_shared.js";

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
  const authId = "authorization";
  const reqQuery = req.query;

  client = await getClient(reqQuery.client_id);
  if (R.includes("authorization_code", client.grant_types)) {
    if (!reqQuery.email && !reqQuery.password && reqQuery.stage != "mfa") {
      redirectToLogin(reqQuery, res);
      return;
    }
  }

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
    res.render("error", { error: "Invalid redirect URI" });
    return;
  } else {
    const rscope = reqQuery.scope ? reqQuery.scope.split(" ") : undefined;

    if (R.difference(rscope, client.scope).length > 0) {
      const urlParsed = buildUrl(reqQuery.redirect_uri, {
        error: "invalid_scope",
      });
      res.redirect(urlParsed);
      return;
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
        [reqQuery].concat([authId, reqid])
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
}

const allowUserConsentSkip = async (res, client) => {
  const apiId = "api";
  const api = await apiService.getApiByIdentifier(apiId, client.audience);
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
