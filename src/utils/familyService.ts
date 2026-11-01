
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

export type FamilyRole = "mother" | "father";

export type FamilyConnection = {
  familyId: string;
  role: FamilyRole;
  inviteCode?: string;
};

const FAMILY_COLLECTION = "families";
const USER_COLLECTION = "users";
const INVITE_COLLECTION = "familyInvites";

function requireUser() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please log in before connecting your family.");
  }

  return user;
}

function makeInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

/**
 * Creates a family and a one-time invite code for the other parent.
 */
export async function createFamily(
  role: FamilyRole
): Promise<FamilyConnection> {
  const user = requireUser();

  const userRef = doc(db, USER_COLLECTION, user.uid);
  const existingUser = await getDoc(userRef);

  if (existingUser.exists() && existingUser.data().familyId) {
    throw new Error("You are already connected to a family.");
  }

  const familyRef = doc(collection(db, FAMILY_COLLECTION));

  // Retry if the randomly generated code already exists.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeInviteCode();
    const inviteRef = doc(db, INVITE_COLLECTION, code);

    try {
      await runTransaction(db, async (transaction) => {
        const [inviteSnapshot, userSnapshot] = await Promise.all([
          transaction.get(inviteRef),
          transaction.get(userRef),
        ]);

        if (inviteSnapshot.exists()) {
          throw new Error("CODE_COLLISION");
        }

        if (
          userSnapshot.exists() &&
          userSnapshot.data().familyId
        ) {
          throw new Error("You are already connected to a family.");
        }

        transaction.set(familyRef, {
          createdBy: user.uid,
          members: [user.uid],
          roles: { [user.uid]: role },
          createdAt: serverTimestamp(),
        });

        transaction.set(userRef, {
          familyId: familyRef.id,
          role,
          updatedAt: serverTimestamp(),
        }, { merge: true });

        transaction.set(inviteRef, {
          familyId: familyRef.id,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
          usedBy: null,
        });
      });

      return {
        familyId: familyRef.id,
        role,
        inviteCode: code,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "CODE_COLLISION"
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Could not create an invite code. Please try again.");
}

/**
 * Joins a family using its invite code.
 */
export async function joinFamilyWithCode(
  rawCode: string,
  role: FamilyRole
): Promise<FamilyConnection> {
  const user = requireUser();
  const code = rawCode.trim().toUpperCase();

  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
    throw new Error("Enter a valid 6-character invite code.");
  }

  const userRef = doc(db, USER_COLLECTION, user.uid);
  const inviteRef = doc(db, INVITE_COLLECTION, code);

  return runTransaction(db, async (transaction) => {
    const [inviteSnapshot, userSnapshot] = await Promise.all([
      transaction.get(inviteRef),
      transaction.get(userRef),
    ]);

    if (!inviteSnapshot.exists()) {
      throw new Error("Invite code not found.");
    }

    if (
      userSnapshot.exists() &&
      userSnapshot.data().familyId
    ) {
      throw new Error("You are already connected to a family.");
    }

    const invite = inviteSnapshot.data();

    if (invite.usedBy) {
      throw new Error("This invite code has already been used.");
    }

    if (Date.now() > invite.expiresAt) {
      throw new Error("This invite code has expired. Ask for a new one.");
    }

    if (invite.createdBy === user.uid) {
      throw new Error("Use the invite code from the other parent's account.");
    }

    const familyRef = doc(
      db,
      FAMILY_COLLECTION,
      invite.familyId
    );

    const familySnapshot = await transaction.get(familyRef);

    if (!familySnapshot.exists()) {
      throw new Error("Family not found.");
    }

    const family = familySnapshot.data();
    const members: string[] = family.members || [];

    if (members.length >= 2) {
      throw new Error("This family already has two members.");
    }

    const creatorRole = family.roles?.[invite.createdBy];

    if (creatorRole === role) {
      throw new Error(
        "Choose the other parent's role to complete the connection."
      );
    }

    transaction.update(familyRef, {
      members: [...members, user.uid],
      [`roles.${user.uid}`]: role,
    });

    transaction.set(userRef, {
      familyId: invite.familyId,
      role,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    transaction.update(inviteRef, {
      usedBy: user.uid,
      usedAt: serverTimestamp(),
    });

    return {
      familyId: invite.familyId,
      role,
    };
  });
}

/**
 * Gets the signed-in user's family membership.
 */
export async function getMyFamily(): Promise<FamilyConnection | null> {
  const user = requireUser();
  const userRef = doc(db, USER_COLLECTION, user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();

  if (!data.familyId || !data.role) {
    return null;
  }

  return {
    familyId: data.familyId,
    role: data.role,
  };
}