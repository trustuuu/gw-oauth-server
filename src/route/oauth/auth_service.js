import userService from "../../service/user-service.js";
import companyService from "../../service/company-service.js";
import applicationService from "../../service/application-service.js";
import authService from "../../service/authorization-service.js";
import md5 from "blueimp-md5";
import { generateId } from "../../service/remote-path-service.js";
import domainService from "../../service/domain-service.js";

const authId = "authorization";
const appId = "application";

export const authData = async () => {
  return await authService.getData(authId);
};

export const getUserRef = async (email) => {
  const user = await userService.getUserRef(email);
  console.log("user", user, email);
  if (user && user.session) {
    delete user.session;
  }
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
  appData.PermissionScopes = appPermissionData.map((p) => p.permission);
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

export const SignUpCompany = async (comapnyData) => {
  const newName = comapnyData.name.replace(/\s+/g, "");
  const data = {
    ...comapnyData,
    name: newName,
    id: `${newName}-${crypto.randomUUID()}`,
    whenCreated: new Date(),
    status: "New",
  };
  const company = await companyService.getCompanyByName(data.name);
  if (company.length > 0) {
    throw new Error("company exists");
  }
  await companyService.setData.apply(companyService, [data].concat([data.id]));
  return data;
};
export const SignUpDomain = async (companyId, domainData) => {
  const data = {
    ...domainData,
    id: domainData.name,
    whenCreated: new Date(),
    status: "New",
  };
  const domain = await domainService.getDomainByName(companyId, data.name);
  if (domain.length > 0) {
    throw Error("Domain exists");
  }
  await domainService.setData.apply(
    domainService,
    [data].concat([companyId, data.id])
  );
  return data;
};
export const SignUpUser = async (companyId, domainId, userData) => {
  const data = {
    ...userData,
    id: generateId(userData.username),
    authVerification: md5(userData.authVerification),
    whenCreated: new Date(),
    status: "new",
  };

  const user = await userService.getUserByEmail(
    companyId,
    domainId,
    data.email
  );
  if (user.length > 0) {
    console.log("user exist", user);
    throw Error("User exists");
  }
  await userService.setData.apply(
    userService,
    [data].concat([companyId, domainId, data.id])
  );
  if ("root" in data) {
    await createAuthUser(companyId, domainId, data.id);
  }

  return data;
};
