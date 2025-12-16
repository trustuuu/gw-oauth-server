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
const getUserPermissionScopes = (companyId, domainId, userId, condition) =>
  getDoc(userPath(companyId, domainId, userId, "PermissionScopes"), condition);
const getExternalIdentityAccounts = (
  companyId,
  domainId,
  userId,
  accountId,
  condition
) =>
  getDoc(
    accountId
      ? userPath(
          companyId,
          domainId,
          userId,
          "ExternalIdentityAccounts",
          accountId
        )
      : userPath(companyId, domainId, userId, "ExternalIdentityAccounts"),
    condition
  );
const getUserAppRoles = (companyId, domainId, userId, condition) =>
  getDoc(userPath(companyId, domainId, userId, "AppRoles"), condition);
const getUserRef = (email) => getUserFromRef(email);
const createAuthUser = (companyId, domainId, userId) =>
  addUserToAuth(userPath(companyId, domainId, userId));

// const userResetPassword = (companyId, domainId, email, password, newPassword) =>
//   verifyUser(userPath(companyId, domainId), password, ["email", "==", email]);
export default {
  ...createService(userPath),
  userVerification,
  getUserByEmail,
  getUsersWhere,
  getUserPermissionScopes,
  getExternalIdentityAccounts,
  getUserAppRoles,
  getUserRef,
  createAuthUser,
  // userResetPassword
};
