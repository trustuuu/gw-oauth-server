import { applicationPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc } from "../firebase/firebase-service.js";

const getRedirectURIs = (authId: string, appid: string) =>
  getDoc(`${applicationPath(authId, appid)}/redirect_uris`, null);

const getApplications = (
  appPath: string,
  companyId: string,
  domainId?: string
) =>
  getDoc(
    applicationPath(appPath, undefined as any),
    domainId == undefined
      ? ["companyId", "==", companyId]
      : [
          ["companyId", "==", companyId],
          ["domain", "==", domainId],
        ]
  );
const getApplicationsWhere = (
  appPath: string,
  companyId: string,
  domainId: string | undefined,
  condition: any
) => {
  const fullCondition = domainId
    ? [["companyId", "==", companyId], ["domain", "==", domainId], condition]
    : companyId
    ? [["companyId", "==", companyId], condition]
    : condition;
  return getDoc(applicationPath(appPath, undefined as any), fullCondition);
};
const getApplicationPermissionScopes = (appPath: string, appId: string) =>
  getDoc(applicationPath(appPath, appId, "PermissionScopes"), null);
const getApplicationTokenExchanges = (appPath: string, appId: string) =>
  getDoc(applicationPath(appPath, appId, "TokenExchanges"), null);

export default {
  ...createService(applicationPath as any),
  getRedirectURIs,
  getApplications,
  getApplicationsWhere,
  getApplicationPermissionScopes,
  getApplicationTokenExchanges,
};
