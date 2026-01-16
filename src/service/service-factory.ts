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

type PathFn = (...args: any[]) => string;

export const createService = (pathFn: PathFn) => {
  return {
    getPath: pathFn,
    getData: R.compose(getDoc, pathFn),
    getChildData: R.compose(geChildtDoc, pathFn),
    getDataCount: R.compose(getCollectionCount, pathFn),
    setData: (data: any, ...ids: any[]) =>
      setDoc(pathFn.apply(null, ids), data),
    addData: (data: any, ...ids: any[]) =>
      addDoc(pathFn.apply(null, ids), data),
    updateData: (data: any, ...ids: any[]) =>
      updateDoc(pathFn.apply(null, ids), data),
    deleteData: (data: any, ...ids: any[]) =>
      deleteDoc(pathFn.apply(null, ids), data),
    getDataByPath: (dataPath: string) => getDoc(dataPath),
    setDataByPath: (dataPath: string, data: any) => setDoc(dataPath, data),
    deleteDataByPath: (dataPath: string) => deleteDoc(dataPath, undefined!),
  };
};
