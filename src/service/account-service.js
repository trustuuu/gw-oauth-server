import * as R from "ramda";
//const { default: R } = await import("ramda");
import { accountPath } from "./remote-path-service.js";
import { getDoc } from "../firebase/firebase-service.js";

const getCompanyId = (email) =>
  getDoc(accountPath(email)).then(R.prop("companyId"));

export default { getCompanyId };
