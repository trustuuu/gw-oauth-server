import { tokenPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc } from "../firebase/firebase-service.js";
const getRevokedToken = (deviceId, token) => getDoc(tokenPath(deviceId, token), ["status", "==", "revoked"]);
export default { ...createService(tokenPath), getRevokedToken };
