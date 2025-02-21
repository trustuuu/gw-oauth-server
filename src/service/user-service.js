import { userPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { verifyUser, getDoc } from "../firebase/firebase-service.js";

const userVerification = (companyId, domainId, email, password) =>
  verifyUser(userPath(companyId, domainId), password, ["email", "==", email]);
const getUserByEmail = (companyId, domainId, email) =>
  getDoc(userPath(companyId, domainId), ["email", "==", email]);

export default { ...createService(userPath), userVerification, getUserByEmail };
