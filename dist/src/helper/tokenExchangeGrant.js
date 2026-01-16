import { decodeClientCredentials } from "./utils.js";
import { getClient } from "../route/oauth/auth_service.js";
import { tokenExchangeGrantDownstream } from "./tokenExchangeGrantDownstream.js";
import { tokenExchangeGrantGoogle } from "./tokenExchangeGrantGoogle.js";
const TOKEN_EXCHANGE_GRANT_TYPE = "urn:ietf:params:oauth:grant-type:token-exchange";
/**
 * Token Exchange Grant (RFC 8693-style)
 */
export const tokenExchangeGrant = async (req, res) => {
    try {
        const { grant_type, subject_token, subject_token_type, requested_token_type, } = req.body;
        // 1. Basic validations
        if (grant_type !== TOKEN_EXCHANGE_GRANT_TYPE &&
            grant_type !== "token_exchange" // allow your shorter alias if you want
        ) {
            console.log("Unsupported grant_type for token_exchange:", grant_type);
            return res.status(400).json({ error: "unsupported_grant_type" });
        }
        if (!subject_token) {
            return res.status(400).json({
                error: "invalid_request",
                error_description: "subject_token is required",
            });
        }
        if (subject_token_type &&
            subject_token_type !== "urn:ietf:params:oauth:token-type:access_token") {
            return res.status(400).json({
                error: "invalid_request",
                error_description: "Unsupported subject_token_type",
            });
        }
        if (requested_token_type) {
            // We only issue access tokens; reject other requested_token_type
            if (requested_token_type !==
                "urn:ietf:params:oauth:token-type:access_token" &&
                requested_token_type !== "access_token") {
                return res.status(400).json({
                    error: "invalid_request",
                    error_description: "Unsupported requested_token_type",
                });
            }
        }
        // 2. Authenticate client (Basic / Bearer client token)
        const auth = req.headers["authorization"];
        let clientId = "";
        if (auth) {
            const clientCredentials = decodeClientCredentials(auth);
            clientId = clientCredentials?.id;
        }
        if (!clientId) {
            console.log("Unknown client for token_exchange");
            return res.status(400).json({ error: "invalid_client" });
        }
        const client = await getClient(clientId);
        if (!client) {
            console.log("Client not found for token_exchange:", clientId);
            return res.status(400).json({ error: "invalid_client" });
        }
        // 6. Resolve target audience and validate against policy
        const targetAudience = resolveTargetAudience(req.body, client);
        if (!targetAudience) {
            return res.status(400).json({
                error: "invalid_request",
                error_description: "audience/resource is required",
            });
        }
        if (targetAudience.toLowerCase() == "google-native-token") {
            return await tokenExchangeGrantGoogle(req, res, client, targetAudience);
        }
        else {
            return await tokenExchangeGrantDownstream(req, res, client, targetAudience);
        }
    }
    catch (err) {
        console.error("tokenExchangeGrant unexpected error:", err);
        return res.status(500).json({ error: "server_error" });
    }
};
// Helper: pick audience (resource or audience or client default)
function resolveTargetAudience(reqBody, client) {
    // RFC 8693 allows either "audience" or "resource"
    const { audience, resource } = reqBody;
    if (Array.isArray(resource) && resource.length > 0) {
        return resource[0];
    }
    if (typeof resource === "string" && resource.length > 0) {
        return resource;
    }
    if (Array.isArray(audience) && audience.length > 0) {
        return audience[0];
    }
    if (typeof audience === "string" && audience.length > 0) {
        return audience;
    }
    // Fallback: client’s configured audience
    return client?.audience;
}
