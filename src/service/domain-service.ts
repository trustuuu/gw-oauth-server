import { domainPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc } from "../firebase/firebase-service.js";

const getDomainInfo = (companyId: string, domainId: string) =>
  getDoc(domainPath(companyId, domainId), null);
const getPrimaryDomain = (companyId: string) =>
  getDoc(domainPath(companyId, undefined as any), ["primary", "==", true]);
const getDomainByName = (companyId: string, domainName: string) =>
  getDoc(domainPath(companyId, undefined as any), ["name", "==", domainName]);
const getDomainConnections = (
  companyId: string,
  domainId: string,
  connectionId?: string,
  condition?: any
) =>
  getDoc(
    connectionId
      ? domainPath(companyId, domainId, "Connections", connectionId)
      : domainPath(companyId, domainId, "Connections"),
    condition
  );

export default {
  ...createService(domainPath as any),
  getDomainInfo,
  getPrimaryDomain,
  getDomainByName,
  getDomainConnections,
};
