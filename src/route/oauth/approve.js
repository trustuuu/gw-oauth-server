import * as R from "ramda";
//const { default: R } = await import("ramda");
import { getClient } from "./auth_service.js";
import reqIdService from "../../service/reqid-service.js";
import { buildUrl } from "../../helper/utils.js";
import { generateCodeUrlBuild } from "./auth_shared.js";
import { APP_PATH, AUTH_PATH } from "../../service/remote-path-service.js";
import applicationService from "../../service/application-service.js";

async function approve(req, res, routerAuth) {
  const reqid = req.body.reqid;

  //const query = routerAuth.locals.requests[reqid];
  delete routerAuth.locals.requests[reqid];
  const query = await reqIdService.getData(AUTH_PATH, reqid);
  await reqIdService.deleteData.apply(
    reqIdService,
    [{}].concat([AUTH_PATH, reqid])
  );

  if (!query) {
    // there was no matching saved request, this is an error
    res.render("error", { error: "No matching authorization request" });
    return;
  }

  if (req.body.approve) {
    if (query.response_type == "code") {
      // user approved access

      const rscope = req.body.scope ? req.body.scope.split(" ") : []; //getScopesFromForm(req.body);
      //const client = await getClient(query.client_id);
      //const user = await getUserRef(req.body.email);
      // const user = await getUser(
      //   client.companyId,
      //   client.domain,
      //   req.body.email
      // );
      let clientScopes =
        await applicationService.getApplicationPermissionScopes(
          APP_PATH,
          query.client_id
        );
      if (Array.isArray(clientScopes)) {
        clientScopes = clientScopes.map((s) => s.permission);
      }

      if (!Array.isArray(clientScopes)) {
        console.log("invalid_client_scope, %s", query.client_id);
        return res.status(400).json({ error: "invalid_client_scope" });
      }

      if (R.difference(rscope, clientScopes).length > 0) {
        const urlParsed = buildUrl(query.redirect_uri, {
          error: "invalid_scope",
        });
        res.redirect(urlParsed);
        return;
      }

      const urlParsed = await generateCodeUrlBuild(
        { ...query, password: null },
        req.body.email,
        rscope,
        req.body.code_challenge,
        req.body.code_challenge_method
      );
      res.redirect(urlParsed);
      return;
    } else {
      // we got a response type we don't understand
      const urlParsed = buildUrl(query.redirect_uri, {
        error: "unsupported_response_type",
      });
      res.redirect(urlParsed);
      return;
    }
  } else {
    // user denied access
    const urlParsed = buildUrl(query.redirect_uri, {
      error: "access_denied",
    });
    res.redirect(urlParsed);
    return;
  }
}

export default approve;
