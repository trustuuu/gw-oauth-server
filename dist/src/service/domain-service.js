import { domainPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc } from "../firebase/firebase-service.js";
const getDomainInfo = (companyId, domainId) => getDoc(domainPath(companyId, domainId), null);
const getPrimaryDomain = (companyId) => getDoc(domainPath(companyId, undefined), ["primary", "==", true]);
const getDomainByName = (companyId, domainName) => getDoc(domainPath(companyId, undefined), ["name", "==", domainName]);
const getDomainConnections = (companyId, domainId, connectionId, condition) => getDoc(connectionId
    ? domainPath(companyId, domainId, "Connections", connectionId)
    : domainPath(companyId, domainId, "Connections"), condition);
export default {
    ...createService(domainPath),
    getDomainInfo,
    getPrimaryDomain,
    getDomainByName,
    getDomainConnections,
};
