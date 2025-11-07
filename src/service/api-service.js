import { apiPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc, getDocByPath } from "../firebase/firebase-service.js";

const getApiByIdentifier = (authId, identifier) =>
  getDoc(`${apiPath(authId, "")}`, ["identifier", "==", identifier]);

const getApiByAudience = (authId, audience) =>
  getDoc(`${apiPath(authId, "")}`, ["audience", "==", audience]);

const getApis = (apiPartialPath, companyId, domainId) =>
  getDoc(
    apiPath(apiPartialPath),
    domainId == undefined
      ? ["companyId", "==", companyId]
      : [
          ["companyId", "==", companyId],
          ["domain", "==", domainId],
        ]
  );
const getApisWhere = (apiPartialPath, companyId, domainId, condition) => {
  const fullCondition = domainId
    ? [["companyId", "==", companyId], ["domain", "==", domainId], condition]
    : companyId
    ? [["companyId", "==", companyId], condition]
    : condition;
  return getDoc(apiPartialPath(apiPartialPath), fullCondition);
};
const getApiPermissionScopes = (apiPartialPath, apiId) =>
  getDoc(apiPath(apiPartialPath, apiId, "PermissionScopes"), null);
const getApiAppRoles = (apiPartialPath, apiId) =>
  getDoc(apiPath(apiPartialPath, apiId, "AppRoles"), null);
const getApiUsersAndGroups = (apiPartialPath, apiId) =>
  getDoc(apiPath(apiPartialPath, apiId, "UsersAndGroups"), null);
const getApiUsersAndGroupsRoleRef = (apiPartialPath, apiId, roleId) =>
  getDocByPath(apiPath(apiPartialPath, apiId, "UsersAndGroups", roleId), null);

export default {
  ...createService(apiPath),
  getApis,
  getApisWhere,
  getApiPermissionScopes,
  getApiByIdentifier,
  getApiByAudience,
  getApiAppRoles,
  getApiUsersAndGroups,
  getApiUsersAndGroupsRoleRef,
};
