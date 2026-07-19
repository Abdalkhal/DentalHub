import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { app } from "./config";

const _auth = getAuth(app);
const _db = getFirestore(app);
const _storage = getStorage(app);

export const auth = _auth;
export const db = _db;
export const storage = _storage;
