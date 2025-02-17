import url from 'url';
import jose from 'jsrsasign';
import randomstring from 'randomstring';
import querystring from 'querystring';
import * as __ from 'underscore';
import __string from 'underscore.string';

import rsaKey from '../route/rsaKey.json' with { type: "json" };

export const generateAccessToken = (iss, sub, aud, iat, exp, permissions) => {
    var header = { 'typ': 'JWT', 'alg': rsaKey.alg, 'kid': rsaKey.kid };
    var payload = {
        iss: iss,
        sub: sub,
        aud: aud,
        iat: iat,
        exp: exp,
        jti: randomstring.generate(8),
        permissions: permissions
    };
   
    var privateKey = jose.KEYUTIL.getKey(rsaKey);
    var access_token = jose.jws.JWS.sign(header.alg,
        JSON.stringify(header),
        JSON.stringify(payload),
        privateKey);

    return access_token;
}

export const buildUrl = (base, options, hash) => {
	var newUrl = url.parse(base, true);
	delete newUrl.search;
	if (!newUrl.query) {
		newUrl.query = {};
	}
	__.each(options, function(value, key, list) {
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