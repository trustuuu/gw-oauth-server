import jose from 'jsrsasign';
import https from 'https';

const { KJUR, KEYUTIL, b64utoutf8 } = jose;
import rsaKey from '../route/rsaKey.json' with { type: "json" };
import rsaKeyService from '../route/rsaKeyService.json' with { type: "json" };

// 🔐 Load keys
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
        } catch (e) {
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
  if (!publicKeyPem) throw new Error('Unknown key ID');

  const isValid = KJUR.jws.JWS.verify(token, publicKeyPem, ['RS256']);
  if (!isValid) throw new Error('JWT verification failed');

  return KJUR.jws.JWS.readSafeJSONString(b64utoutf8(payloadB64));
}

function signJwt(payload, privateKey) {
  const header = { alg: 'RS256', typ: 'JWT', kid: privateKey.kid };
  return KJUR.jws.JWS.sign(
    null,
    JSON.stringify(header),
    JSON.stringify(payload),
    privateKey
  );
}

function generateJti() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export async function handleTokenExchange(req, res) {
  const {
    grant_type,
    subject_token,
    subject_token_type,
    requested_token_type,
    actor_token,
    scope,
    audience
  } = req.body;

  if (grant_type !== 'urn:ietf:params:oauth:grant-type:token-exchange') {
    return res.status(400).json({ error: 'unsupported_grant_type' });
  }

  if (!subject_token || subject_token_type !== 'urn:ietf:params:oauth:token-type:access_token') {
    return res.status(400).json({ error: 'invalid_request', error_description: 'Missing subject_token_type' });
  }

  let publicKeys;
  try {
    publicKeys = await fetchJwks(process.env.JWKS_URL);
  } catch (err) {
    return res.status(500).json({ error: 'jwks_fetch_error', error_description: 'Failed to load JWKS' });
  }

  let subjectPayload;
  try {
    subjectPayload = verifyJwt(subject_token, publicKeys);
  } catch (err) {
    return res.status(401).json({ error: 'invalid_token', error_description: 'Invalid subject_token' });
  }

  let actorPayload = null;
  if (actor_token) {
    try {
      actorPayload = verifyJwt(actor_token, publicKeys);
    } catch (err) {
      return res.status(401).json({ error: 'invalid_token', error_description: 'Invalid actor_token' });
    }
  }

  const now = KJUR.jws.IntDate.get('now');
  const exp = KJUR.jws.IntDate.get('now + 1hour');
  const requestedScopes = scope?.split(/\s+/) || subjectPayload.permissions || [];
  const allowedScopes = requestedScopes.filter(s => subjectPayload.permissions?.includes(s));
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

  if (actorPayload) {
    newPayload.act = { sub: actorPayload.sub };
  } else if (subjectPayload.client_id) {
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
