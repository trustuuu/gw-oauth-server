import { authCodePath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";

export default createService(authCodePath as any);
