import * as R from "ramda";
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import admin from "firebase-admin";
import "firebase/functions";
import serviceAccount from "./firebase-account.js";
import md5 from "blueimp-md5";

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

export async function getDoc(path, whereArgs) {
  const pathes = R.split("/", path);
  let docName = null;

  if (isEven(pathes.length)) {
    path = R.init(pathes).join("/");
    docName = R.last(pathes);
  }

  let ref = db().collection(path);
  if (docName) {
    return ref.doc(docName).get().then(toObject);
  }

  const res = whereArgs
    ? await ref.where.apply(ref, whereArgs).get()
    : await ref.get();
  return res.docs.map(toObject);
}

export function getDocRef(path) {
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

  if (!id && isEven(arr.length)) {
    path = R.init(arr).join("/");
    id = R.last(arr);
  }
  return db().collection(path).doc(id).delete();
}

export async function verifyUser(path, password, whereArgs) {
  const users = await getDoc(path, whereArgs);

  if (users.length == 1) {
    const user = users[0];

    if (user.authVerification == md5(password)) return true;
  }
  return false;
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

function toObject(fbReturn) {
  return { id: fbReturn.id, ...fbReturn.data() };
}

function getCollectionPathAndDocId(path) {
  const arr = path.split("/");

  if (isEven(arr.length)) {
    return [R.init(arr).join("/"), R.last(arr)];
  }

  return [path];
}
