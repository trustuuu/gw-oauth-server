import { buildQueryUrl } from "../../helper/secure.js";

async function login(req, res, routerAuth) {
  const authorizationEndpoint =
    process.env.NODE_ENV === "dev"
      ? routerAuth.locals.authorizationEndpointDev
      : routerAuth.locals.authorizationEndpoint;
  const authorizeUrl = await buildQueryUrl(authorizationEndpoint, {
    response_type: "code",
    email: req.body.email,
    password: req.body.password,
    client_id: req.body.client_id,
    redirect_uri: req.body.redirect_uri,
    scope: req.body.scope,
    state: req.body.state,
    code_challenge: req.body.code_challenge,
    code_challenge_method: req.body.code_challenge_method,
  });
  res.redirect(authorizeUrl);
}

export default login;
