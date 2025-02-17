import { applicationPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc } from "../firebase/firebase-service.js";

const getRedirectURIs = (authId, appid) =>
  getDoc(`${applicationPath(authId, appid)}/redirect_uris`, null);

export default { ...createService(applicationPath), getRedirectURIs };
