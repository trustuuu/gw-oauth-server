import userService from "../service/user-service.js";
import applicationService from "../service/application-service.js";
import authService from "../service/authorization-service.js";

let requests = {};
const authId = "authorization";
const appId = "application";
const apiId = "api";

export const authData = async () => {
  return await authService.getData(authId);
};

export const getUser = async (companyId, domainName, email) => {
  const users = await userService.getUserByEmail(companyId, domainName, email);
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

  if (appData.client_id == undefined) return null;

  return appData;
};
