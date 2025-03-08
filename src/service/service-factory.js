import * as R from "ramda";
//const { default: R } = await import("ramda");
import {
  getDoc,
  geChildtDoc,
  getCollectionCount,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
} from "../firebase/firebase-service.js";

export const createService = (pathFn) => {
  console.log("pathFn", pathFn, pathFn());
  return {
    getPath: pathFn,
    getData: R.compose(getDoc, pathFn),
    getChildData: R.compose(geChildtDoc, pathFn),
    getDataCount: R.compose(getCollectionCount, pathFn),
    setData: (data, ...ids) => setDoc(pathFn.apply(null, ids), data),
    addData: (data, ...ids) => addDoc(pathFn.apply(null, ids), data),
    updateData: (data, ...ids) => updateDoc(pathFn.apply(null, ids), data),
    deleteData: (data, ...ids) => deleteDoc(pathFn.apply(null, ids), data),
    getDataByPath: (dataPath) => getDoc(dataPath),
    setDataByPath: (dataPath, data) => setDoc(dataPath, data),
    deleteDataByPath: (dataPath) => deleteDoc(dataPath),
  };
};
