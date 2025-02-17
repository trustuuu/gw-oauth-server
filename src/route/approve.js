import * as R from "ramda";
import { getClient, getUser } from "./auth_service.js";
import codeService from "../service/code-service.js";

import { buildUrl, getScopesFromForm } from "../helper/utils.js";
import randomstring from "randomstring";

async function approve(req, res, routerAuth) {
  const authId = "authorization";
  const reqid = req.body.reqid;
  const query = routerAuth.locals.requests[reqid];
  delete routerAuth.locals.requests[reqid];

  if (!query) {
    // there was no matching saved request, this is an error
    res.render("error", { error: "No matching authorization request" });
    return;
  }

  if (req.body.approve) {
    if (query.response_type == "code") {
      // user approved access

      const rscope = getScopesFromForm(req.body);
      const client = await getClient(query.client_id);
      const user = await getUser(
        client.companyId,
        client.domain,
        req.body.email
      );

      if (R.difference(rscope, client.scope).length > 0) {
        const urlParsed = buildUrl(query.redirect_uri, {
          error: "invalid_scope",
        });
        res.redirect(urlParsed);
        return;
      }

      const code = randomstring.generate(8);

      const data = {
        request: query,
        user: user,
        scope: rscope,
        whenCreated: new Date(),
        status: "issued",
      };
      await codeService.setData.apply(
        codeService,
        [data].concat([authId, code])
      );

      const urlParsed = buildUrl(query.redirect_uri, {
        code: code,
        state: query.state,
      });

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
