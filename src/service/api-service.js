import { apiPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc } from "../firebase/firebase-service.js";

const getApiByIdentifier = (authId, identifier) =>
  getDoc(`${apiPath(authId, "")}`, ["identifier", "==", identifier]);

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

export default {
  ...createService(apiPath),
  getApis,
  getApisWhere,
  getApiPermissionScopes,
  getApiByIdentifier,
};
