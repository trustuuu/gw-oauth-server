import * as R from "ramda";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import admin from "firebase-admin";
import "firebase/functions";
import md5 from "blueimp-md5";
import serviceAccount from "./firebase-account.js";
import { ntlmV1HashHex } from "../helper/secureWin.js";

export function init() {
  firebase.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

export function login(user, password) {
  return auth().signInWithEmailAndPassword(user, password);
}

export function logout() {
  return auth().signOut();
}

export function auth() {
  return firebase.auth();
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

export async function getDoc(path, whereArgs) {
  const [collectionPath, docName] = getCollectionPathAndDocId(path);
  let ref = db().collection(collectionPath);
  if (docName) {
    return ref.doc(docName).get().then(toObject);
  }

  const applyAllWhereArgs = () => {
    return whereArgs.reduce((acc, cur) => {
      acc = acc.where.apply(acc, cur);
      return acc;
    }, ref);
  };

  const res =
    whereArgs && whereArgs.length > 0
      ? Array.isArray(whereArgs[0])
        ? await applyAllWhereArgs().get()
        : await ref.where.apply(ref, whereArgs).get()
      : await ref.get();
  return res.docs.map(toObject);
}

function extractCompanyAndDomain(path) {
  const segments = path.split("/");

  const companyIdIndex = segments.indexOf("companys") + 1;
  const domainIdIndex = segments.indexOf("domainNames") + 1;

  const companyId = segments[companyIdIndex];
  const domainId = segments[domainIdIndex];
  return { companyId, domainId };
}

export async function getUserFromRef(email) {
  if (email) {
    const userRef = await getDoc(`accounts/${email}`);
    if ("ref" in userRef) {
      const parent = extractCompanyAndDomain(userRef.ref.path);
      return { ...toObject(await userRef.ref.get()), ...parent };
    } else {
      return null;
    }
  }
}

export async function addUserToAuth(path) {
  if (path) {
    const userRef = await getDocByPath(path);
    const user = await userRef.get();
    if ("email" in user.data()) {
      return await setDoc(`accounts/${user.data().email}`, {
        ref: userRef,
      });
    } else {
      return null;
    }
  }
}

export function getDocByPath(path) {
  return db().doc(path);
}

export async function geChildtDoc(path) {
  return await getDoc(path, null);
}

export function getCollectionCount(path) {
  return db()
    .collection(path)
    .get()
    .then((res) => res.size);
}

export async function getDownloadUrl(path) {
  const ref = await getStorageRef(path);
  const url = await ref.getDownloadURL();
  return url;
}

export async function upload(path, blob, metadata) {
  const ref = await getStorageRef(path);
  return await ref.put(blob, metadata);
}

export async function uploadString(path, message, messageType) {
  const ref = await getStorageRef(path);
  return await ref.putString(message, messageType);
}

export async function getStorageRef(path) {
  return firebase.storage().ref(path);
}

export function setDoc(path, data) {
  if (data.$ref) {
    data = { ...data, $ref: getDocByPath(data.$ref) };
  }
  return db().doc(path).set(data);
}

export function addDoc(path, data) {
  return db().collection(path).add(data);
}

export function updateDoc(path, data) {
  return db().doc(path).update(data);
}

export function recursiveDeleteDoc(path) {
  const deleteFn = firebase.functions().httpsCallable("recursiveDelete");
  return deleteFn({ path, currentUsers: getUid() });
}

export function deleteDoc(path, id) {
  const arr = path.split("/");
  if ((!id || R.isEmpty(id)) && isEven(arr.length)) {
    path = R.init(arr).join("/");
    id = R.last(arr);
  }
  return db().collection(path).doc(id).delete();
}

export async function verifyUser(path, password, whereArgs) {
  const users = await getDoc(path, whereArgs);

  let user = null;
  let successLogin = false;
  if (users.length == 1) {
    const user = users[0];
    if (user.authVerification.startsWith("NTLM")) {
      if (user.authVerification.slice(4) == ntlmV1HashHex(password))
        successLogin = true;
    } else {
      if (user.authVerification == md5(password)) successLogin = true;
    }
    // if (successLogin) {
    //   const qrImageUrl = await getQRCodeImageUrl(
    //     path,
    //     user.email,
    //     "JBSWY3DPEHPK3PXP"
    //   );
    //   console.log("path, user, qrImageUrl", path, user, qrImageUrl);
    // }
  }

  return { user, verified: successLogin };
}

function db() {
  return firebase.firestore();
}

function getUid() {
  return auth().currentUser.uid;
}

function isEven(num) {
  return num % 2 === 0;
}

// function toObject(fbReturn) {
//   if (!fbReturn.exists) {
//     console.log("no exist");
//     return null;
//   }
//   return { id: fbReturn.id, ...fbReturn.data() };
// }

function toObject(fbReturn) {
  //console.log("fbReturn.data()", fbReturn.data());
  return { id: fbReturn.id, ...fbReturn.data() };
}

function getCollectionPathAndDocId(path) {
  const arr = path.split("/");

  if (isEven(arr.length)) {
    return [R.init(arr).join("/"), R.last(arr)];
  }

  return [path];
}
