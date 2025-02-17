import * as R from "ramda";
import {
  getDoc,
  geChildtDoc,
  getCollectionCount,
  setDoc,
  updateDoc,
  deleteDoc,
} from "../firebase/firebase-service.js";

export const createService = (pathFn) => {
  return {
    getPath: pathFn,
    getData: R.compose(getDoc, pathFn),
    getChildData: R.compose(geChildtDoc, pathFn),
    getDataCount: R.compose(getCollectionCount, pathFn),
    setData: (data, ...ids) => setDoc(pathFn.apply(null, ids), data),
    updateData: (data, ...ids) => updateDoc(pathFn.apply(null, ids), data),
    deleteData: (data, ...ids) => deleteDoc(pathFn.apply(null, ids)),
    getDataByPath: (dataPath) => getDoc(dataPath),
    setDataByPath: (dataPath, data) => setDoc(dataPath, data),
    deleteDataByPath: (dataPath) => deleteDoc(dataPath),
  };
};
