import { Blob } from "buffer";
import * as R from "ramda";
//const { default: R } = await import("ramda");

export const AUTH_COLL = "Auth2";
export const API_COLL = "registers";
export const APPLICATION_COLL = "registers";
export const CODE_COLL = "codes";
export const REQID_COLL = "reqids";
export const TOKEN_COLL = "tokens";
export const REFRESH_TOKEN_COLL = "refresh_tokens";
export const COMPANY_COLL = "companys";
export const DOMAIN_COLL = "domainNames";
export const GROUP_COLL = "groups";
export const USER_COLL = "users";
export const PROVISIONING_COLL = "provisionings";

export const PRODUCT_COLL = "products";
export const COMPUTER_COLL = "computers";
export const CONNECTION_COLL = "connections";
export const SYNC_COLL = "syncronizations";
export const ACCOUNT_COLL = "accounts";

const concat = (...param) =>
  param.reduce((acc, cur) => R.concat(acc, cur ? `/${cur}` : ""));

export const companyPath = (companyId) => concat(COMPANY_COLL, companyId);
export const domainPath = (companyId, domainId) =>
  concat(companyPath(companyId), DOMAIN_COLL, domainId);
export const groupPath = (companyId, domainId, groupId, memberPath, memberId) =>
  concat(
    domainPath(companyId, domainId),
    GROUP_COLL,
    groupId,
    memberPath,
    memberId
  );
export const userPath = (
  companyId,
  domainId,
  userId,
  permissionScopes,
  permissionScopeId
) =>
  concat(
    domainPath(companyId, domainId),
    USER_COLL,
    userId,
    permissionScopes,
    permissionScopeId
  );
export const provisioningPath = (companyId, provisioningId) =>
  concat(companyPath(companyId), PROVISIONING_COLL, provisioningId);

export const productPath = (companyId, productId) =>
  concat(companyPath(companyId), PRODUCT_COLL, productId);
export const connectionPath = (companyId, provisioningId, connectionId) =>
  concat(
    provisioningPath(companyId, provisioningId),
    CONNECTION_COLL,
    connectionId
  );
export const syncronizationPath = (companyId, syncId) =>
  concat(companyPath(companyId), SYNC_COLL, syncId);
export const computerPath = (companyId, domainId, computerId) =>
  concat(domainPath(companyId, domainId), COMPUTER_COLL, computerId);
export const accountPath = (email) => concat(ACCOUNT_COLL, email);

export const authPath = (authId) => concat(AUTH_COLL, authId);

export const apiPath = (authId, apiId, scopePath, scopeId) =>
  concat(authPath(authId), API_COLL, apiId, scopePath, scopeId);

export const applicationPath = (authId, appId, scopePath, scopeId) =>
  concat(authPath(authId), APPLICATION_COLL, appId, scopePath, scopeId);

export const authCodePath = (authId, codeId) =>
  concat(authPath(authId), CODE_COLL, codeId);
export const authReqIdPath = (authId, reqId) =>
  concat(authPath(authId), REQID_COLL, reqId);

export const tokenPath = (authId, deviceId) =>
  concat(authPath(authId), TOKEN_COLL, deviceId);

export const refreshTokenPath = (authId, deviceId) =>
  concat(authPath(authId), REFRESH_TOKEN_COLL, deviceId);

export const generateId = (id) => {
  const reg = new RegExp(`.{1,${id.length}}`);
  let guid = URL.createObjectURL(new Blob([])).slice(-36);
  return guid.replace(reg, id);
};
