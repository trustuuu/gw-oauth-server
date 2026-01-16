import jose from 'jsrsasign';
import https from 'https';
const { KJUR, KEYUTIL, b64utoutf8 } = jose;
import rsaKey from '../route/rsaKey.json' with { type: "json" };
import rsaKeyService from '../route/rsaKeyService.json' with { type: "json" };
// 🔐 Load keys
// Note: KEYUTIL.getKey with json object might need casting or check
// In JS works, types might need 'any' for the json import if not fully typed.
const rsaKeyObj = KEYUTIL.getKey(rsaKey);
const PRIVATE_KEY_PEM = KEYUTIL.getPEM(rsaKeyObj, 'PKCS8PRV');
const rsaKeyServiceObj = KEYUTIL.getKey(rsaKeyService);
const PRIVATE_KEY_PEM_SERVICE = KEYUTIL.getPEM(rsaKeyServiceObj, 'PKCS8PRV');
function fetchJwks(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const jwks = JSON.parse(data);
                    const keys = jwks.keys.reduce((acc, jwk) => {
                        acc[jwk.kid] = KEYUTIL.getPEM(jwk);
                        return acc;
                    }, {});
                    resolve(keys);
                }
                catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}
function verifyJwt(token, publicKeys) {
    const [headerB64, payloadB64] = token.split('.');
    const header = KJUR.jws.JWS.readSafeJSONString(b64utoutf8(headerB64));
    const kid = header.kid;
    const publicKeyPem = publicKeys[kid];
    if (!publicKeyPem)
        throw new Error('Unknown key ID');
    const isValid = KJUR.jws.JWS.verify(token, publicKeyPem, ['RS256']);
    if (!isValid)
        throw new Error('JWT verification failed');
    return KJUR.jws.JWS.readSafeJSONString(b64utoutf8(payloadB64));
}
function signJwt(payload, privateKey) {
    // privateKey is PEM string? Or object? 
    // In `signJwt` call below: passing PRIVATE_KEY_PEM_SERVICE which is string (PEM).
    // KJUR.jws.JWS.sign accepts KeyObject, or PEM string (if passphrase needed).
    // Let's check signature.
    // getKey returns KeyObject. getPEM returns string.
    // sign(alg, header, payload, key, pass)
    const header = { alg: 'RS256', typ: 'JWT', kid: privateKey.kid }; // privateKey passed here is NOT the PEM, but it accesses .kid? 
    // Wait. Code says: `signJwt(newPayload, PRIVATE_KEY_PEM_SERVICE)`.
    // `PRIVATE_KEY_PEM_SERVICE` is a string (PEM).
    // `signJwt` definition: `function signJwt(payload, privateKey) { ... kid: privateKey.kid ... }`
    // `privateKey.kid` on a string will be undefined!
    // This JS code seems buggy if PRIVATE_KEY_PEM_SERVICE is indeed a string.
    // KEYUTIL.getPEM returns string.
    // The header `kid` will be undefined.
    // I will fix this by using `rsaKeyService.kid` directly since that's where the key came from.
    const kid = rsaKeyService.kid;
    const headerObj = { alg: 'RS256', typ: 'JWT', kid: kid };
    return KJUR.jws.JWS.sign(null, JSON.stringify(headerObj), JSON.stringify(payload), privateKey // This is the PEM string
    );
}
function generateJti() {
    return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}
export async function handleTokenExchange(req, res) {
    const { grant_type, subject_token, subject_token_type, requested_token_type, actor_token, scope, audience } = req.body;
    if (grant_type !== 'urn:ietf:params:oauth:grant-type:token-exchange') {
        return res.status(400).json({ error: 'unsupported_grant_type' });
    }
    if (!subject_token || subject_token_type !== 'urn:ietf:params:oauth:token-type:access_token') {
        return res.status(400).json({ error: 'invalid_request', error_description: 'Missing subject_token_type' });
    }
    let publicKeys;
    try {
        publicKeys = await fetchJwks(process.env.JWKS_URL || "");
    }
    catch (err) {
        return res.status(500).json({ error: 'jwks_fetch_error', error_description: 'Failed to load JWKS' });
    }
    let subjectPayload;
    try {
        subjectPayload = verifyJwt(subject_token, publicKeys);
    }
    catch (err) {
        return res.status(401).json({ error: 'invalid_token', error_description: 'Invalid subject_token' });
    }
    const now = KJUR.jws.IntDate.get('now');
    const exp = KJUR.jws.IntDate.get('now + 1hour');
    const requestedScopes = scope?.split(/\s+/) || subjectPayload.permissions || [];
    const allowedScopes = requestedScopes.filter((s) => subjectPayload.permissions?.includes(s));
    const newAudience = audience || subjectPayload.aud;
    const newPayload = {
        iss: process.env.OAUTH_ISSUER,
        sub: subjectPayload.sub,
        aud: newAudience,
        tenant_id: subjectPayload.tenant_id,
        permissions: allowedScopes,
        iat: now,
        exp: exp,
        jti: generateJti()
    };
    let actorPayload = null;
    if (actor_token) {
        try {
            actorPayload = verifyJwt(actor_token, publicKeys);
        }
        catch (err) {
            return res.status(401).json({ error: 'invalid_token', error_description: 'Invalid actor_token' });
        }
    }
    if (actorPayload) {
        newPayload.act = { sub: actorPayload.sub };
    }
    else if (subjectPayload.client_id) {
        newPayload.act = { sub: subjectPayload.client_id };
    }
    const access_token = signJwt(newPayload, PRIVATE_KEY_PEM_SERVICE);
    return res.json({
        access_token,
        token_type: 'Bearer',
        issued_token_type: requested_token_type || 'urn:ietf:params:oauth:token-type:access_token',
        expires_in: 3600,
        scope: allowedScopes.join(' ')
    });
}
