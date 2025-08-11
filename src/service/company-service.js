import { companyPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc } from "../firebase/firebase-service.js";

const getChildCompanys = (id) => getDoc(companyPath(), ["parent", "==", id]);
const getCompanyByName = (name) => getDoc(companyPath(), ["name", "==", name]);

export default {
  ...createService(companyPath),
  getChildCompanys,
  getCompanyByName,
};
