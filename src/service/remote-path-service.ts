import { Blob } from "buffer";
import * as R from "ramda";
//const { default: R } = await import("ramda");

export const AUTH_COLL = "Auth2";
export const API_COLL = "registers";
export const APPLICATION_COLL = "registers";
export const CODE_COLL = "codes";
export const REQID_COLL = "reqids";
export const TOKEN_COLL = "tokens";
export const DEVICE_COLL = "devices";
export const REFRESH_TOKEN_COLL = "refresh_tokens";
export const COMPANY_COLL = "companys";
export const DOMAIN_COLL = "domainNames";
export const GROUP_COLL = "groups";
export const USER_COLL = "users";
export const PROVISIONING_COLL = "provisionings";

export const AUTH_PATH = "authorization";
export const API_PATH = "api";
export const APP_PATH = "application";

export const PRODUCT_COLL = "products";
export const COMPUTER_COLL = "computers";
export const CONNECTION_COLL = "connections";
export const SCIM_COLL = "scims";
export const SYNC_COLL = "syncronizations";
export const ACCOUNT_COLL = "accounts";

const concat = (...param: any[]) =>
  param.reduce((acc, cur) => R.concat(acc, cur ? `/${cur}` : ""));

export const companyPath = (companyId: string) =>
  concat(COMPANY_COLL, companyId);
export const domainPath = (
  companyId: string,
  domainId: string,
  connectionProp?: string,
  connectionId?: string
) =>
  concat(
    companyPath(companyId),
    DOMAIN_COLL,
    domainId,
    connectionProp,
    connectionId
  );
export const scimPath = (companyId: string, domainId: string, scimId: string) =>
  concat(domainPath(companyId, domainId), SCIM_COLL, scimId);

// export const domainConnectionPath = (
//   companyId,
//   domainId,
//   otherProp,
//   otherPropId
// ) => concat(domainPath(companyId, domainId), otherProp, otherPropId);
export const groupPath = (
  companyId: string,
  domainId: string,
  groupId: string,
  memberPath?: string,
  memberId?: string
) =>
  concat(
    domainPath(companyId, domainId),
    GROUP_COLL,
    groupId,
    memberPath,
    memberId
  );
export const userPath = (
  companyId: string,
  domainId: string,
  userId?: string,
  otherProp?: string,
  otherPropId?: string
) =>
  concat(
    domainPath(companyId, domainId),
    USER_COLL,
    userId,
    otherProp,
    otherPropId
  );
export const provisioningPath = (companyId: string, provisioningId: string) =>
  concat(companyPath(companyId), PROVISIONING_COLL, provisioningId);

export const productPath = (companyId: string, productId: string) =>
  concat(companyPath(companyId), PRODUCT_COLL, productId);
export const connectionPath = (
  companyId: string,
  provisioningId: string,
  connectionId: string
) =>
  concat(
    provisioningPath(companyId, provisioningId),
    CONNECTION_COLL,
    connectionId
  );
export const syncronizationPath = (companyId: string, syncId: string) =>
  concat(companyPath(companyId), SYNC_COLL, syncId);
export const computerPath = (
  companyId: string,
  domainId: string,
  computerId: string
) => concat(domainPath(companyId, domainId), COMPUTER_COLL, computerId);
export const accountPath = (email: string) => concat(ACCOUNT_COLL, email);

export const authPath = (authId: string) => concat(AUTH_COLL, authId);

export const apiPath = (
  authId: string,
  apiId?: string,
  scopePath?: string,
  scopeId?: string
) => concat(authPath(authId), API_COLL, apiId, scopePath, scopeId);

export const applicationPath = (
  authId: string,
  appId?: string,
  scopePath?: string,
  scopeId?: string
) => concat(authPath(authId), APPLICATION_COLL, appId, scopePath, scopeId);

export const authCodePath = (authId: string, codeId: string) =>
  concat(authPath(authId), CODE_COLL, codeId);
export const authReqIdPath = (authId: string, reqId: string) =>
  concat(authPath(authId), REQID_COLL, reqId);

export const tokenPath = (authId: string, deviceId: string) =>
  concat(authPath(authId), TOKEN_COLL, deviceId);

export const refreshTokenPath = (authId: string, deviceId: string) =>
  concat(authPath(authId), REFRESH_TOKEN_COLL, deviceId);

export const devicePath = (authId: string, deviceId: string) =>
  concat(authPath(authId), DEVICE_COLL, deviceId);

export const generateId = (id: string) => {
  const newId = id.replaceAll(" ", "-");
  const reg = new RegExp(`.{1,${newId.length}}`);
  let guid = URL.createObjectURL(new Blob([])).slice(-36);
  return guid.replace(reg, newId);
};
