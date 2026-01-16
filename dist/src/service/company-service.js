import { companyPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc } from "../firebase/firebase-service.js";
const getChildCompanys = (id) => getDoc(companyPath(undefined), ["parent", "==", id]);
const getCompanyByName = (name) => getDoc(companyPath(undefined), ["name", "==", name]);
export default {
    ...createService(companyPath),
    getChildCompanys,
    getCompanyByName,
};
