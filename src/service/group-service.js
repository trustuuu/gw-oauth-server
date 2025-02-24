import { groupPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc } from "../firebase/firebase-service.js";

const getGroupsWhere = (companyId, domainId, condition) =>
  getDoc(groupPath(companyId, domainId), condition);
const getGroupMembers = (companyId, domainId, groupId) =>
  getDoc(groupPath(companyId, domainId, groupId, "members"), null);
export default { ...createService(groupPath), getGroupsWhere, getGroupMembers };
