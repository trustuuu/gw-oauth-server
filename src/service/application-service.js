import { applicationPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc } from "../firebase/firebase-service.js";

const getRedirectURIs = (authId, appid) =>
  getDoc(`${applicationPath(authId, appid)}/redirect_uris`, null);

const getApplications = (appPath, companyId, domainId) =>
  getDoc(
    applicationPath(appPath),
    domainId == undefined
      ? ["companyId", "==", companyId]
      : [
          ["companyId", "==", companyId],
          ["domain", "==", domainId],
        ]
  );
const getApplicationsWhere = (appPath, companyId, domainId, condition) => {
  const fullCondition = domainId
    ? [["companyId", "==", companyId], ["domain", "==", domainId], condition]
    : companyId
    ? [["companyId", "==", companyId], condition]
    : condition;
  return getDoc(applicationPath(appPath), fullCondition);
};
const getApplicationPermissionScopes = (appPath, appId) =>
  getDoc(applicationPath(appPath, appId, "PermissionScopes"), null);

export default {
  ...createService(applicationPath),
  getRedirectURIs,
  getApplications,
  getApplicationsWhere,
  getApplicationPermissionScopes,
};
