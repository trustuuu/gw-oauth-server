import { getTokenExchangeAccessToken } from "./utils.js";
import { getVerifyJwtWithJwks } from "../../jwks.js";
import { APP_PATH } from "../service/remote-path-service.js";
import applicationService from "../service/application-service.js";
import { Request, Response } from "express";
import { IApplication } from "../types/Application.js";
import { TokenExchangePolicy } from "../types/TokenExchangePolicy.js";

/**
 * Token Exchange Grant (RFC 8693-style)
 */
export const tokenExchangeGrantDownstream = async (
  req: Request,
  res: Response,
  client: IApplication,
  targetAudience: string
) => {
  try {
    const {
      subject_token,
      actor_token,
      actor_token_type,
      scope: scopeStr,
    } = req.body;

    // 3. Load Token Exchange Policy for this client
    const policies =
      (await applicationService.getApplicationTokenExchanges(
        APP_PATH,
        client.id
      )) || null;

    if (!policies) {
      console.log("No token exchange policy for client:", client.id);
      return res.status(400).json({
        error: "unauthorized_client",
        error_description: "No token exchange policy configured",
      });
    }
    const policy: TokenExchangePolicy = Array.isArray(policies)
      ? policies.length > 0
        ? policies[0]
        : {}
      : typeof policies === "string" && policies.length > 0
      ? policies
      : {};

    // Map properties from policy to local variables.
    // Note: JS code uses camelCase properties which match the Type definition.
    // But if runtime data is snake_case, it might fail.
    // Assuming standard objects from DB/API match the types.

    // Safety check for empty object if casting failed effectively at runtime (TS won't catch runtime mismatch)
    // But we are in "migrating code" mode.

    const {
      allowedSubjectAudiences = [],
      allowedTargetAudiences = [],
      allowedScopes = [],
      maxTokenLifetimeSeconds = 3600,
      allowImpersonation = false,
      allowDelegation = false,
    } = policy;

    // 4. Verify subject_token (assuming internal UniDir token via JWKS)
    let subjectPayload: any;
    try {
      subjectPayload = await getVerifyJwtWithJwks(subject_token);
    } catch (err) {
      console.error("Failed to verify subject_token:", err);
      return res.status(400).json({
        error: "invalid_grant",
        error_description:
          "subject_token invalid or signature verification failed",
      });
    }

    // 5. Check subject_token audience vs policy
    if (
      allowedSubjectAudiences.length > 0 &&
      !allowedSubjectAudiences.includes(subjectPayload.aud)
    ) {
      console.log(
        "subject_token aud not allowed:",
        subjectPayload.aud,
        "allowed:",
        allowedSubjectAudiences
      );
      return res.status(400).json({
        error: "invalid_target",
        error_description: "subject_token audience is not allowed",
      });
    }

    if (
      allowedTargetAudiences.length > 0 &&
      !allowedTargetAudiences.includes(targetAudience)
    ) {
      console.log(
        "target audience not allowed:",
        targetAudience,
        "allowed:",
        allowedTargetAudiences
      );
      return res.status(400).json({
        error: "invalid_target",
        error_description: "Requested target audience is not allowed",
      });
    }

    // 7. Determine scopes
    const subjectScopes = parseScopes(subjectPayload.scope || "");
    const requestedScopes = parseScopes(scopeStr, subjectScopes); // default: same as subject token

    if (!validateScopes(requestedScopes, allowedScopes)) {
      console.log(
        "Requested scopes not allowed:",
        requestedScopes,
        "allowed:",
        allowedScopes
      );
      return res.status(400).json({
        error: "invalid_scope",
        error_description: "Requested scopes are not allowed by policy",
      });
    }

    // 8. Validate subject_token expiry and calculate new lifetime
    const nowSec = Math.floor(Date.now() / 1000);
    const subjectExp = subjectPayload.exp || nowSec;
    const remainingFromSubject = subjectExp - nowSec;

    if (remainingFromSubject <= 0) {
      return res.status(400).json({
        error: "invalid_grant",
        error_description: "subject_token is expired",
      });
    }

    const lifetimeByPolicy =
      (maxTokenLifetimeSeconds === "" ? 3600 : maxTokenLifetimeSeconds) || 3600;
    // Type definition says string | number | "". Handling checks.

    const expiresInSeconds = Math.min(
      remainingFromSubject,
      Number(lifetimeByPolicy)
    );

    // 9. Optional actor_token (for delegation)
    let actorPayload = null;
    if (actor_token) {
      if (
        actor_token_type &&
        actor_token_type !== "urn:ietf:params:oauth:token-type:access_token"
      ) {
        return res.status(400).json({
          error: "invalid_request",
          error_description: "Unsupported actor_token_type",
        });
      }

      try {
        actorPayload = await getVerifyJwtWithJwks(actor_token);
      } catch (err) {
        console.error("Failed to verify actor_token:", err);
        return res.status(400).json({
          error: "invalid_grant",
          error_description:
            "actor_token invalid or signature verification failed",
        });
      }
    }

    // 10. Decide impersonation vs delegation
    let finalSub;
    let actClaim = undefined;

    if (actorPayload) {
      // Delegation case: actor is the caller, subject is the resource owner
      if (!allowDelegation) {
        return res.status(400).json({
          error: "unauthorized_client",
          error_description: "Delegation is not allowed by policy",
        });
      }

      finalSub = actorPayload.sub;
      actClaim = {
        sub: subjectPayload.sub,
        iss: subjectPayload.iss,
        aud: subjectPayload.aud,
      };
    } else {
      // Impersonation case: caller acts *as* subject
      if (!allowImpersonation) {
        return res.status(400).json({
          error: "unauthorized_client",
          error_description: "Impersonation is not allowed by policy",
        });
      }

      finalSub = subjectPayload.sub;

      // If original token already had act claim, you may propagate it
      if (subjectPayload.act) {
        actClaim = subjectPayload.act;
      }
    }

    // 11. Extra claims to propagate (tenant, roles, permissions, etc.)
    const extraClaims = {
      tenant_id: subjectPayload.tenant_id,
      client_id: client.id, // new client
      roles: subjectPayload.roles || [],
      permissions: subjectPayload.permissions || [],
      companyId: subjectPayload.companyId,
      domainId: subjectPayload.domainId,
      subject_token_id: subjectPayload.jti,
    };

    const scopesForToken = requestedScopes.join(" ");

    // 12. Issue new access token using your helper
    const access_token = getTokenExchangeAccessToken({
      iss: process.env.UNIDIR_ISSUER || "",
      sub: finalSub,
      aud: targetAudience,
      scopes: scopesForToken,
      act: actClaim,
      extraClaims,
      expiresInSeconds,
    });

    // 13. Build response (RFC 8693 style)
    const response = {
      access_token,
      issued_token_type: "urn:ietf:params:oauth:token-type:access_token",
      token_type: "Bearer",
      expires_in: expiresInSeconds,
      scope: scopesForToken,
    };

    return res.status(200).json(response);
  } catch (err) {
    console.error("tokenExchangeGrant unexpected error:", err);
    return res.status(500).json({ error: "server_error" });
  }
};

// Helper: parse space-separated scope string → array
function parseScopes(scopeStr: any, fallback: string[] = []) {
  if (!scopeStr) return fallback;
  return (scopeStr as string).split(/\s+/).filter(Boolean);
}

// Helper: check requested scopes ⊆ allowed scopes
function validateScopes(requested: string[], allowed: string[]) {
  if (!allowed || allowed.length === 0) return false;
  const allowedSet = new Set(allowed);
  return requested.every((s) => allowedSet.has(s));
}
