import { apiPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc, getDocByPath } from "../firebase/firebase-service.js";

const getApiByIdentifier = (authId: string, identifier: string) =>
  getDoc(`${apiPath(authId, "")}`, ["identifier", "==", identifier]);

const getApiByAudience = (authId: string, audience: string) =>
  getDoc(`${apiPath(authId, "")}`, ["audience", "==", audience]);

const getApis = (apiPartialPath: any, companyId: string, domainId?: string) =>
  getDoc(
    apiPath(apiPartialPath), // Usage: apiPath(authId, apiId?) but here expecting what?
    // original: getDoc(apiPath(apiPartialPath), ...)
    // If apiPartialPath is authId, then apiPath(authId) fails because apiPath needs 2 args (authId, apiId).
    // Original JS: `getDoc(apiPath(apiPartialPath), ...)` implies apiPath was called with 1 arg?
    // Let's check remote-path-service.ts: export const apiPath = (authId, apiId, scopePath, scopeId) => ...
    // If called with 1 arg, apiId is undefined. concat fails or produces weird string "Auth2/authId/register/undefined".
    // Wait, original JS remote-path-service:
    // export const apiPath = (authId, apiId, scopePath, scopeId) => concat(authPath(authId), API_COLL, apiId, scopePath, scopeId);
    // concat calls R.concat(acc, cur ? `/${cur}` : "")
    // if cur is undefined, it appends "".
    // So "Auth2/id/register/" <-- trailing slash ? No, "Auth2/id/register"
    // So it works.
    // In TS, I defined `apiId` as string (required). I should make it optional.
    // I will adjust `remote-path-service.ts` to make optional params optional.
    domainId == undefined
      ? ["companyId", "==", companyId]
      : [
          ["companyId", "==", companyId],
          ["domain", "==", domainId],
        ]
  );
const getApisWhere = (
  apiPartialPath: any,
  companyId: string,
  domainId: string | undefined,
  condition: any
) => {
  const fullCondition = domainId
    ? [["companyId", "==", companyId], ["domain", "==", domainId], condition]
    : companyId
    ? [["companyId", "==", companyId], condition]
    : condition;
  return getDoc(apiPartialPath(apiPartialPath), fullCondition);
};
const getApiPermissionScopes = (apiPartialPath: string, apiId: string) =>
  getDoc(apiPath(apiPartialPath, apiId, "PermissionScopes"), null);
const getApiAppRoles = (apiPartialPath: string, apiId: string) =>
  getDoc(apiPath(apiPartialPath, apiId, "AppRoles"), null);
const getApiUsersAndGroups = (apiPartialPath: string, apiId: string) =>
  getDoc(apiPath(apiPartialPath, apiId, "UsersAndGroups"), null);
const getApiUsersAndGroupsRoleRef = (
  apiPartialPath: string,
  apiId: string,
  roleId: string
) => getDocByPath(apiPath(apiPartialPath, apiId, "UsersAndGroups", roleId));

export default {
  ...createService(apiPath as any),
  getApis,
  getApisWhere,
  getApiPermissionScopes,
  getApiByIdentifier,
  getApiByAudience,
  getApiAppRoles,
  getApiUsersAndGroups,
  getApiUsersAndGroupsRoleRef,
};
