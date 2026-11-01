import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

export type FirestoreCommunityPost = {
  id: string;
  userId: string;
  name: string;
  text: string;
  supportCount: number;
  replyCount: number;
  createdAt: any;
};

const POSTS_COLLECTION = "communityPosts";

function getCurrentUserId() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User is not logged in.");
  }

  return user.uid;
}

function getCurrentUserName() {
  const user = auth.currentUser;

  if (!user) {
    return "Mama";
  }

  if (user.displayName?.trim()) {
    return user.displayName.trim();
  }

  if (user.email) {
    return user.email.split("@")[0];
  }

  return "Mama";
}

/* --------------------------------------------------
   CREATE POST
-------------------------------------------------- */

export async function createCommunityPost(text: string) {
  const userId = getCurrentUserId();

  const cleanText = text.trim();

  if (!cleanText) {
    throw new Error("Post cannot be empty.");
  }

  const postRef = await addDoc(
    collection(db, POSTS_COLLECTION),
    {
      userId,
      name: getCurrentUserName(),
      text: cleanText,
      supportCount: 0,
      replyCount: 0,
      createdAt: serverTimestamp(),
    }
  );

  return postRef.id;
}

/* --------------------------------------------------
   REAL-TIME POSTS
-------------------------------------------------- */

export function subscribeToCommunityPosts(
  callback: (posts: FirestoreCommunityPost[]) => void
) {
  const postsQuery = query(
    collection(db, POSTS_COLLECTION),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  return onSnapshot(
    postsQuery,
    (snapshot) => {
      const posts: FirestoreCommunityPost[] =
        snapshot.docs.map((document) => {
          const data = document.data();

          return {
            id: document.id,
            userId: data.userId || "",
            name: data.name || "Mama",
            text: data.text || "",
            supportCount: data.supportCount || 0,
            replyCount: data.replyCount || 0,
            createdAt: data.createdAt,
          };
        });

      callback(posts);
    },
    
    
(error) => {
  console.error("Community subscription error code:", error.code);
  console.error("Community subscription error message:", error.message);
}

  );
}

/* --------------------------------------------------
   SUPPORT / UNSUPPORT
-------------------------------------------------- */

export async function toggleCommunitySupport(
  postId: string
) {
  const userId = getCurrentUserId();

  const postRef = doc(
    db,
    POSTS_COLLECTION,
    postId
  );

  const supportRef = doc(
    db,
    POSTS_COLLECTION,
    postId,
    "supports",
    userId
  );

  await runTransaction(db, async (transaction) => {
    const supportSnapshot =
      await transaction.get(supportRef);

    if (supportSnapshot.exists()) {
      transaction.delete(supportRef);

      transaction.update(postRef, {
        supportCount: increment(-1),
      });
    } else {
      transaction.set(supportRef, {
        userId,
        createdAt: serverTimestamp(),
      });

      transaction.update(postRef, {
        supportCount: increment(1),
      });
    }
  });
}

/* --------------------------------------------------
   CHECK IF CURRENT USER SUPPORTED POST
-------------------------------------------------- */

export async function hasSupportedPost(
  postId: string
) {
  const userId = getCurrentUserId();

  const supportRef = doc(
    db,
    POSTS_COLLECTION,
    postId,
    "supports",
    userId
  );

  const snapshot = await getDoc(supportRef);

  return snapshot.exists();
}

/* --------------------------------------------------
   ADD REPLY
-------------------------------------------------- */

export async function addCommunityReply(
  postId: string,
  text: string
) {
  const userId = getCurrentUserId();

  const cleanText = text.trim();

  if (!cleanText) {
    throw new Error("Reply cannot be empty.");
  }

  const postRef = doc(
    db,
    POSTS_COLLECTION,
    postId
  );

  await addDoc(
    collection(
      db,
      POSTS_COLLECTION,
      postId,
      "replies"
    ),
    {
      userId,
      name: getCurrentUserName(),
      text: cleanText,
      createdAt: serverTimestamp(),
    }
  );

  await updateDoc(postRef, {
    replyCount: increment(1),
  });
}