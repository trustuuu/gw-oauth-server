import url from 'url';
import jose from 'jsrsasign';
import randomstring from 'randomstring';
import querystring from 'querystring';
import * as __ from 'underscore';
import crypto from 'crypto';
import userService from '../service/user-service.js';

import rsaKey from '../route/rsaKey.json' with { type: "json" };
import rsaKeyService from '../route/rsaKeyService.json' with { type: "json" };
import refreshTokenService from '../service/refresh-token-service.js';
import { AUTH_PATH } from '../service/remote-path-service.js';

export const generateCodeAccessToken = async (iss, sub, aud, iat, exp, client, api, user) => {
    const access_token = await generateAccessTokenCommon(rsaKey, iss, sub, aud, iat, exp, client, api, user);
    return access_token;
}
export const generateServiceAccessToken = async (iss, sub, aud, iat, exp, client, api) => {
    const access_token = await generateAccessTokenCommon(rsaKeyService, iss, sub, aud, iat, exp, client, api);
    return access_token;
}
export const generateRefreshAccessToken = async (aud, exp, client, deviceId, user, scope, token_use) => {
  let tenant_id = null;
  let client_id = null;
  if (client){
    tenant_id = client.companyId;
    client_id = client.id;
  }

  const header = { 'typ': 'JWT', 'alg': rsaKeyService.alg, 'kid': rsaKeyService.kid };
  const payload = {
      aud: aud,
      exp: exp,
      jti: randomstring.generate(16),
      tenant_id,
      client_id,
      device_id: deviceId,
      token_use //: "refresh"
  };

  const now_utc = getUTCNow();
  const refresh_token_save = {
    "user_id": user.id,
    "client_id": client_id,
    "device_id": deviceId,
    "refresh_token": payload.jti,
    "issued_at": Math.floor(now_utc / 1000),
    "expires_at": exp,
    "revoked": false,
    user,
    scope
  }
  console.log('refresh_token_save, deviceId', refresh_token_save, deviceId)
  await refreshTokenService.setData.apply(refreshTokenService, [refresh_token_save].concat(([AUTH_PATH, deviceId])));

  //const payload_server = {...payload, user, scope};
  const privateKey = jose.KEYUTIL.getKey(rsaKeyService);
  const refresh_token = jose.jws.JWS.sign(header.alg,
      JSON.stringify(header),
      JSON.stringify(payload),
      privateKey);
  return refresh_token;
}

export const generateAccessTokenCommon = async (selectedRasKey, iss, sub, aud, iat, exp, client, api, user) => {
  let userPermissions = null
  let roles = null
  let tenant_id = null;
  let company_id = null;
  let domain_id = null;

  if (api.addPermissionAccessToken && user){
    const userPermissionRaw = await userService.getUserPermissionScopes(
      user.companyId,
      user.domainId,
      user.id
    );
    userPermissions = userPermissionRaw.map((p) => {
      return p.permission;
      //return { id: p.id.split("#")[0], permission: p.permission };
    });
  }
  if (api.RBAC && user){
    const appRoles = await userService.getUserAppRoles(
      user.companyId,
      user.domainId,
      user.id,
      ["api", "==", api.id]
    );

    roles = appRoles ? appRoles.map((r) => r.role) : [];
  }
  if(user){
    roles = user.root ? [...roles, "tenant:admin"] : roles;
    tenant_id = user.companyId;
    company_id = user.companyId,
    domain_id = user.domainId
  }

  if(client.companyId && !tenant_id) tenant_id = client.companyId;

  var header = { 'typ': 'JWT', 'alg': selectedRasKey.alg, 'kid': selectedRasKey.kid };
  var payload = {
      iss: iss,
      sub: sub,
      aud: aud,
      iat: iat,
      exp: exp,
      jti: randomstring.generate(8),
      permissions: client.PermissionScopes? client.PermissionScopes : userPermissions?userPermissions:[],
      roles: roles?roles:[],
      tenant_id: tenant_id?tenant_id:client.companyId,
      client_id:client.id,
      companyId:company_id?company_id:client.companyId,
      domainId:domain_id?domain_id:client.domain,
      token_use: "access"
  };

  var privateKey = jose.KEYUTIL.getKey(selectedRasKey);
  var access_token = jose.jws.JWS.sign(header.alg,
      JSON.stringify(header),
      JSON.stringify(payload),
      privateKey);
  return access_token;
}

export const generateIdToken = (iss, iat, user, clientId, scopes, nonce) => {
    const access_token = generateIdTokenCommon(iss, iat, user, clientId, scopes, nonce);
    return access_token;
}
export const generateServiceIdToken = (iss, user, clientId, nonce) => {
    const access_token = generateIdTokenCommon(rsaKeyService, iss, user, clientId, nonce);
    return access_token;
}

export const generateIdTokenCommon = (iss, iat, user, clientId, scopes, nonce) => {
    var header = { 'typ': 'JWT', 'alg': rsaKey.alg, 'kid': rsaKey.kid };
    let payload = {
      sub: user.id,               // 사용자 ID
      aud: clientId,              // 클라이언트 앱 ID
      iss,
      iat,
      nonce: nonce,               // OpenID Connect 보안용
    };
    if(scopes.includes("profile")){
      payload = {...payload,
        id: user.id,
        root: user.root,
        name:  user.name,// 사용자 이름
        displayName: user.displayName,
        companyId: user.companyId,
        domainId: user.domainId
      }
    }
    if(scopes.includes("email")){
      payload = {...payload,
        email:  user.email,// 사용자 이름
        email_verified: user.email_verified
      }
    }

    var privateKey = jose.KEYUTIL.getKey(rsaKey);
    var id_token = jose.jws.JWS.sign(header.alg,
        JSON.stringify(header),
        JSON.stringify(payload),
        privateKey);
    return id_token;
}

export function getTokenExchangeAccessToken({ iss, sub, aud, scopes, act, extraClaims = {}, expiresInSeconds }) {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (expiresInSeconds || 3600);

  const payload = {
    iss,
    sub,
    aud,
    scope: Array.isArray(scopes) ? scopes.join(" ") : scopes,
    iat: now,
    exp,
    ...extraClaims,
  };

  if (act) {
    // RFC 8693 style actor claim (for impersonation/delegation)
    payload.act = act;
  }

  var privateKey = jose.KEYUTIL.getKey(rsaKey);
  var header = { 'typ': 'JWT', 'alg': rsaKey.alg, 'kid': rsaKey.kid };
  var token = jose.jws.JWS.sign(header.alg,
      JSON.stringify(header),
      JSON.stringify(payload),
      privateKey);

  return token;
}


export const getJwtExpire = (token) => {
	if (!token) throw new Error("there is no token");
  
	const parts = token.split(".");
	if (parts.length !== 3) throw new Error("malform JWT");
  
	const payloadBase64 = parts[1];
	const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf-8");
	const payload = JSON.parse(payloadJson);
  
	if (!payload.exp) throw new Error("No expire info.");
  
	const expireDate = new Date(payload.exp * 1000);
	return expireDate;
  }

export const buildUrl = (base, options, hash) => {
	var newUrl = url.parse(base, true);
	delete newUrl.search;
	if (!newUrl.query) {
		newUrl.query = {};
	}
	__.each(options, function(value, key) {
		newUrl.query[key] = value;
	});
	if (hash) {
		newUrl.hash = hash;
	}
	
	return url.format(newUrl);
};

function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error("Invalid JWT");
  }

  const base64 = parts[1]
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const payload = Buffer.from(base64, 'base64').toString('utf-8');
  return JSON.parse(payload);
}

export const decodeClientCredentials = function(auth) {
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7); // remove "Bearer "
    const payload = decodeJwtPayload(token);
    return { id: payload.client_id};
  } else if (auth.startsWith("Basic ")) {
    var clientCredentials = Buffer.from(auth.slice('basic '.length), 'base64').toString().split(':');
    var clientId = querystring.unescape(clientCredentials[0]);
    //var clientSecret = querystring.unescape(clientCredentials[1]);	
    return { id: clientId };
  } else {
    return null;
  }
};

export const getScopesFromForm = function(body) {
  return body.scope?body.scope.split(" "):[]
	// return __.filter(__.keys(body), function(s) { return __string.startsWith(s, 'scope_'); })
	// 			.map(function(s) { return s.slice('scope_'.length); });
};

// 1. code_verifier 생성
export function generateCodeVerifier() {
    return crypto.randomBytes(32).toString('hex');
  }
  
  // 2. code_challenge 생성
export function generateCodeChallenge(codeVerifier) {
    const hash = crypto.createHash('sha256')
      .update(codeVerifier)
      .digest();
  
    return base64urlEncode(hash);
  }

  function base64urlEncode(sha256) {
   const base64 = sha256.toString('base64');
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}


export function verifyCodeChallenge(code_verifier, original_code_challenge) {
    const digest = crypto.createHash('sha256').update(code_verifier).digest();

    const computed_challenge = base64urlEncode(digest);
    return computed_challenge === original_code_challenge;
  }
  
export const corsOptionsDelegate = function (req, callback) {
  const whitelist = ["http://localhost:3000", "https://app.trusted.com"];

  const origin = req.get("Origin");
  const isAllowed = whitelist.includes(origin);

  const corsInnerOptions = {
    origin: isAllowed ? true : false, // only allow if in whitelist
    credentials: true, // allow cookies/auth headers
    optionSuccessStatus: 200,
  };

  callback(null, corsInnerOptions);
};

// url-safe base64 helpers
const b64u = {
  enc: (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/,""),
  dec: (str) => Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4), "base64"),
};

// derive a 32-byte key from your app secret
function keyFromSecret(secret) {
  return crypto.createHash("sha256").update(secret).digest(); // 32 bytes
}

export function encryptPayload(payloadObj, secret) {
  const key = keyFromSecret(secret);
  const iv = crypto.randomBytes(12); // GCM nonce
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payloadObj), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  // token = iv.tag.ciphertext (all base64url, dot-separated)
  return [b64u.enc(iv), b64u.enc(tag), b64u.enc(ciphertext)].join(".");
}

export function decryptPayload(token, secret) {
  const [ivB64, tagB64, ctB64] = token.split(".");
  if (!ivB64 || !tagB64 || !ctB64) throw new Error("bad_token_format");
  const key = keyFromSecret(secret);
  const iv = b64u.dec(ivB64);
  const tag = b64u.dec(tagB64);
  const ct = b64u.dec(ctB64);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return JSON.parse(pt.toString("utf8"));
}

export function toBase32(input) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";

  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;

  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output; // no padding "=" to match TOTP usage
}


export function generateUserCode(format = "AAAAA-AAAAA") {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";

  for (const ch of format) {
    if (ch === "A") {
      // Random capital letter or number
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    } else {
      // Keep literal characters like "-" or " "
      result += ch;
    }
  }

  return result;
}

export function getUTCNow(){
  const date = new Date();
  const now_utc = Date.UTC(
  date.getUTCFullYear(),
  date.getUTCMonth(),
  date.getUTCDate(),
  date.getUTCHours(),
  date.getUTCMinutes(),
  date.getUTCSeconds()
  );
  return now_utc;
}