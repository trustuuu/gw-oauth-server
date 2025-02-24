import { companyPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc } from "../firebase/firebase-service.js";

const getChildCompanys = (id) => getDoc(companyPath(), ["parent", "==", id]);

export default { ...createService(companyPath), getChildCompanys };
