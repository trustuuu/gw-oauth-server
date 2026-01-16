import * as R from "ramda";
import { getClient, verifyUser, getUserRef } from "./auth_service.js";
import randomstring from "randomstring";
import { buildUrl } from "../../helper/utils.js";
import { buildQueryUrl } from "../../helper/secure.js";
import reqIdService from "../../service/reqid-service.js";
import apiService from "../../service/api-service.js";
import { generateCodeUrlBuild } from "./auth_shared.js";
import { API_PATH, AUTH_PATH } from "../../service/remote-path-service.js";
import { Request, Response } from "express";

async function authorize(req: Request, res: Response, routerAuth: any) {
  let client: any = null;

  const reqQuery: any = req.query;
  let userVerified: any = { verified: false };

  // const reqParams = parseQuery(req.query);
  // const decryptString = await decryptText(
  //   reqParams,
  //   process.env.ENCRIPTION_PASSWORD
  // );
  // if (!decryptString) {
  //   res.status(401).json({ error: "Authentication failed!" });
  //   return;
  // }
  // const reqQuery = JSON.parse(decryptString);

  if (R.includes("openId", (reqQuery.scope || "").split(" "))) {
    if (!reqQuery.email && !reqQuery.password) {
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

      return;
    } else {
      client = await getClient(reqQuery.client_id);

      const user: any = await getUserRef(reqQuery.email);

      if (user) {
        userVerified = await verifyUser(
          user.companyId,
          user.domainId,
          reqQuery.email,
          reqQuery.password
        );
      }

      if (!userVerified.verified) {
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

        return;
      }
    }
  } else {
    client = await getClient(reqQuery.client_id);
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
      // await reqIdService.setData.apply(
      //   reqIdService,
      //   [reqQuery].concat([AUTH_PATH, reqid])
      // );
      await reqIdService.setData(reqQuery, AUTH_PATH, reqid);

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

const allowUserConsentSkip = async (res: Response, client: any) => {
  const api: any = await apiService.getApiByIdentifier(
    API_PATH,
    client.audience
  );
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
