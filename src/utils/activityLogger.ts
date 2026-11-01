
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../services/firebase";

const ACTIVITY_KEY = "mamamind_daily_activities";

export type ActivityType =
  | "baby_care"
  | "meditation"
  | "self_care"
  | "break"
  | "medication"
  | "mood"
  | "walking"
  | "wearable_reading"
  | "voice_input";

export type Activity = {
  id: string;
  type: ActivityType;
  timestamp: string;
  metadata?: Record<string, any>;
};

function getCloudActivitiesCollection() {
  const user = auth.currentUser;

  if (!user) {
    return null;
  }

  return collection(db, "users", user.uid, "activities");
}

async function getLocalActivities(): Promise<Activity[]> {
  try {
    const existing = await AsyncStorage.getItem(ACTIVITY_KEY);
    return existing ? JSON.parse(existing) : [];
  } catch (error) {
    console.error("Failed to read local activities:", error);
    return [];
  }
}

async function saveLocalActivities(activities: Activity[]) {
  await AsyncStorage.setItem(
    ACTIVITY_KEY,
    JSON.stringify(activities)
  );
}

function mergeActivities(
  localActivities: Activity[],
  cloudActivities: Activity[]
): Activity[] {
  const byId = new Map<string, Activity>();

  for (const activity of localActivities) {
    byId.set(activity.id, activity);
  }

  for (const activity of cloudActivities) {
    // Cloud copy takes priority if the same ID exists.
    byId.set(activity.id, activity);
  }

  return Array.from(byId.values()).sort(
    (a, b) =>
      new Date(a.timestamp).getTime() -
      new Date(b.timestamp).getTime()
  );
}

export async function logActivity(
  type: ActivityType,
  metadata?: Record<string, any>
): Promise<Activity | null> {
  const newActivity: Activity = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    timestamp: new Date().toISOString(),
    metadata,
  };

  // Save locally first so activity logging still works offline.
  try {
    const existing = await getLocalActivities();
    existing.push(newActivity);
    await saveLocalActivities(existing);
  } catch (error) {
    console.error("Failed to save activity locally:", error);
  }

  // Sync to the signed-in user's own Firestore collection.
  try {
    const activitiesRef = getCloudActivitiesCollection();

    if (activitiesRef) {
      await setDoc(
        doc(activitiesRef, newActivity.id),
        newActivity
      );
      console.log("Activity synced to Firestore:", newActivity);
    } else {
      console.log("Activity saved locally; no user is logged in.");
    }
  } catch (error) {
    // Keep the local activity even if cloud sync fails.
    console.error("Activity cloud sync failed:", error);
  }

  return newActivity;
}

export async function getActivities(): Promise<Activity[]> {
  const localActivities = await getLocalActivities();

  try {
    const activitiesRef = getCloudActivitiesCollection();

    // If signed out, return this phone's local history.
    if (!activitiesRef) {
      return localActivities;
    }

    const snapshot = await getDocs(activitiesRef);

    const cloudActivities: Activity[] = snapshot.docs.map(
      (activityDoc) => activityDoc.data() as Activity
    );

    const merged = mergeActivities(
      localActivities,
      cloudActivities
    );

    // Cache the combined history on this phone.
    await saveLocalActivities(merged);

    return merged;
  } catch (error) {
    console.error(
      "Failed to load cloud activities; using local history:",
      error
    );

    return localActivities;
  }
}

export async function getTodayActivities(): Promise<Activity[]> {
  const activities = await getActivities();

  // Compare local calendar dates rather than UTC date strings.
  const now = new Date();

  return activities.filter((activity) => {
    const activityDate = new Date(activity.timestamp);

    return (
      activityDate.getFullYear() === now.getFullYear() &&
      activityDate.getMonth() === now.getMonth() &&
      activityDate.getDate() === now.getDate()
    );
  });
}

export async function clearActivities(): Promise<void> {
  // Clear local history first.
  try {
    await AsyncStorage.removeItem(ACTIVITY_KEY);
  } catch (error) {
    console.error("Failed to clear local activities:", error);
  }

  // Also clear cloud history for this user, if signed in.
  try {
    const activitiesRef = getCloudActivitiesCollection();

    if (!activitiesRef) {
      return;
    }

    const snapshot = await getDocs(activitiesRef);

    await Promise.all(
      snapshot.docs.map((activityDoc) =>
        deleteDoc(activityDoc.ref)
      )
    );
  } catch (error) {
    console.error("Failed to clear cloud activities:", error);
  }
}

export type DailyActivitySummary = {
  totalActivities: number;
  babyCare: number;
  meditation: number;
  selfCare: number;
  breaks: number;
  medication: number;
  voiceConversations: number;
};

export async function getTodayActivitySummary(): Promise<DailyActivitySummary> {
  const activities = await getTodayActivities();

  return {
    totalActivities: activities.length,
    babyCare: activities.filter(
      (activity) => activity.type === "baby_care"
    ).length,
    meditation: activities.filter(
      (activity) => activity.type === "meditation"
    ).length,
    selfCare: activities.filter(
      (activity) => activity.type === "self_care"
    ).length,
    breaks: activities.filter(
      (activity) => activity.type === "break"
    ).length,
    medication: activities.filter(
      (activity) => activity.type === "medication"
    ).length,
    voiceConversations: activities.filter(
      (activity) => activity.type === "voice_input"
    ).length,
  };
}
