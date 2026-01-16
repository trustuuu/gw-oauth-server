import { userPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import {
  verifyUser,
  getDoc,
  getUserFromRef as getUserFromRefFirebase,
  addUserToAuth,
} from "../firebase/firebase-service.js";

const userVerification = (
  companyId: string,
  domainId: string,
  email: string,
  password: string
) =>
  verifyUser(userPath(companyId, domainId), password, ["email", "==", email]);
const getUserByEmail = (companyId: string, domainId: string, email: string) =>
  getDoc(userPath(companyId, domainId), ["email", "==", email]);
const getUsersWhere = (companyId: string, domainId: string, condition: any) =>
  getDoc(userPath(companyId, domainId), condition);
const getUserPermissionScopes = (
  companyId: string,
  domainId: string,
  userId: string,
  condition?: any
) =>
  getDoc(userPath(companyId, domainId, userId, "PermissionScopes"), condition);
const getExternalIdentityAccounts = (
  companyId: string,
  domainId: string,
  userId: string,
  accountId?: string,
  condition?: any
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
const getUserAppRoles = (
  companyId: string,
  domainId: string,
  userId: string,
  condition?: any
) => getDoc(userPath(companyId, domainId, userId, "AppRoles"), condition);
const getUserRef = (email: string) => getUserFromRefFirebase(email);
const createAuthUser = (companyId: string, domainId: string, userId: string) =>
  addUserToAuth(
    userPath(companyId, domainId, userId),
    companyId,
    domainId,
    userId
  );

// const userResetPassword = (companyId, domainId, email, password, newPassword) =>
//   verifyUser(userPath(companyId, domainId), password, ["email", "==", email]);
export default {
  ...createService(userPath as any),
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
