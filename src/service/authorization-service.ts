import { authPath } from "./remote-path-service.js";
import { createService } from "./service-factory.js";

export default createService(authPath as any);
