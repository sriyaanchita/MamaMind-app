
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";
// IMPORTANT: Change this import path if your firebase.ts
// is stored in a different folder.

export async function saveCloudSection(
  section: string,
  data: unknown
): Promise<void> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please log in before saving cloud data.");
  }

  await setDoc(
    doc(db, "users", user.uid),
    {
      [section]: data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function loadCloudSection<T = unknown>(
  section: string
): Promise<T | null> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please log in before loading cloud data.");
  }

  const snapshot = await getDoc(
    doc(db, "users", user.uid)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return (snapshot.data()[section] as T) ?? null;
}
