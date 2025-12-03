import { signAccessToken } from "./jwtService.js";
import { getTokenExchangePolicyForClient } from "./policyService.js";
import { resolveAllowedAudienceAndScopes } from "../config/audienceConfig.js";
import { getVerifyJwtWithJwks } from "../../../jwks.js";
import { getTokenExchangeAccessToken } from "../../helper/utils.js";

export async function TokenExchange({
  clientId,
  subjectToken,
  subjectTokenType,
  requestedTokenType,
  audience,
  scope,
  actorToken,
  actorTokenType,
}) {
  if (!subjectToken || !subjectTokenType) {
    const err = new Error("subject_token and subject_token_type are required");
    err.oauthError = "invalid_request";
    throw err;
  }

  if (
    subjectTokenType !== "urn:ietf:params:oauth:token-type:access_token" &&
    subjectTokenType !== "urn:ietf:params:oauth:token-type:jwt"
  ) {
    const err = new Error("Unsupported subject_token_type");
    err.oauthError = "invalid_request";
    throw err;
  }

  // Default requested_token_type → access_token
  const requestedType =
    requestedTokenType || "urn:ietf:params:oauth:token-type:access_token";

  if (requestedType !== "urn:ietf:params:oauth:token-type:access_token") {
    const err = new Error("Only access_token issuance is supported");
    err.oauthError = "invalid_request";
    throw err;
  }

  // 1) Load policy for this client
  const policy = await getTokenExchangePolicyForClient(clientId);
  if (!policy) {
    const err = new Error("Token exchange not enabled for this client");
    err.oauthError = "unauthorized_client";
    throw err;
  }

  // 2) Validate subject_token
  const decodedSubject = await getVerifyJwtWithJwks(subjectToken);

  const subjectAud = Array.isArray(decodedSubject.aud)
    ? decodedSubject.aud
    : [decodedSubject.aud];

  const subjectAllowed = subjectAud.some((a) =>
    policy.allowed_subject_audiences.includes(a)
  );

  if (!subjectAllowed) {
    const err = new Error("Subject token audience not allowed for exchange");
    err.oauthError = "invalid_target";
    throw err;
  }

  // 3) Validate / resolve requested audience & scopes
  const requestedScopes = scope ? scope.split(" ") : [];

  const { targetAudience, finalScopes, expiresInSeconds } =
    resolveAllowedAudienceAndScopes({
      policy,
      requestedAudience: audience,
      requestedScopes,
    });

  // 4) Optional actor_token (impersonation / delegation)
  let actClaim = undefined;

  if (actorToken) {
    if (
      actorTokenType &&
      actorTokenType !== "urn:ietf:params:oauth:token-type:access_token" &&
      actorTokenType !== "urn:ietf:params:oauth:token-type:jwt"
    ) {
      const err = new Error("Unsupported actor_token_type");
      err.oauthError = "invalid_request";
      throw err;
    }

    if (!policy.allow_impersonation && !policy.allow_delegation) {
      const err = new Error(
        "Actor token not allowed by policy for this client"
      );
      err.oauthError = "unauthorized_client";
      throw err;
    }

    const decodedActor = await getVerifyJwtWithJwks(actorToken);

    actClaim = {
      sub: decodedActor.sub,
      client_id: clientId,
    };

    // You can add type, roles, etc. here if you want
    // actClaim.role = decodedActor.role;
  }

  // 5) Build and sign new token
  const accessToken = getTokenExchangeAccessToken({
    iss,
    sub: decodedSubject.sub,
    aud: targetAudience,
    scopes: finalScopes,
    act: actClaim,
    extraClaims: {
      // trace the original token id, etc.
      token_exchange: true,
      original_token_aud: subjectAud,
      client_id: clientId,
    },
    expiresInSeconds,
  });

  return {
    access_token: accessToken,
    issued_token_type: "urn:ietf:params:oauth:token-type:access_token",
    token_type: "Bearer",
    expires_in: expiresInSeconds,
    scope: finalScopes.join(" "),
  };
}

// POST /oauth2/token
// Content-Type: application/x-www-form-urlencoded
// Authorization: Basic ZGVtby1jbGllbnQ6c2VjcmV0

// grant_type=urn:ietf:params:oauth:grant-type:token-exchange&
// subject_token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...&
// subject_token_type=urn:ietf:params:oauth:token-type:access_token&
// requested_token_type=urn:ietf:params:oauth:token-type:access_token&
// audience=api://service-b&
// scope=read:items
