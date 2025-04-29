import { userPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import {
  verifyUser,
  getDoc,
  getUserFromRef,
  addUserToAuth,
} from "../firebase/firebase-service.js";

const userVerification = (companyId, domainId, email, password) =>
  verifyUser(userPath(companyId, domainId), password, ["email", "==", email]);
const getUserByEmail = (companyId, domainId, email) =>
  getDoc(userPath(companyId, domainId), ["email", "==", email]);
const getUsersWhere = (companyId, domainId, condition) =>
  getDoc(userPath(companyId, domainId), condition);
const getUserPermissionScopes = (companyId, domainId, userId) =>
  getDoc(userPath(companyId, domainId, userId, "PermissionScopes"), null);
const getUserRef = (email) => getUserFromRef(email);
const createAuthUser = (companyId, domainId, userId) =>
  addUserToAuth(userPath(companyId, domainId, userId));
export default {
  ...createService(userPath),
  userVerification,
  getUserByEmail,
  getUsersWhere,
  getUserPermissionScopes,
  getUserRef,
  createAuthUser,
};
