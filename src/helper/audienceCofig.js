// Optionally store static defaults for some audiences
const staticAudienceConfig = {
  "api://service-b": {
    maxLifetimeSeconds: 1800,
  },
  "api://service-c": {
    maxLifetimeSeconds: 900,
  },
};

export function resolveAllowedAudienceAndScopes({
  policy,
  requestedAudience,
  requestedScopes,
}) {
  if (!requestedAudience) {
    if (!policy.allowed_target_audiences.length) {
      const err = new Error(
        "No audience requested and no default audience in policy"
      );
      err.oauthError = "invalid_target";
      throw err;
    }
  }

  let targetAudience = requestedAudience;

  if (requestedAudience) {
    const allowedAudience =
      policy.allowed_target_audiences.includes(requestedAudience);
    if (!allowedAudience) {
      const err = new Error(
        "Requested audience is not allowed for this client"
      );
      err.oauthError = "invalid_target";
      throw err;
    }
  } else {
    targetAudience = policy.allowed_target_audiences[0];
  }

  // Scopes: intersection(requested, allowed) or policy.allowed_scopes if none requested
  let finalScopes = policy.allowed_scopes;
  if (requestedScopes?.length) {
    finalScopes = requestedScopes.filter((s) =>
      policy.allowed_scopes.includes(s)
    );
    if (!finalScopes.length) {
      const err = new Error("Requested scopes not allowed");
      err.oauthError = "invalid_scope";
      throw err;
    }
  }

  const staticCfg = staticAudienceConfig[targetAudience] || {};
  const expiresInSeconds =
    staticCfg.maxLifetimeSeconds || policy.max_token_lifetime_seconds || 3600;

  return { targetAudience, finalScopes, expiresInSeconds };
}
