import url from 'url';
import jose from 'jsrsasign';
import randomstring from 'randomstring';
import querystring from 'querystring';
import * as __ from 'underscore';
import __string from 'underscore.string';
import crypto from 'crypto';
import userService from '../service/user-service.js';

import rsaKey from '../route/rsaKey.json' with { type: "json" };
import rsaKeyService from '../route/rsaKeyService.json' with { type: "json" };

export const generateCodeAccessToken = async (iss, sub, aud, iat, exp, api, user) => {
    const access_token = await generateAccessTokenCommon(rsaKey, iss, sub, aud, iat, exp, null, api, user);
    return access_token;
}
export const generateServiceAccessToken = async (iss, sub, aud, iat, exp, permission, api) => {
    const access_token = await generateAccessTokenCommon(rsaKeyService, iss, sub, aud, iat, exp, permission, api);
    return access_token;

}

export const generateAccessTokenCommon = async (selectedRasKey, iss, sub, aud, iat, exp, permission, api, user) => {
  let userPermissions = null
  let roles = null
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
    console.log(
      "authorization_code appRoles",
      appRoles.map((r) => r.role)
    );
    roles = appRoles ? appRoles.map((r) => r.role) : [];
  }
if(user){
  roles = user.root ? [...roles, "tenant:admin"] : roles;
}
    var header = { 'typ': 'JWT', 'alg': selectedRasKey.alg, 'kid': selectedRasKey.kid };
    var payload = {
        iss: iss,
        sub: sub,
        aud: aud,
        iat: iat,
        exp: exp,
        jti: randomstring.generate(8),
        permissions: permission? permission : userPermissions?userPermissions:[],
        roles: roles?roles:[]
    };
   
    var privateKey = jose.KEYUTIL.getKey(selectedRasKey);
    var access_token = jose.jws.JWS.sign(header.alg,
        JSON.stringify(header),
        JSON.stringify(payload),
        privateKey);

    return access_token;
}

export const generateIdToken = (iss, user, clientId, nonce) => {
    const access_token = generateIdTokenCommon(rsaKey, iss, user, clientId, nonce);
    return access_token;
}
export const generateServiceIdToken = (iss, user, clientId, nonce) => {
    const access_token = generateIdTokenCommon(rsaKeyService, iss, user, clientId, nonce);
    return access_token;

}

export const generateIdTokenCommon = (iss, user, clientId, nonce) => {
    var header = { 'typ': 'JWT', 'alg': rsaKey.alg, 'kid': rsaKey.kid };
    const payload = {
      sub: user.id,               // 사용자 ID
      name: user.name,            // 사용자 이름
      email: user.email,          // 사용자 이메일
      aud: clientId,              // 클라이언트 앱 ID
      iss: iss,
      nonce: nonce,               // OpenID Connect 보안용
    };

    var privateKey = jose.KEYUTIL.getKey(rsaKey);
    var id_token = jose.jws.JWS.sign(header.alg,
        JSON.stringify(header),
        JSON.stringify(payload),
        privateKey);
    return id_token;
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

export const decodeClientCredentials = function(auth) {
	var clientCredentials = Buffer.from(auth.slice('basic '.length), 'base64').toString().split(':');
	var clientId = querystring.unescape(clientCredentials[0]);
	var clientSecret = querystring.unescape(clientCredentials[1]);	
	return { id: clientId, secret: clientSecret };
};

export const getScopesFromForm = function(body) {
	return __.filter(__.keys(body), function(s) { return __string.startsWith(s, 'scope_'); })
				.map(function(s) { return s.slice('scope_'.length); });
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
  
  // function base64urlEncode(buffer) {
  //   // buffer: Uint8Array (브라우저) 또는 Buffer (Node.js)
  
  //   const base64String = Buffer.from(buffer).toString('base64');
  
  //   // base64 → base64url 변환
  //   return base64String
  //     .replace(/\+/g, '-') // + -> -
  //     .replace(/\//g, '_') // / -> _
  //     .replace(/=+$/, ''); // padding 제거
  // }

  function base64urlEncode(sha256) {
  //const base64 = Buffer.from(buffer).toString('base64');
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