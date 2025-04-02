import * as R from "ramda";
//const { default: R } = await import("ramda");
import { getClient, verifyUser } from "./auth_service.js";
import randomstring from "randomstring";
import { buildUrl } from "../../helper/utils.js";
import { buildQueryUrl, parseQuery, decryptText } from "../../helper/secure.js";
async function authorize(req, res, routerAuth) {
  let client = null;

  const reqParams = parseQuery(req.query);
  const decryptString = await decryptText(
    reqParams,
    process.env.ENCRIPTION_PASSWORD
  );
  const reqQuery = JSON.parse(decryptString);

  if (R.includes("openId", reqQuery.scope.split(" "))) {
    if (!reqQuery.email && !reqQuery.password) {
      const params = {
        client_id: reqQuery.client_id,
        redirect_uri: reqQuery.redirect_uri,
        scope: reqQuery.scope,
        state: reqQuery.state,
      };
      const redirectURL = await buildQueryUrl("../login", params);
      res.redirect(redirectURL);

      return;
    } else {
      client = await getClient(reqQuery.client_id);

      const isVerified = await verifyUser(
        client.companyId,
        client.domain,
        reqQuery.email,
        reqQuery.password
      );

      if (!isVerified) {
        const params = {
          client_id: reqQuery.client_id,
          redirect_uri: reqQuery.redirect_uri,
          scope: reqQuery.scope,
          state: reqQuery.state,
        };
        const redirectURL = await buildQueryUrl("../login", params);
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

    const reqid = randomstring.generate(8);

    //const requests = [{reqid:reqQuery}];
    routerAuth.locals.requests[reqid] = reqQuery;

    const params = {
      client: client,
      reqid: reqid,
      scope: rscope,
      email: reqQuery.email,
    };
    const redirectURL = await buildQueryUrl("../approve", params);
    res.redirect(redirectURL);

    return;
  }
}

export default authorize;
