import { TokenExchangePolicy } from "../types/TokenExchangePolicy.js";

// Optionally store static defaults for some audiences
const staticAudienceConfig: Record<string, { maxLifetimeSeconds?: number }> = {
  "api://service-b": {
    maxLifetimeSeconds: 1800,
  },
  "api://service-c": {
    maxLifetimeSeconds: 900,
  },
};

interface ResolveAudienceParams {
  policy: TokenExchangePolicy;
  requestedAudience?: string;
  requestedScopes?: string[];
}

interface ResolveAudienceResult {
  targetAudience: string;
  finalScopes: string[];
  expiresInSeconds: number;
}

export function resolveAllowedAudienceAndScopes({
  policy,
  requestedAudience,
  requestedScopes,
}: ResolveAudienceParams): ResolveAudienceResult {
  if (!requestedAudience) {
    if (!policy.allowedTargetAudiences.length) {
      // Note: TokenExchangePolicy.d.ts defines 'allowedTargetAudiences' (camelCase),
      // but JS used 'allowed_target_audiences'. I should check the type definition again.
      // The user provided TokenExchangePolicy.d.ts has: allowedTargetAudiences: string[];
      // Is the JS code using snake_case?
      // JS: policy.allowed_target_audiences
      // TS Type: allowedTargetAudiences
      // Check if I should adapt to Type or JS. Usually Type is what we want, but if the runtime object comes from DB/API in snake_case, I might need to fix the type or the code.
      // Given I'm migrating code, I should probably stick to what the code DOES if I trust the code, or update the code to match the type if I trust the type.
      // The user provided the types explicitly. I should probably update the code to use camelCase IF the data being passed matches the type.
      // If the data comes from DB (e.g. firebase), it might be snake_case.
      // For now, I'll cast to any to support both or check provided type.
      // `TokenExchangePolicy.d.ts` uses camelCase.
      // I will update the code to use camelCase, assuming the input `policy` adheres to `TokenExchangePolicy` interface.
      // If the runtime data is snake_case, this will break.
      // Let's assume the type definition provided by user IS the target truth.
      // Wait, `policy` in JS had `allowed_target_audiences`.
      // I'll stick to type definition: `allowedTargetAudiences`.
      // But if the data source returns snake_case, I might need a mapper.
      // For this migration, I will assume the type is correct source of truth for the NEW code.
      const err: any = new Error(
        "No audience requested and no default audience in policy"
      );
      err.oauthError = "invalid_target";
      throw err;
    }
  }

  let targetAudience = requestedAudience || "";

  if (requestedAudience) {
    const allowedAudience =
      policy.allowedTargetAudiences.includes(requestedAudience);
    if (!allowedAudience) {
      const err: any = new Error(
        "Requested audience is not allowed for this client"
      );
      err.oauthError = "invalid_target";
      throw err;
    }
  } else {
    targetAudience = policy.allowedTargetAudiences[0];
  }

  // Scopes: intersection(requested, allowed) or policy.allowed_scopes if none requested
  let finalScopes = policy.allowedScopes;
  if (requestedScopes?.length) {
    finalScopes = requestedScopes.filter((s) =>
      policy.allowedScopes.includes(s)
    );
    if (!finalScopes.length) {
      const err: any = new Error("Requested scopes not allowed");
      err.oauthError = "invalid_scope";
      throw err;
    }
  }

  const staticCfg = staticAudienceConfig[targetAudience] || {};
  // JS used policy.max_token_lifetime_seconds
  // TS Type: maxTokenLifetimeSeconds
  const expiresInSeconds =
    staticCfg.maxLifetimeSeconds ||
    (policy.maxTokenLifetimeSeconds as number) ||
    3600;

  return { targetAudience, finalScopes, expiresInSeconds };
}
