import { tokenPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc } from "../firebase/firebase-service.js";

const getRevokedToken = (deviceId: string, token: string) =>
  getDoc(tokenPath(deviceId, token), ["status", "==", "revoked"]);

export default { ...createService(tokenPath as any), getRevokedToken };
