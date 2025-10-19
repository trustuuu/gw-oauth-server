import { tokenPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc } from "../firebase/firebase-service.js";

const getRefreshToken = (companyId, domainId, userId, condition) =>
  getDoc(tokenPath(companyId, domainId, userId, "RefreshTokens"), condition);

export default { ...createService(tokenPath), getRefreshToken };
