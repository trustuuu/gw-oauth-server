import { getVerifyJwtWithJwks } from "../../../jwks.js";

export async function instrospect(req, res, routerAuth) {
  const { token } = req.body;

  if (!req.cookies.user) {
    return res.status(404).json({ error: "Session not found" });
  }

  const { companyId, domainId } = JSON.parse(req.cookies.user);
  const payload = await getVerifyJwtWithJwks(token);

  if (companyId !== payload.tenant_id || domainId !== payload.domainId) {
    console.log(
      `session_information_mismatch ${companyId}:${payload.tenant_id}=>${domainId}:${payload.domainId}`
    );
    return res.status(401).json({ error: "session_information_mismatch" });
  }

  const now = Math.floor(Date.now() / 1000);
  const isActive = payload.exp > now;

  const metadata = {
    active: isActive,
    iss: payload.iss,
    sub: payload.sub,
    aud: payload.aud,
    exp: payload.exp,
    iat: payload.iat,
    scope: (payload.permissions || []).join(" "),
    client_id: payload.client_id || payload.act?.sub || null,
    tenant_id: payload.tenant_id,
    domain_id: payload.domainId,
  };

  return res.status(200).json(metadata);
}
