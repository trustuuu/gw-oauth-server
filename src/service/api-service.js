import { apiPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc } from "../firebase/firebase-service.js";

const getApiByIdentifier = (authId, identifier) =>
  getDoc(`${apiPath(authId, "")}`, ["identifier", "==", identifier]);

export default { ...createService(apiPath), getApiByIdentifier };
