import { buildUrl } from "../../helper/utils.js";

async function login(req, res, routerAuth) {
  var authorizeUrl = buildUrl(routerAuth.locals.authorizationEndpoint, {
    response_type: "code",
    email: req.body.email,
    password: req.body.password,
    client_id: req.body.client_id,
    redirect_uri: req.body.redirect_uri,
    scope: req.body.scope,
    state: req.body.state,
  });

  res.redirect(authorizeUrl);
}

export default login;
