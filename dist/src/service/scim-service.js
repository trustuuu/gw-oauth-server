import { scimPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc } from "../firebase/firebase-service.js";
const getScimsWhere = (companyId, domainId, condition) => getDoc(scimPath(companyId, domainId, undefined), condition);
export default { ...createService(scimPath), getScimsWhere };
