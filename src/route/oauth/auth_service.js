import userService from "../../service/user-service.js";
import applicationService from "../../service/application-service.js";
import authService from "../../service/authorization-service.js";

const authId = "authorization";
const appId = "application";

export const authData = async () => {
  return await authService.getData(authId);
};

export const getUserRef = async (email) => {
  const user = await userService.getUserRef(email);
  if (user.session) delete user.session;
  return user;
};

export const createAuthUser = async (companyId, domainId, userId) => {
  await userService.createAuthUser(companyId, domainId, userId);
};

export const getUser = async (companyId, domainName, email) => {
  const users = await userService.getUserByEmail(companyId, domainName, email);
  let user = null;
  if (users.length == 1) {
    user = users[0];
    if (user.session) delete user.session;
  }

  return user;
};

export const getUserAppRoles = async (
  companyId,
  domainName,
  email,
  condition
) => {
  const users = await userService.getUserAppRoles(
    companyId,
    domainName,
    email,
    condition
  );
  let user = null;
  if (users.length == 1) {
    user = users[0];
  }

  return user;
};

export const getUserById = async (companyId, domainName, userId) => {
  const users = await userService.getUsersWhere(companyId, domainName, [
    "id",
    "==",
    userId,
  ]);
  let user = null;
  if (users.length == 1) {
    user = users[0];
  }

  return user;
};

export const verifyUser = async (companyId, domainName, email, password) => {
  const isVerified = await userService.userVerification(
    companyId,
    domainName,
    email,
    password
  );

  return isVerified;
};

export const getClient = async (clientId) => {
  let appData = await applicationService.getData(appId, clientId);
  let appPermissionData =
    await applicationService.getApplicationPermissionScopes(appId, clientId);
  console.log("appPermissionData", appPermissionData);
  appData.PermissionScopes = appPermissionData.map((p) => p.permission);
  console.log("appData", appData);
  if (appData.client_id == undefined) return null;

  return appData;
};

export const saveTokenToDB = async (data) => {
  const { companyId, domainId, accessToken, userId, sessionId } = data;
  await userService.updateData.apply(
    userService,
    [{ session: { sessionId, accessToken } }].concat([
      companyId,
      domainId,
      userId,
    ])
  );
};
