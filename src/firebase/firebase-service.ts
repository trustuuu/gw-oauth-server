import * as R from "ramda";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/auth";
import "firebase/compat/storage";
import "firebase/compat/functions";
import admin from "firebase-admin";
import md5 from "blueimp-md5";
import serviceAccount from "./firebase-account.js";
import { ntlmV1HashHex } from "../helper/secureWin.js";

// Note: Ensure types for firebase and firebase-admin are available.
// firebase package usually has types.

export function init() {
  if (!(firebase as any).apps.length) {
    (firebase as any).initializeApp({
      // @ts-ignore: Mixing types between admin and client sdk often causes issues.
      // The pattern used here passes admin credentials to client SDK, which is aggressive.
      credential: admin.credential.cert(serviceAccount as any),
      projectId: serviceAccount.project_id,
    });
  }
}

export function login(user: string, password: string) {
  return auth().signInWithEmailAndPassword(user, password);
}

export function logout() {
  return auth().signOut();
}

export function auth() {
  return (firebase as any).auth();
}

export function getAuthUser() {
  return auth().currentUser;
}

// function isMultiDimensionalArray(arr) {
//   // Check if the variable is an array
//   if (Array.isArray(arr)) {
//     // Check if any element of the array is also an array
//     return arr.some((item) => Array.isArray(item));
//   }
//   return false; // Not an array
// }

// function applyConditions(query, conditions) {
//   if (isMultiDimensionalArray(conditions)) {
//     conditions.forEach(
//       (condition) => (query = query.where.apply(query, condition))
//     );
//   } else {
//     query = query.where.apply(query, conditions);
//   }
//   return query;
// }

export async function getDoc(path: string, whereArgs?: any[] | null) {
  const [collectionPath, docName] = getCollectionPathAndDocId(path);
  let ref: any = db().collection(collectionPath);
  if (docName) {
    return ref.doc(docName).get().then(toObject);
  }
  console.log(
    "collectionPath, docName, whereArgs",
    collectionPath,
    docName,
    whereArgs
  );
  //   const applyAllWhereArgs = () => {
  //     return (whereArgs || []).reduce((acc: any, cur: any) => {
  //       acc = acc.where.apply(acc, cur);
  //       return acc;
  //     }, ref);
  //   };
  const applyAllWhereArgs = () => {
    return (whereArgs || []).reduce((acc: any, cur: any) => {
      // cur[0] is the field name passed by the user/UI
      let [field, operator, value] = cur;

      // Translate the field to the correct case using the map
      // If not in map, fallback to the original field
      const correctedField = FIELD_MAP[field.toLowerCase()] || field;

      return acc.where(correctedField, operator, value);
    }, ref);
  };

  const res =
    whereArgs && whereArgs.length > 0
      ? Array.isArray(whereArgs[0])
        ? await applyAllWhereArgs().get()
        : await ref.where.apply(ref, whereArgs as any).get()
      : await ref.get();
  return res.docs.map(toObject);
}

function extractCompanyAndDomain(path: string) {
  const segments = path.split("/");

  const companyIdIndex = segments.indexOf("companys") + 1;
  const domainIdIndex = segments.indexOf("domainNames") + 1;

  const companyId = segments[companyIdIndex];
  const domainId = segments[domainIdIndex];
  return { companyId, domainId };
}

export async function getUserFromRef(email: string) {
  if (email) {
    const userRef: any = await getDoc(`accounts/${email}`);
    if ("ref" in userRef) {
      const parent = extractCompanyAndDomain(userRef.ref.path);
      return { ...toObject(await userRef.ref.get()), ...parent };
    } else {
      return null;
    }
  }
  return null;
}

export async function addUserToAuth(
  path: string,
  companyId?: string,
  domainId?: string,
  userId?: string
) {
  if (path) {
    const userRef: any = await getDocByPath(path);
    const user = await userRef.get();
    if ("email" in user.data()) {
      return await setDoc(`accounts/${user.data().email}`, {
        ref: userRef,
        ...(companyId !== undefined && { companyId }),
        ...(domainId !== undefined && { domainId }),
        ...(userId !== undefined && { userId }),
      });
    } else {
      return null;
    }
  }
}

export function getDocByPath(path: string) {
  return db().doc(path);
}

export async function geChildtDoc(path: string) {
  return await getDoc(path, null);
}

export function getCollectionCount(path: string) {
  return db()
    .collection(path)
    .get()
    .then((res) => res.size);
}

export async function getDownloadUrl(path: string) {
  const ref = await getStorageRef(path);
  const url = await ref.getDownloadURL();
  return url;
}

export async function upload(path: string, blob: any, metadata: any) {
  const ref = await getStorageRef(path);
  return await ref.put(blob, metadata);
}

export async function uploadString(
  path: string,
  message: string,
  messageType: any
) {
  const ref = await getStorageRef(path);
  return await ref.putString(message, messageType);
}

export async function getStorageRef(path: string) {
  return (firebase as any).storage().ref(path);
}

export function setDoc(path: string, data: any) {
  let correctedData = normalizeDataKeys(data);
  if (correctedData.$ref) {
    correctedData = {
      ...correctedData,
      $ref: getDocByPath(correctedData.$ref),
    };
  }
  console.log("correctedData", correctedData);
  return db().doc(path).set(correctedData);
}

export function addDoc(path: string, data: any) {
  const correctedData = normalizeDataKeys(data);
  return db().collection(path).add(correctedData);
}

export function updateDoc(path: string, data: any) {
  const correctedData = normalizeDataKeys(data);
  return db().doc(path).update(correctedData);
}

export function recursiveDeleteDoc(path: string) {
  const deleteFn = (firebase as any)
    .functions()
    .httpsCallable("recursiveDelete");
  return deleteFn({ path, currentUsers: getUid() });
}

export function deleteDoc(path: string, id: string) {
  const arr = path.split("/");
  if ((!id || R.isEmpty(id)) && isEven(arr.length)) {
    path = R.init(arr).join("/");
    id = R.last(arr)!;
  }
  return db().collection(path).doc(id).delete();
}

export async function verifyUser(
  path: string,
  password: string,
  whereArgs?: any
) {
  const users = await getDoc(path, whereArgs);

  let user = null;
  let successLogin = false;
  if (users.length == 1) {
    user = users[0];
    if (user.authVerification && user.authVerification.startsWith("NTLM")) {
      if (user.authVerification.slice(4) == ntlmV1HashHex(password))
        successLogin = true;
    } else {
      if (user.authVerification == md5(password)) successLogin = true;
    }
  }

  return { user, verified: successLogin };
}

function db() {
  return (firebase as any).firestore();
}

function getUid() {
  const currentUser = auth().currentUser;
  return currentUser ? currentUser.uid : null;
}

function isEven(num: number) {
  return num % 2 === 0;
}

function toObject(fbReturn: any) {
  // if fbReturn is a DocumentSnapshot
  return { id: fbReturn.id, ...(fbReturn.data ? fbReturn.data() : fbReturn) };
}

function getCollectionPathAndDocId(path: string) {
  const arr = path.split("/");

  if (isEven(arr.length)) {
    return [R.init(arr).join("/"), R.last(arr)];
  }

  return [path];
}

/**
 * Recursively maps JSON keys to the correct casing based on USER_FIELD_MAP
 */
export const normalizeDataKeys = (data: any): any => {
  // 1. Handle Arrays (e.g., addresses, emails)
  if (Array.isArray(data)) {
    return data.map((item) => normalizeDataKeys(item));
  }

  // 2. Handle Objects
  if (data !== null && typeof data === "object" && !(data instanceof Date)) {
    const normalizedObj: Record<string, any> = {};

    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        // Find the "official" key from the map, or keep the original
        const correctedKey = FIELD_MAP[key.toLowerCase()] || key;

        // Recursively clean the value (in case it's a nested object/array)
        normalizedObj[correctedKey] = normalizeDataKeys(data[key]);
      }
    }
    return normalizedObj;
  }

  // 3. Return primitives as-is
  return data;
};

export const FIELD_MAP: Record<string, string> = {
  id: "id",
  password: "password",
  username: "userName",
  displayname: "displayName",
  email: "email",
  nickname: "nickName",
  usertype: "userType",
  preferredlanguage: "preferredLanguage",
  active: "active",
  status: "status",
  enterpriseextension: "enterpriseExtension",
  whencreated: "whenCreated",
  whenupdated: "whenUpdated",
  // Nested fields (if you query them using dot notation)
  "name.givenname": "name.givenName",
  "name.familyname": "name.familyName",

  addresses: "addresses",

  // Address Object Properties (for both single objects and array filtering)
  "addresses.streetaddress": "addresses.streetAddress",
  "addresses.locality": "addresses.locality",
  "addresses.region": "addresses.region",
  "addresses.postalcode": "addresses.postalCode",
  "addresses.country": "addresses.country",
  "addresses.type": "addresses.type",
  "addresses.primary": "addresses.primary",
  "addresses.formatted": "addresses.formatted",

  // Common shorthand if you allow querying without the 'addresses.' prefix
  streetaddress: "streetAddress",
  locality: "locality",
  region: "region",
  postalcode: "postalCode",
  country: "country",

  "enterpriseextension.employeenumber": "enterpriseExtension.employeeNumber",
  "enterpriseextension.department": "enterpriseExtension.department",
  "enterpriseextension.costcenter": "enterpriseExtension.costCenter",
  "enterpriseextension.division": "enterpriseExtension.division",
  "enterpriseextension.manager": "enterpriseExtension.manager",
  "enterpriseextension.organization": "enterpriseExtension.organization",
  name: "name",
  notes: "notes",
  // GroupMember Properties (Direct)
  members: "members",
  // Nested GroupMember Properties (for dot-notation queries)
  "members.value": "members.value",
  "members.type": "members.type",
  "members.$ref": "members.$ref",
  "members.whenupdated": "members.whenUpdated",
};
