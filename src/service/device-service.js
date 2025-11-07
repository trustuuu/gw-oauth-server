import { AUTH_PATH, devicePath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc } from "../firebase/firebase-service.js";

const getUserDevice = async (UserCode) =>
  await getDoc(devicePath(AUTH_PATH), ["user_code", "==", UserCode]);

export default { ...createService(devicePath), getUserDevice };
