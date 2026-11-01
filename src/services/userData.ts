
import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";

import { auth, db } from "./firebase";

// Save data under the currently logged-in user's UID.
export async function saveUserData(
  section: string,
  data: Record<string, unknown>
) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please log in before saving data.");
  }

  const userRef = doc(db, "users", user.uid);

  await setDoc(
    userRef,
    {
      [section]: data,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

// Load data for the currently logged-in user.
export async function loadUserData(section: string) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please log in before loading data.");
  }

  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data()[section] ?? null;
}

// Listen for changes to a user's data in real time.
export function listenToUserData(
  section: string,
  onData: (data: unknown) => void,
  onError?: (error: Error) => void
) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please log in before listening for data.");
  }

  const userRef = doc(db, "users", user.uid);

  return onSnapshot(
    userRef,
    (snapshot) => {
      onData(
        snapshot.exists()
          ? snapshot.data()[section] ?? null
          : null
      );
    },
    (error) => onError?.(error)
  );
}
