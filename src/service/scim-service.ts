import { scimPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc } from "../firebase/firebase-service.js";

const getScimsWhere = (companyId: string, domainId: string, condition: any) =>
  getDoc(scimPath(companyId, domainId, undefined as any), condition);

export default { ...createService(scimPath as any), getScimsWhere };
