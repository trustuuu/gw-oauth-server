import * as R from "ramda";
//const { default: R } = await import("ramda");
import { accountPath } from "./remote-path-service.js";
import { getDoc } from "../firebase/firebase-service.js";
import { createService } from "./service-factory.js";

const getCompanyId = (email) =>
  getDoc(accountPath(email)).then(R.prop("companyId"));

export default { ...createService(accountPath), getCompanyId };
