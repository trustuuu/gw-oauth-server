import url from 'url';
import jose from 'jsrsasign';
import randomstring from 'randomstring';
import querystring from 'querystring';
import * as __ from 'underscore';
import __string from 'underscore.string';
import crypto from 'crypto';

import rsaKey from '../route/rsaKey.json' with { type: "json" };
import rsaKeyService from '../route/rsaKeyService.json' with { type: "json" };

export const generateAccessToken = (iss, sub, aud, iat, exp, permissions, roles) => {
    const access_token = generateAccessTokenCommon(rsaKey, iss, sub, aud, iat, exp, permissions, roles);
    return access_token;
}
export const generateServiceAccessToken = (iss, sub, aud, iat, exp, permissions, roles) => {
    const access_token = generateAccessTokenCommon(rsaKeyService, iss, sub, aud, iat, exp, permissions, roles);
    return access_token;

}

export const generateAccessTokenCommon = (selectedRasKey, iss, sub, aud, iat, exp, permissions, roles) => {
    var header = { 'typ': 'JWT', 'alg': selectedRasKey.alg, 'kid': selectedRasKey.kid };
    var payload = {
        iss: iss,
        sub: sub,
        aud: aud,
        iat: iat,
        exp: exp,
        jti: randomstring.generate(8),
        permissions: permissions,
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
	console.log("expire at:", expireDate.toISOString());
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
  
  function base64urlEncode(buffer) {
    // buffer: Uint8Array (브라우저) 또는 Buffer (Node.js)
  
    const base64String = Buffer.from(buffer).toString('base64');
  
    // base64 → base64url 변환
    return base64String
      .replace(/\+/g, '-') // + -> -
      .replace(/\//g, '_') // / -> _
      .replace(/=+$/, ''); // padding 제거
  }

export function verifyCodeChallenge(code_verifier, original_code_challenge) {
    const digest = crypto.createHash('sha256').update(code_verifier).digest();

    const computed_challenge = base64urlEncode(digest);
    return computed_challenge === original_code_challenge;
  }
  