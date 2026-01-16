import { AUTH_PATH, devicePath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";
import { getDoc } from "../firebase/firebase-service.js";

const getUserDevice = async (UserCode: string) =>
  await getDoc(devicePath(AUTH_PATH, undefined as any), [
    "user_code",
    "==",
    UserCode,
  ]);

export default { ...createService(devicePath as any), getUserDevice };
