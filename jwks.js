import jwks from "jwks-rsa";
import { expressjwt } from "express-jwt";
import jose from "jsrsasign";

export const jwtCheck = expressjwt({
  secret: jwks.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: process.env.JWKS_URL,
  }),
  audience: process.env.UNIDIR_AUDIENCE,
  issuer: process.env.UNIDIR_ISSUER,
  algorithms: ["RS256"],
});

export const jwtCheckService = expressjwt({
  secret: jwks.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: process.env.JWKS_URL,
  }),
  audience: process.env.UNIDIR_SERVICE_AUDIENCE,
  issuer: process.env.UNIDIR_SERVICE_ISSUER,
  algorithms: ["RS256"],
});

export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send("Missing or invalid Authorization header");
  }

  const token = authHeader.split(" ")[1];
  if (!token) throw new Error("there is no token");

  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malform JWT");

  const payloadBase64 = parts[1];
  const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf-8");

  let payload;
  try {
    payload = JSON.parse(payloadJson);
  } catch (e) {
    return res.status(401).send("Invalid token");
  }

  if (!payload || !payload.iss) {
    return res.status(401).send("Missing issuer");
  }

  if (payload.iss === process.env.UNIDIR_ISSUER) {
    jwtCheck(req, res, (err) => {
      if (err) {
        return res.status(401).send("unidir token invalid");
      }
      req.authService = req.auth;
      next();
    });
  } else if (payload.iss === process.env.UNIDIR_SERVICE_ISSUER) {
    jwtCheckService(req, res, (err) => {
      if (err) {
        return res.status(401).send("Service token invalid");
      }
      req.authService = req.auth;
      next();
    });
  } else {
    return res.status(401).send("Unknown issuer");
  }
}

const { KJUR, b64utoutf8 } = jose;

const client = jwks({
  jwksUri: process.env.JWKS_URL,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

/**
 * Decode JWT header without verification (to extract `kid`)
 */
function decodeHeader(token) {
  const [headerB64] = token.split(".");
  return KJUR.jws.JWS.readSafeJSONString(b64utoutf8(headerB64));
}

/**
 * Decode payload without verification (unsafe)
 */
export function decodePayload(token) {
  const [, payloadB64] = token.split(".");
  return KJUR.jws.JWS.readSafeJSONString(b64utoutf8(payloadB64));
}

/**
 * Verify JWT using jsrsasign with key fetched by jwks-rsa
 */
export async function getVerifyJwtWithJwks(token) {
  const header = decodeHeader(token);
  const kid = header.kid;
  if (!kid) throw new Error("Missing kid in token");

  const key = await client.getSigningKey(kid);
  const publicKey = key.getPublicKey(); // PEM format

  const isValid = KJUR.jws.JWS.verify(token, publicKey, ["RS256"]);
  if (!isValid) throw new Error("JWT signature verification failed");

  return decodePayload(token);
}

export function checkTenantAccess(req, res, next) {
  const tokenTenant = req.auth?.tenant_id;
  //const routeTenant = req.params?.id;

  if (!tokenTenant) {
    return res.status(401).json({ error: "Missing tenant_id in token" });
  }

  // if (tokenTenant !== routeTenant) {
  //   return res
  //     .status(403)
  //     .json({ error: `Access denied for tenant '${routeTenant}'` });
  // }

  next();
}
