import { domainPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc } from "../firebase/firebase-service.js";

const getDomainInfo = (companyId, domainId) =>
  getDoc(domainPath(companyId, domainId), null);
const getPrimaryDomain = (companyId) =>
  getDoc(domainPath(companyId), ["primary", "==", true]);

export default {
  ...createService(domainPath),
  getDomainInfo,
  getPrimaryDomain,
};
