import * as R from "ramda";
//const { default: R } = await import("ramda");
import { getClient, verifyUser } from "./auth_service.js";
import randomstring from "randomstring";
import { buildUrl } from "../../helper/utils.js";
import { buildQueryUrl } from "../../helper/secure.js";
async function authorize(req, res, routerAuth) {
  let client = null;
  if (R.includes("openId", req.query.scope.split(" "))) {
    if (!req.query.email && !req.query.password) {
      //const urlParsed = buildUrl("../login", req.query);
      const params = {
        client_id: req.query.client_id,
        redirect_uri: req.query.redirect_uri,
        scope: req.query.scope,
        state: req.query.state,
      };
      const redirectURL = await buildQueryUrl("../login", params);
      res.redirect(redirectURL);

      return;
    } else {
      client = await getClient(req.query.client_id);

      const isVerified = await verifyUser(
        client.companyId,
        client.domain,
        req.query.email,
        req.query.password
      );

      if (!isVerified) {
        const params = {
          client_id: req.query.client_id,
          redirect_uri: req.query.redirect_uri,
          scope: req.query.scope,
          state: req.query.state,
        };
        const redirectURL = await buildQueryUrl("../login", params);
        res.redirect(redirectURL);

        return;
      }
    }
  } else {
    client = await getClient(req.query.client_id);
  }

  if (!client) {
    console.log("Unknown client %s", req.query.client_id);
    res.render("error", { error: "Unknown client" });
    return;
  } else if (!R.includes(req.query.redirect_uri, client.redirect_uris)) {
    console.log(
      "Mismatched redirect URI, expected %s got %s",
      client.redirect_uris,
      req.query.redirect_uri
    );
    res.render("error", { error: "Invalid redirect URI" });
    return;
  } else {
    const rscope = req.query.scope ? req.query.scope.split(" ") : undefined;

    if (R.difference(rscope, client.scope).length > 0) {
      const urlParsed = buildUrl(req.query.redirect_uri, {
        error: "invalid_scope",
      });
      res.redirect(urlParsed);
      return;
    }

    const reqid = randomstring.generate(8);

    //const requests = [{reqid:req.query}];
    routerAuth.locals.requests[reqid] = req.query;

    const params = {
      client: client,
      reqid: reqid,
      scope: rscope,
      email: req.query.email,
    };
    const redirectURL = await buildQueryUrl("../approve", params);
    res.redirect(redirectURL);

    return;
  }
}

export default authorize;
