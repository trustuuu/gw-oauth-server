import * as R from 'ramda';

export const AUTH_COLL = "Auth2";
export const API_COLL = "registers";
export const APPLICATION_COLL = "registers";
export const CODE_COLL = "codes";
export const TOKEN_COLL = "tokens";

export const COMPANY_COLL = "companys";
export const DOMAIN_COLL = "domainNames";
export const USER_COLL = "users";

const concat = (...param) => param.reduce((acc, cur) => R.concat(acc, cur ? `/${cur}` : ""));
// const authId = "authorization";
// const apiId = "api";
// const appId = "application";
// const codeId = "authorization";
// const TokenId = "authorization";

export const authPath = authId => concat(AUTH_COLL, authId);
export const apiPath = (authId, apiId) => concat(authPath(authId), API_COLL, apiId);
export const applicationPath = (authId, appId) => concat(authPath(authId), APPLICATION_COLL, appId);
export const authCodePath = (authId, codeId) => concat(authPath(authId), CODE_COLL, codeId);
export const tokenPath = (authId, token) => concat(authPath(authId), TOKEN_COLL, token);

const companyPath = companyId => concat(COMPANY_COLL, companyId);
const domainPath = (companyId, domainId) => concat(companyPath(companyId), DOMAIN_COLL, domainId);
export const userPath = (companyId, domainId, userId) => concat(domainPath(companyId, domainId), USER_COLL, userId);
