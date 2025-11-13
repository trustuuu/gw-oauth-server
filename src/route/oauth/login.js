//import { buildQueryUrl } from "../../helper/secure.js";
import { buildUrl } from "../../helper/utils.js";
import * as R from "ramda";
import { verifyUser, getUserRef, getUser } from "./auth_service.js";
import randomstring from "randomstring";
import reqidService from "../../service/reqid-service.js";
import { AUTH_PATH } from "../../service/remote-path-service.js";

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

async function login(req, res, routerAuth) {
  let authorizequery = {
    response_type: "code",
    email: req.body.email,
    password: req.body.password,
    client_id: req.body.client_id,
    redirect_uri: req.body.redirect_uri,
    scope: req.body.scope,
    state: req.body.state,
    code_challenge: req.body.code_challenge,
    code_challenge_method: req.body.code_challenge_method,
  };
  const reqQuery = req.query.scope ? req.query : authorizequery;
  let userVerified = { user: null, verified: false };

  if (R.includes("openId", reqQuery.scope.split(" "))) {
    if (!reqQuery.email || !reqQuery.password) {
      redirectToLogin(reqQuery, res);
      return;
    }

    let user = await getUserRef(reqQuery.email);
    if (!user) {
      user = await getUser();
    }

    if (user) {
      userVerified = await verifyUser(
        user.companyId,
        user.domainId,
        reqQuery.email,
        reqQuery.password
      );
      console.log("userVerified", userVerified);
      if (!userVerified.verified) {
        redirectToLogin(reqQuery, res);
        return;
      } else {
        const txId = randomstring.generate(16);
        const tx = {
          txId,
          client_id: req.body.client_id,
          redirect_uri: req.body.redirect_uri,
          scope: req.body.scope,
          state: req.body.state,
          code_challenge: req.body.code_challenge,
          code_challenge_method: req.body.code_challenge_method,
          stage: "login", // login → mfa? → consent → ready
          userId: user.id,
          email: req.body.email,
          amr: ["pwd"], // will fill like ["pwd","otp"]
          acr: null,
          acr_values: "", //"urn:mfa.required"
        };
        //tx.userId = user.id;
        //tx.amr.push("pwd");

        const mfaRequired =
          //tx.acr_values?.includes("mfa") || // requested by client
          user.mfa; // or by policy

        if (mfaRequired) {
          tx.stage = "mfa";
          tx.acr_values = "urn:mfa.required";
          await reqidService.setData.apply(
            reqidService,
            [tx].concat([AUTH_PATH, txId])
          );
          return res.redirect(`/oauth/v1/mfa?tx=${tx.txId}`);
        } else {
          await reqidService.setData.apply(
            reqidService,
            [tx].concat([AUTH_PATH, txId])
          );
          authorizequery = { ...authorizequery, txId };
        }
      }
    } else {
      redirectToLogin(reqQuery, res);
      return;
    }
  }

  const authorizationEndpoint =
    process.env.NODE_ENV === "dev"
      ? routerAuth.locals.authorizationEndpointDev
      : routerAuth.locals.authorizationEndpoint;

  const authorizeUrl = await buildUrl(authorizationEndpoint, authorizequery);
  res.redirect(authorizeUrl);
}

export default login;
