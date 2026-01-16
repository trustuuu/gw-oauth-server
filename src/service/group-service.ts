import { groupPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc } from "../firebase/firebase-service.js";

const getGroupsWhere = (companyId: string, domainId: string, condition: any) =>
  getDoc(groupPath(companyId, domainId, undefined as any), condition);
const getGroupMembers = (
  companyId: string,
  domainId: string,
  groupId: string
) => getDoc(groupPath(companyId, domainId, groupId, "members"), null);
export default {
  ...createService(groupPath as any),
  getGroupsWhere,
  getGroupMembers,
};
