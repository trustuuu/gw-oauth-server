import { companyPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc } from "../firebase/firebase-service.js";

const getChildCompanys = (id: string) =>
  getDoc(companyPath(undefined as any), ["parent", "==", id]);
const getCompanyByName = (name: string) =>
  getDoc(companyPath(undefined as any), ["name", "==", name]);

export default {
  ...createService(companyPath as any),
  getChildCompanys,
  getCompanyByName,
};
