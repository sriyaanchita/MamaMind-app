import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Notifications from "expo-notifications";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { logActivity } from "@/utils/activityLogger";
import { db } from "@/services/firebase";
import { getMyFamily } from "@/utils/familyService";
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
/* =========================================================
   FIRESTORE
   One shared baby dashboard document per family.
========================================================= */

const BABY_DASHBOARD_DOCUMENT = "current";

const VACCINATION_CHANNEL_ID =
  "baby-vaccination-reminders-v1";

/* =========================================================
   MAMAMIND MOTHER THEME
========================================================= */

const C = {
  yellow: "#FFDA57",
  teal: "#19B7B0",
  deepTeal: "#0E7C86",
  white: "#FFFFFF",
  coral: "#FF6B6B",
  cream: "#FFF9E8",
  paleTeal: "#E8F8F6",
  dark: "#164F52",
  muted: "#648384",
  softCoral: "#FFF9E8",
  softYellow: "#FFF9E8",
  border: "#E8F8F6",
  lightBorder: "#E8F8F6",
  success: "#19B7B0",
};

/* =========================================================
   TYPES
========================================================= */

type VaccinationRecord = {
  givenDate?: string;
  reminderId?: string;
};

type BabyData = {
  babyName: string;
  dateOfBirth: string;
  specialCondition: string;
  careDate: string;

  feeding: number;
  sleep: number;
  diapers: number;
  lastFeedAt?: string;
  lastSleepAt?: string;

  mood: string;

  updatedBy: "Mama" | "Dad";
  lastUpdated: string;

  milestones: string[];

  memories: {
    id: number;
    text: string;
    imageUri?: string;
    createdAt?: string;
    kind?: "memory" | "milestone";
  }[];

  supplies: {
    diapers: boolean;
    wipes: boolean;
    formula: boolean;
    other: boolean;
  };

  vaccinations: Record<string, VaccinationRecord>;
};

/* =========================================================
   LOCAL DATE KEY — used to reset daily counters after midnight
========================================================= */

function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/* =========================================================
   DEFAULT DATA
========================================================= */

const DEFAULT_DATA: BabyData = {
  babyName: "Our Little One",
  dateOfBirth: "",
  specialCondition: "",
  careDate: "",

  feeding: 0,
  sleep: 0,
  diapers: 0,
  lastFeedAt: undefined,
  lastSleepAt: undefined,

  mood: "Happy",

  updatedBy: "Mama",
  lastUpdated: "Not updated yet",

  milestones: [],

  memories: [],

  supplies: {
    diapers: false,
    wipes: false,
    formula: false,
    other: false,
  },

  vaccinations: {},
};

/* =========================================================
   VACCINATION SCHEDULE
   Based on the uploaded IAP 2024–25 chart.
========================================================= */

type VaccineScheduleItem = {
  id: string;
  ageLabel: string;
  vaccine: string;
  dose: string;

  /*
    We use the earliest point of a range for calculating
    the reminder date.
  */
  months?: number;
  weeks?: number;

  rangeStartMonths?: number;
  rangeEndMonths?: number;
};

const VACCINATION_SCHEDULE: VaccineScheduleItem[] = [
  /* BIRTH */

  {
    id: "birth-bcg",
    ageLabel: "Birth",
    vaccine: "BCG",
    dose: "1st",
    months: 0,
  },
  {
    id: "birth-opv",
    ageLabel: "Birth",
    vaccine: "OPV",
    dose: "0 Dose",
    months: 0,
  },
  {
    id: "birth-hepb",
    ageLabel: "Birth",
    vaccine: "Hepatitis B",
    dose: "1st",
    months: 0,
  },

  /* 6 WEEKS */

  {
    id: "6w-dtwp",
    ageLabel: "6 weeks",
    vaccine: "DTwP / DTaP",
    dose: "1st",
    weeks: 6,
  },
  {
    id: "6w-ipv",
    ageLabel: "6 weeks",
    vaccine: "IPV",
    dose: "1st",
    weeks: 6,
  },
  {
    id: "6w-hib",
    ageLabel: "6 weeks",
    vaccine: "Hib",
    dose: "1st",
    weeks: 6,
  },
  {
    id: "6w-hepb",
    ageLabel: "6 weeks",
    vaccine: "Hepatitis B",
    dose: "2nd",
    weeks: 6,
  },
  {
    id: "6w-rota",
    ageLabel: "6 weeks",
    vaccine: "Rotavirus",
    dose: "1st",
    weeks: 6,
  },
  {
    id: "6w-pcv",
    ageLabel: "6 weeks",
    vaccine: "PCV",
    dose: "1st",
    weeks: 6,
  },

  /* 10 WEEKS */

  {
    id: "10w-dtwp",
    ageLabel: "10 weeks",
    vaccine: "DTwP / DTaP",
    dose: "2nd",
    weeks: 10,
  },
  {
    id: "10w-ipv",
    ageLabel: "10 weeks",
    vaccine: "IPV",
    dose: "2nd",
    weeks: 10,
  },
  {
    id: "10w-hib",
    ageLabel: "10 weeks",
    vaccine: "Hib",
    dose: "2nd",
    weeks: 10,
  },
  {
    id: "10w-hepb",
    ageLabel: "10 weeks",
    vaccine: "Hepatitis B",
    dose: "3rd",
    weeks: 10,
  },
  {
    id: "10w-rota",
    ageLabel: "10 weeks",
    vaccine: "Rotavirus",
    dose: "2nd",
    weeks: 10,
  },
  {
    id: "10w-pcv",
    ageLabel: "10 weeks",
    vaccine: "PCV",
    dose: "2nd",
    weeks: 10,
  },

  /* 14 WEEKS */

  {
    id: "14w-dtwp",
    ageLabel: "14 weeks",
    vaccine: "DTwP / DTaP",
    dose: "3rd",
    weeks: 14,
  },
  {
    id: "14w-ipv",
    ageLabel: "14 weeks",
    vaccine: "IPV",
    dose: "3rd",
    weeks: 14,
  },
  {
    id: "14w-hib",
    ageLabel: "14 weeks",
    vaccine: "Hib",
    dose: "3rd",
    weeks: 14,
  },
  {
    id: "14w-hepb",
    ageLabel: "14 weeks",
    vaccine: "Hepatitis B",
    dose: "4th",
    weeks: 14,
  },
  {
    id: "14w-rota",
    ageLabel: "14 weeks",
    vaccine: "Rotavirus",
    dose: "3rd",
    weeks: 14,
  },
  {
    id: "14w-pcv",
    ageLabel: "14 weeks",
    vaccine: "PCV",
    dose: "3rd",
    weeks: 14,
  },

  /* 6 MONTHS */

  {
    id: "6m-influenza-1",
    ageLabel: "6 months",
    vaccine: "Influenza",
    dose: "1st",
    months: 6,
  },

  /* 7 MONTHS */

  {
    id: "7m-influenza-2",
    ageLabel: "7 months",
    vaccine: "Influenza",
    dose: "2nd",
    months: 7,
  },

  /* 6–9 MONTHS */

  {
    id: "6to9m-typhoid",
    ageLabel: "6–9 months",
    vaccine: "Typhoid Conjugate Vaccine",
    dose: "1st",
    rangeStartMonths: 6,
    rangeEndMonths: 9,
    months: 6,
  },

  /* 9 MONTHS */

  {
    id: "9m-mmr",
    ageLabel: "9 months",
    vaccine: "MMR",
    dose: "1st",
    months: 9,
  },
  {
    id: "9m-meningococcal",
    ageLabel: "9 months",
    vaccine: "Meningococcal",
    dose: "1st",
    months: 9,
  },

  /* 12 MONTHS */

  {
    id: "12m-hepa",
    ageLabel: "12 months",
    vaccine: "Hepatitis A",
    dose: "1st",
    months: 12,
  },
  {
    id: "12m-meningococcal",
    ageLabel: "12 months",
    vaccine: "Meningococcal",
    dose: "2nd",
    months: 12,
  },
  {
    id: "12m-je",
    ageLabel: "12 months",
    vaccine: "Japanese Encephalitis",
    dose: "1st",
    months: 12,
  },

  /* 13 MONTHS */

  {
    id: "13m-je",
    ageLabel: "13 months",
    vaccine: "Japanese Encephalitis",
    dose: "2nd",
    months: 13,
  },

  /* 15 MONTHS */

  {
    id: "15m-mmr",
    ageLabel: "15 months",
    vaccine: "MMR",
    dose: "2nd",
    months: 15,
  },
  {
    id: "15m-varicella",
    ageLabel: "15 months",
    vaccine: "Varicella",
    dose: "1st",
    months: 15,
  },
  {
    id: "15m-pcv",
    ageLabel: "15 months",
    vaccine: "PCV Booster",
    dose: "4th",
    months: 15,
  },

  /* 16–18 MONTHS */

  {
    id: "16to18m-dtwp",
    ageLabel: "16–18 months",
    vaccine: "DTwP / DTaP",
    dose: "4th",
    rangeStartMonths: 16,
    rangeEndMonths: 18,
    months: 16,
  },
  {
    id: "16to18m-hib",
    ageLabel: "16–18 months",
    vaccine: "Hib",
    dose: "4th",
    rangeStartMonths: 16,
    rangeEndMonths: 18,
    months: 16,
  },
  {
    id: "16to18m-ipv",
    ageLabel: "16–18 months",
    vaccine: "IPV",
    dose: "4th",
    rangeStartMonths: 16,
    rangeEndMonths: 18,
    months: 16,
  },

  /* 18–19 MONTHS */

  {
    id: "18to19m-hepa",
    ageLabel: "18–19 months",
    vaccine: "Hepatitis A",
    dose: "2nd",
    rangeStartMonths: 18,
    rangeEndMonths: 19,
    months: 18,
  },
  {
    id: "18to19m-varicella",
    ageLabel: "18–19 months",
    vaccine: "Varicella",
    dose: "2nd",
    rangeStartMonths: 18,
    rangeEndMonths: 19,
    months: 18,
  },

  /* 4–6 YEARS */

  {
    id: "4to6y-dtwp",
    ageLabel: "4–6 years",
    vaccine: "DTwP / DTaP",
    dose: "5th",
    rangeStartMonths: 48,
    rangeEndMonths: 72,
    months: 48,
  },
  {
    id: "4to6y-ipv",
    ageLabel: "4–6 years",
    vaccine: "IPV",
    dose: "5th",
    rangeStartMonths: 48,
    rangeEndMonths: 72,
    months: 48,
  },
  {
    id: "4to6y-mmr",
    ageLabel: "4–6 years",
    vaccine: "MMR",
    dose: "3rd",
    rangeStartMonths: 48,
    rangeEndMonths: 72,
    months: 48,
  },

  /* 10–12 YEARS */

  {
    id: "10to12y-tdap",
    ageLabel: "10–12 years",
    vaccine: "Tdap",
    dose: "1st",
    rangeStartMonths: 120,
    rangeEndMonths: 144,
    months: 120,
  },
  {
    id: "10to12y-hpv",
    ageLabel: "10–12 years",
    vaccine: "HPV",
    dose: "1st",
    rangeStartMonths: 120,
    rangeEndMonths: 144,
    months: 120,
  },
];

/* =========================================================
   DATE HELPERS
========================================================= */

function parseDateOfBirth(value: string): Date | null {
  const parts = value.trim().split("/");

  if (parts.length !== 3) {
    return null;
  }

  const day = Number(parts[0]);
  const month = Number(parts[1]);
  const year = Number(parts[2]);

  if (
    !day ||
    !month ||
    !year ||
    year < 1900 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatDate(date: Date): string {
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
}

function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

function getDueDate(
  dob: Date,
  item: VaccineScheduleItem
): Date {
  if (item.weeks !== undefined) {
    return addWeeks(dob, item.weeks);
  }

  if (
    item.months !== undefined &&
    item.months >= 48
  ) {
    return addYears(
      dob,
      item.months / 12
    );
  }

  return addMonths(
    dob,
    item.months ?? 0
  );
}

function getDaysDifference(
  target: Date,
  today: Date
): number {
  const targetDay = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  ).getTime();

  const todayDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  ).getTime();

  return Math.round(
    (targetDay - todayDay) /
      (1000 * 60 * 60 * 24)
  );
}

function getBabyAge(dob: Date): string {
  const today = new Date();

  if (today < dob) {
    return "Not born yet";
  }

  let years =
    today.getFullYear() -
    dob.getFullYear();

  let months =
    today.getMonth() -
    dob.getMonth();

  let days =
    today.getDate() -
    dob.getDate();

  if (days < 0) {
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years > 0) {
    return `${years} ${
      years === 1 ? "year" : "years"
    } old`;
  }

  if (months > 0) {
    return `${months} ${
      months === 1 ? "month" : "months"
    } old`;
  }

  const daysAlive = Math.max(
    0,
    Math.floor(
      (today.getTime() - dob.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  return `${daysAlive} ${
    daysAlive === 1 ? "day" : "days"
  } old`;
}

/* =========================================================
   VACCINATION STATUS
========================================================= */

type VaccineStatus =
  | "completed"
  | "upcoming"
  | "due"
  | "overdue";

function getVaccineStatus(
  item: VaccineScheduleItem,
  dob: Date,
  record?: VaccinationRecord
): VaccineStatus {
  if (record?.givenDate) {
    return "completed";
  }

  const today = new Date();
  const dueDate = getDueDate(dob, item);

  if (
    item.rangeEndMonths !== undefined
  ) {
    const rangeEnd = addMonths(
      dob,
      item.rangeEndMonths
    );

    if (today < dueDate) {
      return "upcoming";
    }

    if (today <= rangeEnd) {
      return "due";
    }

    return "overdue";
  }

  return today < dueDate
    ? "upcoming"
    : "overdue";
}

/* =========================================================
   NOTIFICATIONS
========================================================= */

async function prepareVaccinationNotifications() {
  try {
    await Notifications.setNotificationChannelAsync(
      VACCINATION_CHANNEL_ID,
      {
        name: "Baby Vaccination Reminders",
        importance:
          Notifications.AndroidImportance.DEFAULT,
      }
    );
  } catch (error) {
    console.log(
      "Notification channel error:",
      error
    );
  }
}

async function requestNotificationPermission() {
  const existing =
    await Notifications.getPermissionsAsync();

  if (
    existing.status ===
    Notifications.PermissionStatus.GRANTED
  ) {
    return true;
  }

  const requested =
    await Notifications.requestPermissionsAsync();

  return (
    requested.status ===
    Notifications.PermissionStatus.GRANTED
  );
}

/* =========================================================
   MAIN SCREEN
========================================================= */

export default function BabyDashboard() {
  const [data, setData] =
    useState<BabyData>(DEFAULT_DATA);

  const [loading, setLoading] =
    useState(true);

  const saveQueueRef =
    useRef<Promise<void>>(Promise.resolve());

  const familyDocRef = useRef<any>(null);
  const lastSyncedDataRef = useRef<string | null>(null);
  const initializingMissingDocumentRef = useRef(false);

  const [showMoodModal, setShowMoodModal] =
    useState(false);

  const [showMemoryModal, setShowMemoryModal] =
    useState(false);

  const [
    showMilestoneModal,
    setShowMilestoneModal,
  ] = useState(false);

  const [
    showBabyProfileModal,
    setShowBabyProfileModal,
  ] = useState(false);

  const [memoryText, setMemoryText] =
    useState("");

  const [memoryImageUri, setMemoryImageUri] =
    useState<string | undefined>(undefined);

  const [editingMemoryId, setEditingMemoryId] =
    useState<number | null>(null);

  const [editingMemoryKind, setEditingMemoryKind] =
    useState<"memory" | "milestone">("memory");

  const promptedCareRef = useRef<{
  feeding?: string;
  sleep?: string;
  diapers?: string;
}>({});

  const [milestoneText, setMilestoneText] =
    useState("");

  const [babyNameInput, setBabyNameInput] =
    useState("");

  const [dobInput, setDobInput] =
    useState("");

  const [specialConditionInput, setSpecialConditionInput] =
    useState("");

  const fadeAnim =
    useRef(new Animated.Value(0)).current;

  const slideAnim =
    useRef(new Animated.Value(18)).current;

  const heroScale =
    useRef(new Animated.Value(0.96)).current;

  const floatAnim =
    useRef(new Animated.Value(0)).current;

  /* =======================================================
     LOAD
  ======================================================= */

  useEffect(() => {
    prepareVaccinationNotifications();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),

      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 650,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.spring(heroScale, {
        toValue: 1,
        tension: 45,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const animation =
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 3500,
            easing: Easing.inOut(
              Easing.ease
            ),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 3500,
            easing: Easing.inOut(
              Easing.ease
            ),
            useNativeDriver: true,
          }),
        ])
      );

    animation.start();

    return () => {
      animation.stop();
    };
  }, []);

  /* =======================================================
     FIRESTORE REAL-TIME LOAD
     Mama and Dad use the same family document.
  ======================================================= */

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    const connectToFamilyDashboard = async () => {
      try {
        const familyResult: any = await getMyFamily();

        const familyId =
          typeof familyResult === "string"
            ? familyResult
            : familyResult?.familyId ??
              familyResult?.id ??
              familyResult?.family?.familyId ??
              familyResult?.family?.id ??
              familyResult?.familyData?.id;

        if (!familyId) {
          throw new Error(
            "No family was found for this account. Please connect Mama and Dad to the same family first."
          );
        }

        if (cancelled) return;

        const dashboardRef = doc(
          db,
          "families",
          String(familyId),
          "babyDashboard",
          BABY_DASHBOARD_DOCUMENT
        );

        familyDocRef.current = dashboardRef;

        unsubscribe = onSnapshot(
          dashboardRef,
          async (snapshot) => {
            if (cancelled) return;

            if (!snapshot.exists()) {
              if (!initializingMissingDocumentRef.current) {
                initializingMissingDocumentRef.current = true;

                const initialData: BabyData = {
                  ...DEFAULT_DATA,
                  careDate: getLocalDateKey(),
                };

                try {
                  const initialFirestoreData = Object.fromEntries(
                    Object.entries(initialData).filter(
                      ([, value]) => value !== undefined
                    )
                  );

                  await setDoc(dashboardRef, {
                    ...initialFirestoreData,
                    updatedAt: serverTimestamp(),
                    createdAt: serverTimestamp(),
                  });
                } catch (error) {
                  console.error(
                    "Could not initialize baby dashboard in Firestore:",
                    error
                  );
                  if (!cancelled) {
                    Alert.alert(
                      "Couldn't create baby space",
                      "Please check your internet connection and Firestore family permissions."
                    );
                    setLoading(false);
                  }
                } finally {
                  initializingMissingDocumentRef.current = false;
                }
              }
              return;
            }

            const parsed = snapshot.data() as Partial<BabyData>;
            const loadedMemories = Array.isArray(parsed.memories)
              ? [...parsed.memories]
              : [];

            const legacyMilestones: string[] = Array.isArray(parsed.milestones)
              ? parsed.milestones
              : [];

            legacyMilestones.forEach((milestone, index) => {
              if (!loadedMemories.some((item: any) => item.text === milestone)) {
                loadedMemories.push({
                  id: -1000 - index,
                  text: milestone,
                  kind: "milestone",
                });
              }
            });

            const todayKey = getLocalDateKey();
            const savedCareDate = parsed.careDate || "";
            const isNewCareDay = savedCareDate !== todayKey;

            const normalizedData: BabyData = {
              ...DEFAULT_DATA,
              ...parsed,
              memories: loadedMemories,
              specialCondition: parsed.specialCondition || "",
              careDate: todayKey,
              feeding: isNewCareDay ? 0 : (parsed.feeding ?? 0),
              sleep: isNewCareDay ? 0 : (parsed.sleep ?? 0),
              diapers: isNewCareDay ? 0 : (parsed.diapers ?? 0),
              lastFeedAt: isNewCareDay ? undefined : parsed.lastFeedAt,
              lastSleepAt: isNewCareDay ? undefined : parsed.lastSleepAt,
              lastUpdated:
                isNewCareDay && savedCareDate
                  ? "Not updated yet"
                  : (parsed.lastUpdated || "Not updated yet"),
              supplies: {
                ...DEFAULT_DATA.supplies,
                ...(parsed.supplies || {}),
              },
              vaccinations: {
                ...DEFAULT_DATA.vaccinations,
                ...(parsed.vaccinations || {}),
              },
            };

            const serialized = JSON.stringify(normalizedData);
            lastSyncedDataRef.current = serialized;

            setData((current) =>
              JSON.stringify(current) === serialized
                ? current
                : normalizedData
            );
            setLoading(false);
          },
          (error) => {
            console.error("Baby dashboard Firestore listener error:", error);
            if (!cancelled) {
              Alert.alert(
                "Couldn't load baby space",
                "Please check your internet connection and Firestore family permissions."
              );
              setLoading(false);
            }
          }
        );
      } catch (error: any) {
        console.error("Could not connect to family baby dashboard:", error);
        if (!cancelled) {
          Alert.alert(
            "Family connection needed",
            error?.message ||
              "Mama and Dad must be connected to the same family before sharing baby details."
          );
          setLoading(false);
        }
      }
    };

    void connectToFamilyDashboard();

    return () => {
      cancelled = true;
      unsubscribe?.();
      familyDocRef.current = null;
    };
  }, []);

  /* =======================================================
     FIRESTORE SAVE
     Only changed data is written; snapshots update both phones.
  ======================================================= */

  useEffect(() => {
    if (loading || !familyDocRef.current) return;

    const serializedData = JSON.stringify(data);

    if (lastSyncedDataRef.current === serializedData) {
      return;
    }

    const dashboardRef = familyDocRef.current;

    saveQueueRef.current = saveQueueRef.current
      .then(async () => {
        // Firestore rejects undefined values unless configured otherwise.
        const firestoreData = Object.fromEntries(
          Object.entries(data).filter(([, value]) => value !== undefined)
        );

        await setDoc(
          dashboardRef,
          {
            ...firestoreData,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        lastSyncedDataRef.current = serializedData;
      })
      .catch((error) => {
        console.error("Error saving baby dashboard to Firestore:", error);
        Alert.alert(
          "Couldn't save baby update",
          "Your latest change may not be shared yet. Please check your internet connection and try again."
        );
      });
  }, [data, loading]);

  /* =======================================================
     BABY PROFILE
  ======================================================= */

  const openBabyProfile = () => {
    setBabyNameInput(data.babyName);
    setDobInput(data.dateOfBirth);
    setSpecialConditionInput(data.specialCondition || "");
    setShowBabyProfileModal(true);
  };

  const handleDobChange = (value: string) => {
    // Number-pad keyboards cannot easily type "/" on some Android phones.
    // Accept digits only and insert separators automatically as DD/MM/YYYY.
    const digits = value.replace(/\D/g, "").slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    } else if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    setDobInput(formatted);
  };

  const saveBabyProfile = () => {
    const name =
      babyNameInput.trim() ||
      "Our Little One";

    if (dobInput.trim()) {
      const dob =
        parseDateOfBirth(dobInput);

      if (!dob) {
        Alert.alert(
          "Check the date",
          "Please enter the date as DD/MM/YYYY."
        );
        return;
      }

      if (dob > new Date()) {
        Alert.alert(
          "Check the date",
          "Date of birth cannot be in the future."
        );
        return;
      }
    }

    setData((current) => ({
      ...current,
      babyName: name,
      dateOfBirth: dobInput.trim(),
      specialCondition: specialConditionInput.trim(),
    }));

    setShowBabyProfileModal(false);
  };

  /* =======================================================
     TIME
  ======================================================= */

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  };

  /* =======================================================
     CARE
  ======================================================= */

  const updateCare = async (
    type: "feeding" | "sleep" | "diapers"
  ) => {
    const now = new Date();
    const nowIso = now.toISOString();
    const todayKey = getLocalDateKey(now);

    setData((current) => ({
      ...current,
      [type]: (current.careDate === todayKey ? current[type] : 0) + 1,
      careDate: todayKey,
      ...(type === "feeding" ? { lastFeedAt: nowIso } : {}),
      ...(type === "sleep" ? { lastSleepAt: nowIso } : {}),
      updatedBy: "Mama",
      lastUpdated: now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
    }));

    // A new log starts a new reminder interval for that care type.
    promptedCareRef.current[type] = undefined;

    await logActivity("baby_care", {
      action: type,
      timestamp: nowIso,
    });
  };

  /* =======================================================
     MOOD
  ======================================================= */

  const updateMood = (mood: string) => {
    setData((current) => ({
      ...current,
      mood,
      updatedBy: "Mama",
      lastUpdated:
        getCurrentTime(),
    }));

    setShowMoodModal(false);
  };

  /* =======================================================
     MEMORIES + MILESTONES
  ======================================================= */

  const addMemory = (kind: "memory" | "milestone" = "memory") => {
    const trimmed = memoryText.trim();

    if (!trimmed && !memoryImageUri) {
      Alert.alert("Add a moment", "Write a note or choose a photo first.");
      return;
    }

    const savedKind = editingMemoryId !== null ? editingMemoryKind : kind;

    setData((current) => {
      if (editingMemoryId !== null) {
        return {
          ...current,
          memories: (current.memories || []).map((memory) =>
            memory.id === editingMemoryId
              ? {
                  ...memory,
                  text: trimmed || (savedKind === "milestone" ? "A little milestone" : "A precious memory"),
                  imageUri: memoryImageUri,
                  kind: savedKind,
                }
              : memory
          ),
        };
      }

      return {
        ...current,
        memories: [
          {
            id: Date.now(),
            text: trimmed || (savedKind === "milestone" ? "A little milestone" : "A precious memory"),
            imageUri: memoryImageUri,
            createdAt: new Date().toISOString(),
            kind: savedKind,
          },
          ...(current.memories || []),
        ],
        // Keep the legacy milestone list for compatibility with existing saved data.
        milestones: savedKind === "milestone" && trimmed
          ? [...current.milestones, trimmed]
          : current.milestones,
      };
    });

    setEditingMemoryId(null);
    setEditingMemoryKind("memory");
    setMemoryText("");
    setMemoryImageUri(undefined);
    setShowMemoryModal(false);
    setShowMilestoneModal(false);
  };

  const deleteMemory = (id: number) => {
    setData((current) => ({
      ...current,
      memories: (current.memories || []).filter((memory) => memory.id !== id),
    }));
  };

  const chooseMemoryPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Photo permission needed", "Allow photo-library access to add a baby memory.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.75,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setMemoryImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Could not choose memory photo:", error);
      Alert.alert("Couldn't open photos", "Please try again.");
    }
  };

  /* =======================================================
     GENTLE FEED / SLEEP CHECK-INS
     Checks while this screen is open; no medical schedule is assumed.
  ======================================================= */

  useEffect(() => {
    if (loading) return;

    const checkCareIntervals = () => {
      const now = Date.now();
      const todayKey = getLocalDateKey();
      if (data.careDate !== todayKey) return;

      const feedTime = data.lastFeedAt ? new Date(data.lastFeedAt).getTime() : 0;
      const sleepTime = data.lastSleepAt ? new Date(data.lastSleepAt).getTime() : 0;
      const feedDue = feedTime > 0 && now - feedTime >= 3 * 60 * 60 * 1000;
      const sleepDue = sleepTime > 0 && now - sleepTime >= 2 * 60 * 60 * 1000;

      if (feedDue && promptedCareRef.current.feeding !== data.lastFeedAt) {
        promptedCareRef.current.feeding = data.lastFeedAt;
        Alert.alert(
          "A gentle feeding check-in",
          `It's been a while since the last feed you logged for ${data.babyName}. Would you like to log a feed now? Follow your baby's cues and your clinician's advice.`,
          [
            { text: "Not now", style: "cancel" },
            { text: "Log feed", onPress: () => { void updateCare("feeding"); } },
          ]
        );
        return;
      }

      if (sleepDue && promptedCareRef.current.sleep !== data.lastSleepAt) {
        promptedCareRef.current.sleep = data.lastSleepAt;
        Alert.alert(
          "A gentle sleep check-in",
          `Would you like to update ${data.babyName}'s sleep log? This is only a reminder to check in, not a recommended sleep schedule.`,
          [
            { text: "Not now", style: "cancel" },
            { text: "Log sleep", onPress: () => { void updateCare("sleep"); } },
          ]
        );
      }
    };

    const interval = setInterval(checkCareIntervals, 60 * 1000);
    checkCareIntervals();
    return () => clearInterval(interval);
  }, [loading, data.careDate, data.lastFeedAt, data.lastSleepAt, data.babyName]);

  /* =======================================================
     SUPPLIES
  ======================================================= */

  const toggleSupply = (
    item: keyof BabyData["supplies"]
  ) => {
    setData((current) => ({
      ...current,

      supplies: {
        ...current.supplies,

        [item]:
          !current.supplies[item],
      },
    }));
  };

  /* =======================================================
     RESET
  ======================================================= */

  const resetToday = () => {
    Alert.alert(
      "Reset today's care?",
      "This will reset feeds, sleep and diapers for today.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Reset",
          style: "destructive",

          onPress: () => {
            setData((current) => ({
              ...current,

              feeding: 0,
              sleep: 0,
              diapers: 0,
              lastFeedAt: undefined,
              lastSleepAt: undefined,
              careDate: getLocalDateKey(),

              lastUpdated:
                "Not updated yet",
            }));
          },
        },
      ]
    );
  };

  /* =======================================================
     VACCINATION
  ======================================================= */

  const babyDob = useMemo(
    () =>
      data.dateOfBirth
        ? parseDateOfBirth(
            data.dateOfBirth
          )
        : null,
    [data.dateOfBirth]
  );

  const babyAge = babyDob
    ? getBabyAge(babyDob)
    : null;

  const vaccinationItems =
    useMemo(() => {
      if (!babyDob) {
        return [];
      }

      return VACCINATION_SCHEDULE.map(
        (item) => {
          const dueDate =
            getDueDate(
              babyDob,
              item
            );

          const record =
            data.vaccinations[
              item.id
            ];

          const status =
            getVaccineStatus(
              item,
              babyDob,
              record
            );

          return {
            ...item,
            dueDate,
            record,
            status,
          };
        }
      );
    }, [
      babyDob,
      data.vaccinations,
    ]);

  const completedVaccines =
    vaccinationItems.filter(
      (item) =>
        item.status === "completed"
    ).length;

  const nextVaccines =
    vaccinationItems
      .filter(
        (item) =>
          item.status !==
          "completed"
      )
      .sort(
        (a, b) =>
          a.dueDate.getTime() -
          b.dueDate.getTime()
      )
      .slice(0, 4);

  const markVaccineGiven = (
    item: VaccineScheduleItem
  ) => {
    Alert.alert(
      "Mark vaccination as given?",
      `${item.vaccine} (${item.dose}) will be marked as completed today.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Mark Given",
          onPress: () => {
            setData((current) => ({
              ...current,

              vaccinations: {
                ...current.vaccinations,

                [item.id]: {
                  ...current
                    .vaccinations[
                    item.id
                  ],

                  givenDate:
                    formatDate(
                      new Date()
                    ),
                },
              },
            }));
          },
        },
      ]
    );
  };

  const scheduleVaccinationReminder =
    async (
      item: VaccineScheduleItem
    ) => {
      if (!babyDob) {
        Alert.alert(
          "Add baby's date of birth",
          "Set the baby's date of birth first so MamaMind can calculate the vaccination date."
        );
        return;
      }

      try {
        const permitted =
          await requestNotificationPermission();

        if (!permitted) {
          Alert.alert(
            "Notifications are off",
            "Please allow notifications for vaccination reminders."
          );
          return;
        }

        const dueDate =
          getDueDate(
            babyDob,
            item
          );

        const now = new Date();

        /*
          Reminder is scheduled for 3 days before
          the calculated due date at 9:00 AM.

          If that date has already passed,
          schedule it for tomorrow at 9:00 AM.
        */

        const reminderDate =
          new Date(dueDate);

        reminderDate.setDate(
          reminderDate.getDate() - 3
        );

        reminderDate.setHours(
          9,
          0,
          0,
          0
        );

        if (
          reminderDate <= now
        ) {
          reminderDate.setDate(
            now.getDate() + 1
          );

          reminderDate.setHours(
            9,
            0,
            0,
            0
          );
        }

        const notificationId =
          await Notifications.scheduleNotificationAsync(
            {
              content: {
                title:
                  "Baby vaccination reminder",
                body: `${item.vaccine} (${item.dose}) is coming up. Check your baby's vaccination schedule.`,
                data: {
                  vaccineId:
                    item.id,
                },
              },

              trigger: {
                type:
                  Notifications
                    .SchedulableTriggerInputTypes
                    .DATE,

                date: reminderDate,

                channelId:
                  VACCINATION_CHANNEL_ID,
              },
            }
          );

        setData((current) => ({
          ...current,

          vaccinations: {
            ...current.vaccinations,

            [item.id]: {
              ...current
                .vaccinations[
                item.id
              ],

              reminderId:
                notificationId,
            },
          },
        }));

        Alert.alert(
          "Reminder set",
          `MamaMind will remind you on ${formatDate(
            reminderDate
          )} at 9:00 AM.`
        );
      } catch (error) {
        console.log(
          "Vaccination reminder error:",
          error
        );

        Alert.alert(
          "Reminder couldn't be set",
          "Please make sure notifications are enabled and try again."
        );
      }
    };

  /* =======================================================
     SUMMARY
  ======================================================= */

  const totalCare =
    data.feeding +
    data.sleep +
    data.diapers;

  const careProgress =
    Math.min(
      totalCare / 10,
      1
    );

  const getCareMessage = () => {
    const parts: string[] = [];
    if (data.feeding > 0) parts.push(`${data.feeding} feed${data.feeding === 1 ? "" : "s"}`);
    if (data.diapers > 0) parts.push(`${data.diapers} diaper change${data.diapers === 1 ? "" : "s"}`);
    if (data.sleep > 0) parts.push(`${data.sleep} sleep log${data.sleep === 1 ? "" : "s"}`);

    if (parts.length === 0) {
      return "A fresh day is a fresh start. Log care when it works for you—there is no score to meet.";
    }
    return `Today you logged ${parts.join(", ")}. Thank you for keeping track of these little moments. Every family’s routine is different.`;
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={C.cream}
      />

      {/* SUBTLE BACKGROUND DECORATION */}

      <View
        pointerEvents="none"
        style={styles.backgroundDecor}
      >
        <Animated.View
          style={[
            styles.decorCircleOne,
            {
              transform: [
                {
                  translateY:
                    floatAnim.interpolate({
                      inputRange: [
                        0,
                        1,
                      ],
                      outputRange: [
                        0,
                        12,
                      ],
                    }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.decorCircleTwo,
            {
              transform: [
                {
                  translateY:
                    floatAnim.interpolate({
                      inputRange: [
                        0,
                        1,
                      ],
                      outputRange: [
                        0,
                        -10,
                      ],
                    }),
                },
              ],
            },
          ]}
        />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [
              {
                translateY:
                  slideAnim,
              },
            ],
          }}
        >
          {/* BACK */}

          <Pressable
            style={styles.backButton}
            onPress={() =>
              router.back()
            }
          >
            <Text
              style={styles.backText}
            >
              ← Back
            </Text>
          </Pressable>

          {/* HEADER */}

          <View
            style={styles.header}
          >
            <View style={styles.headerTopRow}>
              <View
                style={styles.headerText}
              >
                <Text
                  style={styles.label}
                >
                  BABY SPACE
                </Text>

                <Text
                  style={styles.title}
                >
                  Little moments,{"\n"}
                  <Text
                    style={
                      styles.titleAccent
                    }
                  >
                    big memories.
                  </Text>
                </Text>

                <Text
                  style={styles.subtitle}
                >
                  A gentle shared space for
                  Mama and Dad to care for
                  everything that matters.
                </Text>
              </View>

              <View
                style={styles.headerShape}
              >
                <View
                  style={
                    styles.headerShapeLarge
                  }
                />

                <View
                  style={
                    styles.headerShapeSmall
                  }
                />
              </View>
            </View>
          </View>

          {/* BABY PROFILE HERO */}

          <Animated.View
            style={[
              styles.heroCard,
              {
                transform: [
                  {
                    scale: heroScale,
                  },
                ],
              },
            ]}
          >
            <View
              style={styles.heroGlow}
            />

            <View
              style={styles.heroBabyCircle}
            >
              <Text
                style={styles.heroHeart}
              >
                ♡
              </Text>
            </View>

            <View
              style={styles.heroInfo}
            >
              <Text
                style={styles.heroEyebrow}
              >
                YOUR LITTLE ONE
              </Text>

              <Text
                style={styles.heroName}
              >
                {data.babyName}
              </Text>

              <Text
                style={styles.heroAge}
              >
                {babyAge ||
                  "Add baby's date of birth"}
              </Text>

              <View
                style={styles.heroMood}
              >
                <View
                  style={
                    styles.heroMoodDot
                  }
                />

                <Text
                  style={
                    styles.heroMoodText
                  }
                >
                  Feeling{" "}
                  {data.mood.toLowerCase()}
                </Text>
              </View>
            </View>

            <Pressable
              style={
                styles.profileEditButton
              }
              onPress={
                openBabyProfile
              }
            >
              <Text
                style={
                  styles.profileEditText
                }
              >
                Edit
              </Text>
            </Pressable>
          </Animated.View>

          {/* TODAY */}

          <View
            style={
              styles.sectionHeaderRow
            }
          >
            <View>
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                TODAY
              </Text>

              <Text
                style={
                  styles.sectionTitle
                }
              >
                At a glance
              </Text>
            </View>

            <Pressable
              style={
                styles.resetButton
              }
              onPress={
                resetToday
              }
            >
              <Text
                style={
                  styles.resetText
                }
              >
                Reset
              </Text>
            </Pressable>
          </View>

          <Text
            style={
              styles.sectionDescription
            }
          >
            {getCareMessage()}
          </Text>

          {/* PROGRESS */}

          <View
            style={
              styles.progressCard
            }
          >
            <View
              style={
                styles.progressTopRow
              }
            >
              <View>
                <Text
                  style={
                    styles.progressLabel
                  }
                >
                  CARE MOMENTS
                </Text>

                <Text
                  style={
                    styles.progressNumber
                  }
                >
                  {totalCare}
                  <Text
                    style={
                      styles.progressSlash
                    }
                  >
                    {" "}
                    today
                  </Text>
                </Text>
              </View>

              <View
                style={
                  styles.progressCircle
                }
              >
                <Text
                  style={
                    styles.progressPercent
                  }
                >
                  {Math.round(
                    careProgress * 100
                  )}
                  %
                </Text>
              </View>
            </View>

            <View
              style={
                styles.progressTrack
              }
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.max(
                      careProgress *
                        100,
                      totalCare > 0
                        ? 7
                        : 0
                    )}%`,
                  },
                ]}
              />
            </View>

            <Text
              style={
                styles.progressHint
              }
            >
              Every little update helps
              Mama and Dad stay on the
              same page.
            </Text>
          </View>

          {/* CARE STATS */}

          <View
            style={styles.statsRow}
          >
            <CareCard
              symbol="◌"
              number={
                data.feeding
              }
              label="Feeds"
              buttonText="+ Log feed"
              accent="coral"
              onPress={() =>
                updateCare(
                  "feeding"
                )
              }
            />

            <CareCard
              symbol="☼"
              number={
                data.sleep
              }
              label="Sleep"
              buttonText="+ Log sleep"
              accent="teal"
              onPress={() =>
                updateCare(
                  "sleep"
                )
              }
            />
          </View>

          <View
            style={styles.statsRow}
          >
            <CareCard
              symbol="○"
              number={
                data.diapers
              }
              label="Diapers"
              buttonText="+ Log diaper"
              accent="yellow"
              onPress={() =>
                updateCare(
                  "diapers"
                )
              }
            />

            <View
              style={styles.statCard}
            >
              <View
                style={
                  styles.statTopRow
                }
              >
                <View
                  style={[
                    styles.statIconBox,
                    {
                      backgroundColor:
                        C.softCoral,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statSymbol,
                      {
                        color:
                          C.coral,
                      },
                    ]}
                  >
                    ♡
                  </Text>
                </View>

                <View
                  style={[
                    styles.statIndicator,
                    {
                      backgroundColor:
                        C.coral,
                    },
                  ]}
                />
              </View>

              <Text
                style={
                  styles.statNumber
                }
                numberOfLines={1}
              >
                {data.mood}
              </Text>

              <Text
                style={
                  styles.statLabel
                }
              >
                Baby today
              </Text>

              <Pressable
                style={[
                  styles.smallButton,
                  {
                    backgroundColor:
                      C.softCoral,
                  },
                ]}
                onPress={() =>
                  setShowMoodModal(
                    true
                  )
                }
              >
                <Text
                  style={[
                    styles.smallButtonText,
                    {
                      color:
                        C.coral,
                    },
                  ]}
                >
                  Update
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.lastCareTimesCard}>
            <View style={styles.lastCareTimeRow}>
              <Text style={styles.lastCareTimeLabel}>Last feed</Text>
              <Text style={styles.lastCareTimeValue}>
                {data.lastFeedAt ? new Date(data.lastFeedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Not logged yet"}
              </Text>
            </View>
            <View style={styles.lastCareTimeDivider} />
            <View style={styles.lastCareTimeRow}>
              <Text style={styles.lastCareTimeLabel}>Last sleep log</Text>
              <Text style={styles.lastCareTimeValue}>
                {data.lastSleepAt ? new Date(data.lastSleepAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Not logged yet"}
              </Text>
            </View>
          </View>

          {/* =================================================
              VACCINATION
          ================================================= */}

          <View
            style={
              styles.vaccinationHeader
            }
          >
            <View
              style={
                styles.vaccinationHeadingText
              }
            >
              <Text
                style={
                  styles.sectionEyebrow
                }
              >
                BABY HEALTH
              </Text>

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Vaccinations
              </Text>
            </View>

            {babyDob && (
              <View
                style={
                  styles.vaccineProgressPill
                }
              >
                <Text
                  style={
                    styles.vaccineProgressNumber
                  }
                >
                  {completedVaccines}
                </Text>

                <Text
                  style={
                    styles.vaccineProgressText
                  }
                >
                  completed
                </Text>
              </View>
            )}
          </View>

          {!babyDob ? (
            <View
              style={
                styles.vaccineSetupCard
              }
            >
              <View
                style={
                  styles.vaccineSetupIcon
                }
              >
                <Text
                  style={
                    styles.vaccineSetupIconText
                  }
                >
                  +
                </Text>
              </View>

              <View
                style={
                  styles.vaccineSetupContent
                }
              >
                <Text
                  style={
                    styles.vaccineSetupTitle
                  }
                >
                  Set baby's date of birth
                </Text>

                <Text
                  style={
                    styles.vaccineSetupText
                  }
                >
                  MamaMind will calculate the
                  vaccination timeline from the
                  baby's age.
                </Text>

                <Pressable
                  style={
                    styles.vaccineSetupButton
                  }
                  onPress={
                    openBabyProfile
                  }
                >
                  <Text
                    style={
                      styles.vaccineSetupButtonText
                    }
                  >
                    Add baby details →
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              {/* NEXT VACCINE */}

              {nextVaccines.length >
                0 && (
                <View
                  style={
                    styles.nextVaccineCard
                  }
                >
                  <View
                    style={
                      styles.nextVaccineTop
                    }
                  >
                    <View>
                      <Text
                        style={
                          styles.nextVaccineLabel
                        }
                      >
                        NEXT UP
                      </Text>

                      <Text
                        style={
                          styles.nextVaccineTitle
                        }
                      >
                        {nextVaccines[0]
                          .vaccine}
                      </Text>

                      <Text
                        style={
                          styles.nextVaccineDose
                        }
                      >
                        {nextVaccines[0]
                          .dose}{" "}
                        dose ·{" "}
                        {
                          nextVaccines[0]
                            .ageLabel
                        }
                      </Text>
                    </View>

                    <View
                      style={
                        styles.vaccineIconCircle
                      }
                    >
                      <Text
                        style={
                          styles.vaccineIconText
                        }
                      >
                        +
                      </Text>
                    </View>
                  </View>

                  <View
                    style={
                      styles.nextVaccineDivider
                    }
                  />

                  <View
                    style={
                      styles.nextVaccineBottom
                    }
                  >
                    <View>
                      <Text
                        style={
                          styles.nextVaccineDueLabel
                        }
                      >
                        CALCULATED DATE
                      </Text>

                      <Text
                        style={
                          styles.nextVaccineDate
                        }
                      >
                        {formatDate(
                          nextVaccines[0]
                            .dueDate
                        )}
                      </Text>
                    </View>

                    <VaccineStatusBadge
                      status={
                        nextVaccines[0]
                          .status
                      }
                    />
                  </View>

                  <Pressable
                    style={
                      styles.reminderButton
                    }
                    onPress={() =>
                      scheduleVaccinationReminder(
                        nextVaccines[0]
                      )
                    }
                  >
                    <Text
                      style={
                        styles.reminderButtonText
                      }
                    >
                      Set reminder
                    </Text>

                    <Text
                      style={
                        styles.reminderArrow
                      }
                    >
                      →
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* UPCOMING LIST */}

              <View
                style={
                  styles.vaccineListCard
                }
              >
                <View
                  style={
                    styles.vaccineListHeader
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.vaccineListEyebrow
                      }
                    >
                      SCHEDULE
                    </Text>

                    <Text
                      style={
                        styles.vaccineListTitle
                      }
                    >
                      Upcoming vaccinations
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.vaccineListCount
                    }
                  >
                    {vaccinationItems.length}
                  </Text>
                </View>

                {nextVaccines.map(
                  (item, index) => (
                    <VaccineRow
                      key={item.id}
                      item={item}
                      onMarkGiven={() =>
                        markVaccineGiven(
                          item
                        )}
                      onReminder={() =>
                        scheduleVaccinationReminder(
                          item
                        )}
                      isLast={
                        index ===
                        nextVaccines.length -
                          1
                      }
                    />
                  )
                )}

                {nextVaccines.length ===
                  0 && (
                  <View
                    style={
                      styles.allVaccinesDone
                    }
                  >
                    <Text
                      style={
                        styles.allVaccinesDoneCheck
                      }
                    >
                      ✓
                    </Text>

                    <Text
                      style={
                        styles.allVaccinesDoneText
                      }
                    >
                      All listed vaccinations
                      are marked completed.
                    </Text>
                  </View>
                )}
              </View>

              <Text
                style={
                  styles.vaccineDisclaimer
                }
              >
                Schedule shown from your
                uploaded IAP chart. Please
                confirm the applicable schedule
                with your pediatrician.
              </Text>
            </>
          )}

          {/* LAST UPDATE */}

          <View
            style={
              styles.updatedCard
            }
          >
            <View
              style={
                styles.updatedIcon
              }
            >
              <View
                style={
                  styles.updatedDot
                }
              />
            </View>

            <View
              style={
                styles.updatedContent
              }
            >
              <Text
                style={
                  styles.updatedLabel
                }
              >
                LAST CARE UPDATE
              </Text>

              <Text
                style={
                  styles.updatedText
                }
              >
                {data.lastUpdated ===
                "Not updated yet"
                  ? "No care activity logged yet"
                  : `${data.updatedBy} updated baby's care at ${data.lastUpdated}`}
              </Text>
            </View>

            <Text
              style={
                styles.updatedArrow
              }
            >
              ›
            </Text>
          </View>

          {/* MOOD */}

          <SectionHeading
            eyebrow="BABY'S MOOD"
            title="How is baby today?"
          />

          <View
            style={styles.moodRow}
          >
            {[
              "Happy",
              "Calm",
              "Sleepy",
              "Fussy",
            ].map((mood) => (
              <Pressable
                key={mood}
                style={[
                  styles.moodOption,
                  data.mood === mood &&
                    styles.moodOptionActive,
                ]}
                onPress={() =>
                  updateMood(
                    mood
                  )
                }
              >
                <View
                  style={[
                    styles.moodOptionDot,
                    data.mood === mood &&
                      styles.moodOptionDotActive,
                  ]}
                />

                <Text
                  style={[
                    styles.moodOptionText,
                    data.mood === mood &&
                      styles.moodOptionTextActive,
                  ]}
                >
                  {mood}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
  style={styles.foodChartCard}
  onPress={() => router.push("/baby-food-chart")}
>
  <View style={styles.foodChartContent}>
    <View style={styles.foodChartIcon}>
      <Text style={styles.foodChartEmoji}>🥣</Text>
    </View>

    <View style={styles.foodChartText}>
      <Text style={styles.foodChartTitle}>Baby Food Chart</Text>
      <Text style={styles.foodChartSubtitle}>
        Explore meals and feeding ideas for your little one
      </Text>
    </View>

    <Text style={styles.foodChartArrow}>→</Text>
  </View>
</Pressable>

          {/* BABY GROWTH */}
          <Pressable
            onPress={() => router.push("/baby-growth")}
            style={{
              backgroundColor: C.paleTeal,
              padding: 18,
              borderRadius: 20,
              marginVertical: 8,
              borderWidth: 1,
              borderColor: C.lightBorder,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: "800", color: C.dark }}>
              Baby Growth
            </Text>
            <Text style={{ fontSize: 13, color: C.muted, marginTop: 5 }}>
              Track your baby’s growth, milestones, teeth, and little achievements.
            </Text>
            <Text style={{ color: C.deepTeal, marginTop: 10, fontWeight: "700" }}>
              Explore growth →
            </Text>
          </Pressable>

          {/* MILESTONES + PHOTO MEMORIES — ONE COMBINED SECTION */}

          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionEyebrow}>GROWING TOGETHER</Text>
              <Text style={styles.sectionTitle}>Memories & milestones</Text>
            </View>
            <Pressable style={styles.addButton} onPress={() => {
              setEditingMemoryId(null);
              setEditingMemoryKind("memory");
              setMemoryText("");
              setMemoryImageUri(undefined);
              setShowMemoryModal(true);
            }}>
              <Text style={styles.addButtonText}>+ Add moment</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionDescription}>Save a photo, a first, or a tiny moment you want to remember.</Text>

          {data.memories.length > 0 ? (
            <View style={styles.memoryGrid}>
              {data.memories.map((memory) => (
                <View key={memory.id} style={styles.memoryTile}>
                  {memory.imageUri ? (
                    <Image source={{ uri: memory.imageUri }} style={styles.memoryPhoto} resizeMode="cover" />
                  ) : (
                    <View style={styles.memoryPhotoPlaceholder}>
                      <Text style={styles.memoryPlaceholderHeart}>♡</Text>
                    </View>
                  )}
                  <View style={styles.memoryTileBody}>
                    <Text style={styles.memoryKind}>
                      {memory.kind === "milestone" ? "MILESTONE" : "LITTLE MEMORY"}
                    </Text>
                    <Text style={styles.savedMemoryText}>{memory.text}</Text>
                    {!!memory.createdAt && (
                      <Text style={styles.memoryDate}>
                        {new Date(memory.createdAt).toLocaleDateString([], { day: "numeric", month: "short" })}
                      </Text>
                    )}
                    <View style={{ flexDirection: "row", gap: 18, marginTop: 12 }}>
                      <Pressable
                        onPress={() => {
                          setEditingMemoryId(memory.id);
                          setEditingMemoryKind(memory.kind === "milestone" ? "milestone" : "memory");
                          setMemoryText(memory.text || "");
                          setMemoryImageUri(memory.imageUri || undefined);
                          if (memory.kind === "milestone") {
                            setShowMilestoneModal(true);
                          } else {
                            setShowMemoryModal(true);
                          }
                        }}
                      >
                        <Text style={{ color: C.deepTeal, fontWeight: "700" }}>Edit</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          Alert.alert(
                            "Delete this memory?",
                            "This memory and its photo will be removed.",
                            [
                              { text: "Cancel", style: "cancel" },
                              { text: "Delete", style: "destructive", onPress: () => deleteMemory(memory.id) },
                            ]
                          );
                        }}
                      >
                        <Text style={{ color: C.coral, fontWeight: "700" }}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Pressable style={styles.emptyMemoryCard} onPress={() => {
            setEditingMemoryId(null);
            setEditingMemoryKind("memory");
            setMemoryText("");
            setMemoryImageUri(undefined);
            setShowMemoryModal(true);
          }}>
              <View style={styles.memoryInnerCircle}><Text style={styles.memorySymbol}>+</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.memoryTitle}>Your baby's story starts here</Text>
                <Text style={styles.memoryText}>Add a photo or capture a milestone in one place.</Text>
              </View>
              <Text style={styles.memoryArrow}>→</Text>
            </Pressable>
          )}

          <Pressable style={styles.addMilestoneInline} onPress={() => {
            setEditingMemoryId(null);
            setEditingMemoryKind("milestone");
            setMemoryText("");
            setMemoryImageUri(undefined);
            setShowMilestoneModal(true);
          }}>
            <Text style={styles.addMilestoneInlineText}>+ Record a milestone</Text>
          </Pressable>

          {/* FOOTER */}

          <View
            style={
              styles.footer
            }
          >
            <View
              style={
                styles.footerLine
              }
            />

            <Text
              style={
                styles.footerText
              }
            >
              Small moments become big
              memories.
            </Text>

            <View
              style={
                styles.footerDots
              }
            >
              <View
                style={
                  styles.footerDot
                }
              />

              <View
                style={[
                  styles.footerDot,
                  styles.footerDotActive,
                ]}
              />

              <View
                style={
                  styles.footerDot
                }
              />
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* =====================================================
          BABY PROFILE MODAL
      ===================================================== */}

      <Modal
        visible={
          showBabyProfileModal
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowBabyProfileModal(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            <View
              style={
                styles.modalAccent
              }
            >
              <Text
                style={
                  styles.modalAccentText
                }
              >
                ♡
              </Text>
            </View>

            <Text
              style={
                styles.modalTitle
              }
            >
              Baby details
            </Text>

            <Text
              style={
                styles.modalDescription
              }
            >
              Add the basics so MamaMind
              can calculate baby's age and
              vaccination timeline.
            </Text>

            <Text
              style={
                styles.inputLabel
              }
            >
              BABY NAME
            </Text>

            <TextInput
              style={
                styles.input
              }
              placeholder="Our Little One"
              placeholderTextColor={
                "#648384"
              }
              value={
                babyNameInput
              }
              onChangeText={
                setBabyNameInput
              }
            />

            <Text
              style={
                styles.inputLabel
              }
            >
              DATE OF BIRTH
            </Text>

            <TextInput
              style={
                styles.input
              }
              placeholder="DD/MM/YYYY"
              placeholderTextColor={
                "#648384"
              }
              value={dobInput}
              onChangeText={
                handleDobChange
              }
              keyboardType="number-pad"
              maxLength={10}
            />

            <Text
              style={styles.inputLabel}
            >
              SPECIAL CARE NOTES (OPTIONAL)
            </Text>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. allergy, feeding support, or guidance from our pediatrician"
              placeholderTextColor="#648384"
              value={specialConditionInput}
              onChangeText={setSpecialConditionInput}
              multiline
              textAlignVertical="top"
              accessibilityLabel="Optional special care notes"
            />

            <Text style={styles.modalDescription}>
              Add only what you want to remember. These notes do not replace your pediatrician’s advice.
            </Text>

            <View
              style={
                styles.modalButtons
              }
            >
              <Pressable
                style={
                  styles.cancelButton
                }
                onPress={() =>
                  setShowBabyProfileModal(
                    false
                  )
                }
              >
                <Text
                  style={
                    styles.cancelText
                  }
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={
                  styles.primaryButton
                }
                onPress={
                  saveBabyProfile
                }
              >
                <Text
                  style={
                    styles.primaryText
                  }
                >
                  Save Details
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* =====================================================
          MEMORY MODAL
      ===================================================== */}

      <Modal
        visible={
          showMemoryModal
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowMemoryModal(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            <View
              style={
                styles.modalAccent
              }
            >
              <Text
                style={
                  styles.modalAccentText
                }
              >
                +
              </Text>
            </View>

            <Text
              style={
                styles.modalTitle
              }
            >
              {editingMemoryId !== null ? "Edit little moment" : "Save a little moment"}
            </Text>

            <Text
              style={
                styles.modalDescription
              }
            >
              What do you want to remember?
            </Text>

            <Pressable style={styles.photoPickerButton} onPress={chooseMemoryPhoto}>
              {memoryImageUri ? (
                <Image source={{ uri: memoryImageUri }} style={styles.photoPreview} resizeMode="cover" />
              ) : (
                <Text style={styles.photoPickerText}>＋ Add a photo from gallery</Text>
              )}
            </Pressable>

            <TextInput
              style={[
                styles.input,
                styles.textArea,
              ]}
              placeholder="Baby laughed during bath time..."
              placeholderTextColor={
                "#648384"
              }
              value={memoryText}
              onChangeText={
                setMemoryText
              }
              multiline
            />

            <View
              style={
                styles.modalButtons
              }
            >
              <Pressable
                style={
                  styles.cancelButton
                }
                onPress={() => {
                  setEditingMemoryId(null);
                  setEditingMemoryKind("memory");
                  setMemoryText("");
                  setMemoryImageUri(undefined);
                  setShowMemoryModal(false);
                }}
              >
                <Text
                  style={
                    styles.cancelText
                  }
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={
                  styles.primaryButton
                }
                onPress={() => addMemory("memory")}
              >
                <Text
                  style={
                    styles.primaryText
                  }
                >
                  {editingMemoryId !== null ? "Update Memory" : "Save Memory"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* =====================================================
          MILESTONE MODAL
      ===================================================== */}

      <Modal
        visible={
          showMilestoneModal
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowMilestoneModal(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            <View
              style={[
                styles.modalAccent,
                {
                  backgroundColor:
                    C.paleTeal,
                },
              ]}
            >
              <Text
                style={[
                  styles.modalAccentText,
                  {
                    color:
                      C.deepTeal,
                  },
                ]}
              >
                +
              </Text>
            </View>

            <Text
              style={
                styles.modalTitle
              }
            >
              {editingMemoryId !== null ? "Edit milestone" : "Add a milestone"}
            </Text>

            <Text
              style={
                styles.modalDescription
              }
            >
              Capture something new your
              baby has learned or done.
            </Text>

            <Pressable style={styles.photoPickerButton} onPress={chooseMemoryPhoto}>
              {memoryImageUri ? (
                <Image source={{ uri: memoryImageUri }} style={styles.photoPreview} resizeMode="cover" />
              ) : (
                <Text style={styles.photoPickerText}>＋ Add a photo (optional)</Text>
              )}
            </Pressable>

            <TextInput
              style={
                styles.input
              }
              placeholder="First smile, rolled over, sat up..."
              placeholderTextColor={
                "#648384"
              }
              value={memoryText}
              onChangeText={setMemoryText}
            />

            <View
              style={
                styles.modalButtons
              }
            >
              <Pressable
                style={
                  styles.cancelButton
                }
                onPress={() => {
                  setEditingMemoryId(null);
                  setEditingMemoryKind("memory");
                  setMemoryText("");
                  setMemoryImageUri(undefined);
                  setShowMilestoneModal(false);
                }}
              >
                <Text
                  style={
                    styles.cancelText
                  }
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={
                  styles.primaryButton
                }
                onPress={() => addMemory("milestone")}
              >
                <Text
                  style={
                    styles.primaryText
                  }
                >
                  {editingMemoryId !== null ? "Update Milestone" : "Add Milestone"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* =====================================================
          MOOD MODAL
      ===================================================== */}

      <Modal
        visible={
          showMoodModal
        }
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShowMoodModal(
            false
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={
              styles.modalCard
            }
          >
            <View
              style={[
                styles.modalAccent,
                {
                  backgroundColor:
                    C.softCoral,
                },
              ]}
            >
              <Text
                style={[
                  styles.modalAccentText,
                  {
                    color:
                      C.coral,
                  },
                ]}
              >
                ♡
              </Text>
            </View>

            <Text
              style={
                styles.modalTitle
              }
            >
              How is baby feeling?
            </Text>

            <Text
              style={
                styles.modalDescription
              }
            >
              Choose the closest description
              for today.
            </Text>

            {[
              "Happy",
              "Calm",
              "Sleepy",
              "Fussy",
            ].map((mood) => (
              <Pressable
                key={mood}
                style={[
                  styles.modalMoodButton,
                  data.mood === mood &&
                    styles.modalMoodButtonActive,
                ]}
                onPress={() =>
                  updateMood(
                    mood
                  )
                }
              >
                <View
                  style={[
                    styles.modalMoodDot,
                    data.mood === mood &&
                      styles.modalMoodDotActive,
                  ]}
                />

                <Text
                  style={[
                    styles.modalMoodText,
                    data.mood === mood &&
                      styles.modalMoodTextActive,
                  ]}
                >
                  {mood}
                </Text>

                {data.mood ===
                  mood && (
                  <Text
                    style={
                      styles.selectedCheck
                    }
                  >
                    ✓
                  </Text>
                )}
              </Pressable>
            ))}

            <Pressable
              style={
                styles.cancelFullButton
              }
              onPress={() =>
                setShowMoodModal(
                  false
                )
              }
            >
              <Text
                style={
                  styles.cancelText
                }
              >
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* =========================================================
   SECTION HEADING
========================================================= */

function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <View
      style={
        styles.sectionHeading
      }
    >
      <Text
        style={
          styles.sectionEyebrow
        }
      >
        {eyebrow}
      </Text>

      <Text
        style={
          styles.sectionTitle
        }
      >
        {title}
      </Text>
    </View>
  );
}

/* =========================================================
   CARE CARD
========================================================= */

function CareCard({
  symbol,
  number,
  label,
  buttonText,
  accent,
  onPress,
}: {
  symbol: string;
  number: number;
  label: string;
  buttonText: string;
  accent:
    | "coral"
    | "teal"
    | "yellow";
  onPress: () => void;
}) {
  const accentColor =
    accent === "coral"
      ? C.coral
      : accent === "teal"
      ? C.teal
      : "#0E7C86";

  const accentBackground =
    accent === "coral"
      ? C.softCoral
      : accent === "teal"
      ? C.paleTeal
      : C.softYellow;

  return (
    <View
      style={
        styles.statCard
      }
    >
      <View
        style={
          styles.statTopRow
        }
      >
        <View
          style={[
            styles.statIconBox,
            {
              backgroundColor:
                accentBackground,
            },
          ]}
        >
          <Text
            style={[
              styles.statSymbol,
              {
                color:
                  accentColor,
              },
            ]}
          >
            {symbol}
          </Text>
        </View>

        <View
          style={[
            styles.statIndicator,
            {
              backgroundColor:
                accentColor,
            },
          ]}
        />
      </View>

      <Text
        style={
          styles.statNumber
        }
      >
        {number}
      </Text>

      <Text
        style={
          styles.statLabel
        }
      >
        {label}
      </Text>

      <Pressable
        style={[
          styles.smallButton,
          {
            backgroundColor:
              accentBackground,
          },
        ]}
        onPress={onPress}
      >
        <Text
          style={[
            styles.smallButtonText,
            {
              color:
                accentColor,
            },
          ]}
        >
          {buttonText}
        </Text>
      </Pressable>
    </View>
  );
}

/* =========================================================
   VACCINE STATUS BADGE
========================================================= */

function VaccineStatusBadge({
  status,
}: {
  status: VaccineStatus;
}) {
  const config = {
    completed: {
      label: "Completed",
      color: C.success,
      bg: "#E8F8F6",
    },

    upcoming: {
      label: "Upcoming",
      color: C.deepTeal,
      bg: C.paleTeal,
    },

    due: {
      label: "Due now",
      color: C.coral,
      bg: C.softCoral,
    },

    overdue: {
      label: "Check with doctor",
      color: C.coral,
      bg: C.softCoral,
    },
  }[status];

  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor:
            config.bg,
        },
      ]}
    >
      <View
        style={[
          styles.statusBadgeDot,
          {
            backgroundColor:
              config.color,
          },
        ]}
      />

      <Text
        style={[
          styles.statusBadgeText,
          {
            color:
              config.color,
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

/* =========================================================
   VACCINE ROW
========================================================= */

function VaccineRow({
  item,
  onMarkGiven,
  onReminder,
  isLast,
}: {
  item: VaccineScheduleItem & {
    dueDate: Date;
    record?: VaccinationRecord;
    status: VaccineStatus;
  };

  onMarkGiven: () => void;
  onReminder: () => void;

  isLast: boolean;
}) {
  const days =
    getDaysDifference(
      item.dueDate,
      new Date()
    );

  const timingText =
    item.status === "upcoming"
      ? days === 1
        ? "Tomorrow"
        : `In ${days} days`
      : item.status === "due"
      ? "Due now"
      : item.status ===
        "overdue"
      ? "Date passed"
      : "Completed";

  return (
    <View
      style={[
        styles.vaccineRow,
        !isLast &&
          styles.vaccineRowBorder,
      ]}
    >
      <View
        style={
          styles.vaccineStatusDot
        }
      >
        <View
          style={
            styles.vaccineStatusDotInner
          }
        />
      </View>

      <View
        style={
          styles.vaccineRowMain
        }
      >
        <View
          style={
            styles.vaccineRowTitleLine
          }
        >
          <Text
            style={
              styles.vaccineRowTitle
            }
          >
            {item.vaccine}
          </Text>

          <Text
            style={
              styles.vaccineRowDose
            }
          >
            {item.dose}
          </Text>
        </View>

        <Text
          style={
            styles.vaccineRowAge
          }
        >
          {item.ageLabel} ·{" "}
          {formatDate(
            item.dueDate
          )}
        </Text>

        <Text
          style={[
            styles.vaccineTiming,
            item.status ===
              "overdue" &&
              styles.vaccineTimingWarning,
          ]}
        >
          {timingText}
        </Text>

        <View
          style={
            styles.vaccineActions
          }
        >
          <Pressable
            style={
              styles.markGivenButton
            }
            onPress={
              onMarkGiven
            }
          >
            <Text
              style={
                styles.markGivenText
              }
            >
              Mark given
            </Text>
          </Pressable>

          <Pressable
            style={
              styles.remindSmallButton
            }
            onPress={
              onReminder
            }
          >
            <Text
              style={
                styles.remindSmallText
              }
            >
              Remind me
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/* =========================================================
   SUPPLY ROW
========================================================= */

function SupplyRow({
  label,
  checked,
  onPress,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[
        styles.supplyRow,
        checked &&
          styles.supplyRowChecked,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.supplyCheck,
          checked &&
            styles.supplyCheckActive,
        ]}
      >
        {checked && (
          <Text
            style={
              styles.checkText
            }
          >
            ✓
          </Text>
        )}
      </View>

      <Text
        style={[
          styles.supplyText,
          checked &&
            styles.supplyTextChecked,
        ]}
      >
        {label}
      </Text>

      <View
        style={
          styles.supplyArrow
        }
      >
        <Text
          style={
            styles.supplyArrowText
          }
        >
          {checked
            ? "✓"
            : "›"}
        </Text>
      </View>
    </Pressable>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor:
      C.cream,
  },

  container: {
    flex: 1,
    backgroundColor:
      C.cream,
  },

  content: {
    paddingHorizontal: 18,
    paddingBottom: 32,
  },

  /* BACK */

  backButton: {
    marginTop: 18,
    marginBottom: 25,
    alignSelf:
      "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor:
      C.white,
    borderWidth: 1,
    borderColor:
      C.lightBorder,
  },

  backText: {
    fontSize: 13,
    color: C.dark,
    fontWeight: "700",
  },

  /* BACKGROUND */

  backgroundDecor: {
  ...StyleSheet.absoluteFill,
  overflow: "hidden",
},

  decorCircleOne: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor:
      "rgba(25,183,176,0.06)",
    right: -70,
    top: 90,
  },

  decorCircleTwo: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor:
      "rgba(255,107,107,0.05)",
    left: -55,
    top: 380,
  },

  /* HEADER */

  header: {
    marginBottom: 22,
  },

  headerTopRow: {
    flexDirection:
      "row",
    alignItems:
      "flex-start",
  },

  headerText: {
    flex: 1,
  },

  label: {
    fontSize: 10,
    letterSpacing: 2.3,
    color: C.deepTeal,
    fontWeight: "900",
  },

  title: {
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "900",
    color: C.dark,
    marginTop: 8,
    letterSpacing: -0.8,
  },

  titleAccent: {
    color: C.deepTeal,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: C.muted,
    marginTop: 11,
    maxWidth: 330,
  },

  headerShape: {
    width: 48,
    height: 72,
    marginLeft: 7,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  headerShapeLarge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor:
      "rgba(25,183,176,0.12)",
  },

  headerShapeSmall: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor:
      C.coral,
    position:
      "absolute",
    bottom: 3,
    left: 4,
  },

  /* HERO */

  heroCard: {
    backgroundColor:
      C.paleTeal,
    borderRadius: 30,
    padding: 19,
    flexDirection:
      "row",
    alignItems:
      "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor:
      "rgba(25,183,176,0.14)",
    marginBottom: 22,

    shadowColor:
      C.deepTeal,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 3,
  },

  heroGlow: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor:
      "rgba(255,255,255,0.55)",
    right: -65,
    top: -70,
  },

  heroBabyCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor:
      C.white,
    alignItems:
      "center",
    justifyContent:
      "center",
    borderWidth: 5,
    borderColor:
      "rgba(255,255,255,0.7)",
  },

  heroHeart: {
    fontSize: 40,
    color: C.coral,
  },

  heroInfo: {
    flex: 1,
    marginLeft: 15,
  },

  heroEyebrow: {
    fontSize: 9,
    letterSpacing: 1.7,
    color: C.teal,
    fontWeight: "900",
  },

  heroName: {
    fontSize: 21,
    color: C.dark,
    fontWeight: "900",
    marginTop: 3,
  },

  heroAge: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },

  heroMood: {
    flexDirection:
      "row",
    alignItems:
      "center",
    marginTop: 8,
  },

  heroMoodDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor:
      C.coral,
    marginRight: 6,
  },

  heroMoodText: {
    fontSize: 11,
    color: C.dark,
    fontWeight: "700",
  },

  profileEditButton: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 15,
    backgroundColor:
      C.white,
    borderWidth: 1,
    borderColor:
      "rgba(14,124,134,0.12)",
  },

  profileEditText: {
    fontSize: 11,
    color: C.deepTeal,
    fontWeight: "800",
  },

  /* SECTION */

  sectionHeaderRow: {
    flexDirection:
      "row",
    alignItems:
      "flex-end",
    justifyContent:
      "space-between",
    marginBottom: 8,
  },

  sectionHeading: {
    marginTop: 22,
    marginBottom: 10,
  },

  sectionEyebrow: {
    fontSize: 9,
    letterSpacing: 2,
    color: C.teal,
    fontWeight: "900",
    marginBottom: 5,
  },

  sectionTitle: {
    fontSize: 23,
    lineHeight: 28,
    color: C.dark,
    fontWeight: "900",
  },

  sectionDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: C.muted,
    marginBottom: 14,
  },

  resetButton: {
    backgroundColor:
      C.white,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 15,
    borderWidth: 1,
    borderColor:
      C.lightBorder,
  },

  resetText: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "800",
  },

  /* PROGRESS */

  progressCard: {
    backgroundColor:
      C.white,
    borderRadius: 25,
    padding: 19,
    marginBottom: 12,

    shadowColor:
      C.dark,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 2,
  },

  progressTopRow: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "center",
  },

  progressLabel: {
    fontSize: 9,
    letterSpacing: 1.8,
    color: C.muted,
    fontWeight: "900",
  },

  progressNumber: {
    fontSize: 28,
    color: C.dark,
    fontWeight: "900",
    marginTop: 3,
  },

  progressSlash: {
    fontSize: 12,
    color: C.muted,
    fontWeight: "600",
  },

  progressCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor:
      C.paleTeal,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  progressPercent: {
    color: C.deepTeal,
    fontSize: 12,
    fontWeight: "900",
  },

  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor:
      "#E8F8F6",
    marginTop: 17,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor:
      C.teal,
  },

  progressHint: {
    fontSize: 11,
    color: C.muted,
    marginTop: 11,
    lineHeight: 17,
  },

  /* STATS */

  statsRow: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    marginTop: 10,
  },

  statCard: {
    width: "48.2%",
    backgroundColor:
      C.white,
    borderRadius: 24,
    padding: 16,
    minHeight: 158,

    shadowColor:
      C.dark,
    shadowOpacity: 0.045,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 2,
  },

  statTopRow: {
    flexDirection:
      "row",
    alignItems:
      "center",
    justifyContent:
      "space-between",
  },

  statIconBox: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  statSymbol: {
    fontSize: 19,
    fontWeight: "800",
  },

  statIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  statNumber: {
    fontSize: 29,
    fontWeight: "900",
    color: C.dark,
    marginTop: 13,
  },

  statLabel: {
    fontSize: 11,
    color: C.muted,
    marginTop: 1,
    fontWeight: "600",
  },

  smallButton: {
    alignSelf:
      "flex-start",
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
  },

  smallButtonText: {
    fontSize: 10,
    fontWeight: "900",
  },

  lastCareTimesCard: {
    backgroundColor: C.white,
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: C.lightBorder,
  },

  lastCareTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },

  lastCareTimeLabel: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "700",
  },

  lastCareTimeValue: {
    color: C.deepTeal,
    fontSize: 11,
    fontWeight: "900",
  },

  lastCareTimeDivider: {
    height: 1,
    backgroundColor: C.lightBorder,
    marginVertical: 3,
  },
  foodChartCard: {
  backgroundColor: "#FFF9E8",
  borderRadius: 22,
  padding: 18,
  marginVertical: 10,
  borderWidth: 1,
  borderColor: "#FFDA57",
},

foodChartContent: {
  flexDirection: "row",
  alignItems: "center",
},

foodChartIcon: {
  width: 54,
  height: 54,
  borderRadius: 17,
  backgroundColor: "#FFDA57",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 14,
},

foodChartEmoji: {
  fontSize: 27,
},

foodChartText: {
  flex: 1,
},

foodChartTitle: {
  fontSize: 17,
  fontWeight: "700",
  color: "#164F52",
  marginBottom: 5,
},

foodChartSubtitle: {
  fontSize: 12,
  lineHeight: 18,
  color: "#648384",
},

foodChartArrow: {
  fontSize: 25,
  color: "#0E7C86",
  marginLeft: 8,
},

  /* VACCINATION */

  vaccinationHeader: {
    marginTop: 34,
    marginBottom: 13,
    flexDirection:
      "row",
    alignItems:
      "flex-end",
    justifyContent:
      "space-between",
  },

  vaccinationHeadingText: {
    flex: 1,
  },

  vaccineProgressPill: {
    flexDirection:
      "row",
    alignItems:
      "center",
    backgroundColor:
      C.paleTeal,
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  vaccineProgressNumber: {
    fontSize: 13,
    color: C.deepTeal,
    fontWeight: "900",
  },

  vaccineProgressText: {
    fontSize: 9,
    color: C.deepTeal,
    fontWeight: "700",
    marginLeft: 4,
  },

  vaccineSetupCard: {
    backgroundColor:
      C.white,
    borderRadius: 26,
    padding: 18,
    flexDirection:
      "row",
    borderWidth: 1,
    borderColor:
      C.lightBorder,
  },

  vaccineSetupIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor:
      C.paleTeal,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  vaccineSetupIconText: {
    color: C.deepTeal,
    fontSize: 24,
    fontWeight: "700",
  },

  vaccineSetupContent: {
    flex: 1,
    marginLeft: 13,
  },

  vaccineSetupTitle: {
    color: C.dark,
    fontSize: 16,
    fontWeight: "900",
  },

  vaccineSetupText: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  vaccineSetupButton: {
    alignSelf:
      "flex-start",
    marginTop: 10,
  },

  vaccineSetupButtonText: {
    color: C.deepTeal,
    fontSize: 11,
    fontWeight: "900",
  },

  nextVaccineCard: {
    backgroundColor:
      C.dark,
    borderRadius: 27,
    padding: 19,
    marginBottom: 12,
    overflow: "hidden",
  },

  nextVaccineTop: {
    flexDirection:
      "row",
    alignItems:
      "center",
    justifyContent:
      "space-between",
  },

  nextVaccineLabel: {
    fontSize: 9,
    letterSpacing: 2,
    color: C.yellow,
    fontWeight: "900",
  },

  nextVaccineTitle: {
    fontSize: 22,
    color: C.white,
    fontWeight: "900",
    marginTop: 4,
  },

  nextVaccineDose: {
    fontSize: 11,
    color: "#E8F8F6",
    marginTop: 3,
  },

  vaccineIconCircle: {
    width: 53,
    height: 53,
    borderRadius: 27,
    backgroundColor:
      "rgba(255,218,87,0.13)",
    alignItems:
      "center",
    justifyContent:
      "center",
    borderWidth: 1,
    borderColor:
      "rgba(255,218,87,0.25)",
  },

  vaccineIconText: {
    color: C.yellow,
    fontSize: 26,
    fontWeight: "500",
  },

  nextVaccineDivider: {
    height: 1,
    backgroundColor:
      "rgba(255,255,255,0.10)",
    marginVertical: 17,
  },

  nextVaccineBottom: {
    flexDirection:
      "row",
    alignItems:
      "center",
    justifyContent:
      "space-between",
  },

  nextVaccineDueLabel: {
    fontSize: 8,
    letterSpacing: 1.4,
    color: "#648384",
    fontWeight: "900",
  },

  nextVaccineDate: {
    fontSize: 15,
    color: C.white,
    fontWeight: "800",
    marginTop: 4,
  },

  statusBadge: {
    flexDirection:
      "row",
    alignItems:
      "center",
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 13,
  },

  statusBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: "900",
  },

  reminderButton: {
    marginTop: 16,
    backgroundColor:
      C.yellow,
    borderRadius: 15,
    paddingVertical: 11,
    paddingHorizontal: 14,
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "center",
  },

  reminderButtonText: {
    color: C.dark,
    fontSize: 11,
    fontWeight: "900",
  },

  reminderArrow: {
    color: C.dark,
    fontSize: 17,
    fontWeight: "900",
  },

  vaccineListCard: {
    backgroundColor:
      C.white,
    borderRadius: 26,
    padding: 18,
    borderWidth: 1,
    borderColor:
      C.lightBorder,
  },

  vaccineListHeader: {
    flexDirection:
      "row",
    alignItems:
      "center",
    justifyContent:
      "space-between",
    marginBottom: 5,
  },

  vaccineListEyebrow: {
    fontSize: 9,
    letterSpacing: 1.8,
    color: C.teal,
    fontWeight: "900",
  },

  vaccineListTitle: {
    fontSize: 16,
    color: C.dark,
    fontWeight: "900",
    marginTop: 3,
  },

  vaccineListCount: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor:
      C.paleTeal,
    color: C.deepTeal,
    textAlign:
      "center",
    textAlignVertical:
      "center",
    fontSize: 11,
    fontWeight: "900",
    paddingTop: 7,
  },

  vaccineRow: {
    flexDirection:
      "row",
    paddingVertical: 15,
  },

  vaccineRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor:
      C.lightBorder,
  },

  vaccineStatusDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor:
      C.paleTeal,
    alignItems:
      "center",
    justifyContent:
      "center",
    marginTop: 2,
  },

  vaccineStatusDotInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor:
      C.teal,
  },

  vaccineRowMain: {
    flex: 1,
    marginLeft: 10,
  },

  vaccineRowTitleLine: {
    flexDirection:
      "row",
    alignItems:
      "center",
  },

  vaccineRowTitle: {
    fontSize: 13,
    color: C.dark,
    fontWeight: "900",
    flex: 1,
  },

  vaccineRowDose: {
    fontSize: 9,
    color: C.deepTeal,
    backgroundColor:
      C.paleTeal,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: "800",
  },

  vaccineRowAge: {
    fontSize: 10,
    color: C.muted,
    marginTop: 4,
  },

  vaccineTiming: {
    fontSize: 10,
    color: C.teal,
    fontWeight: "800",
    marginTop: 3,
  },

  vaccineTimingWarning: {
    color: C.coral,
  },

  vaccineActions: {
    flexDirection:
      "row",
    marginTop: 9,
  },

  markGivenButton: {
    backgroundColor:
      C.paleTeal,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
  },

  markGivenText: {
    fontSize: 9,
    color: C.deepTeal,
    fontWeight: "900",
  },

  remindSmallButton: {
    backgroundColor:
      C.softYellow,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 7,
  },

  remindSmallText: {
    fontSize: 9,
    color: "#0E7C86",
    fontWeight: "900",
  },

  allVaccinesDone: {
    paddingVertical: 20,
    alignItems:
      "center",
  },

  allVaccinesDoneCheck: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor:
      "#E8F8F6",
    color: C.success,
    textAlign:
      "center",
    textAlignVertical:
      "center",
    fontSize: 20,
    fontWeight: "900",
    paddingTop: 7,
  },

  allVaccinesDoneText: {
    marginTop: 9,
    color: C.muted,
    fontSize: 11,
  },

  vaccineDisclaimer: {
    fontSize: 9,
    lineHeight: 14,
    color: "#648384",
    marginTop: 9,
    paddingHorizontal: 3,
  },

  /* UPDATED */

  updatedCard: {
    marginTop: 14,
    backgroundColor:
      C.white,
    borderRadius: 20,
    padding: 15,
    flexDirection:
      "row",
    alignItems:
      "center",
    borderWidth: 1,
    borderColor:
      C.lightBorder,
  },

  updatedIcon: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor:
      C.softYellow,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  updatedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor:
      "#FFDA57",
  },

  updatedContent: {
    flex: 1,
    marginLeft: 11,
  },

  updatedLabel: {
    fontSize: 8,
    letterSpacing: 1.5,
    color: C.muted,
    fontWeight: "900",
  },

  updatedText: {
    fontSize: 11,
    lineHeight: 17,
    color: C.dark,
    marginTop: 3,
  },

  updatedArrow: {
    fontSize: 23,
    color: C.muted,
  },

  /* SHARED */

  sharedCard: {
    marginTop: 14,
    backgroundColor:
      C.softCoral,
    borderRadius: 25,
    padding: 18,
    borderWidth: 1,
    borderColor:
      "rgba(255,107,107,0.10)",
  },

  sharedTopRow: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "flex-start",
  },

  sharedLabel: {
    fontSize: 9,
    letterSpacing: 1.8,
    color: C.coral,
    fontWeight: "900",
  },

  sharedTitle: {
    fontSize: 20,
    color: C.dark,
    fontWeight: "900",
    marginTop: 4,
  },

  sharedMiniCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor:
      C.white,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  sharedMiniText: {
    color: C.coral,
    fontSize: 20,
    fontWeight: "700",
  },

  sharedText: {
    fontSize: 12,
    lineHeight: 19,
    color: C.muted,
    marginTop: 12,
  },

  parentRow: {
    flexDirection:
      "row",
    alignItems:
      "center",
    marginTop: 15,
  },

  parentBadge: {
    flexDirection:
      "row",
    alignItems:
      "center",
    backgroundColor:
      C.white,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  parentDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },

  parentBadgeText: {
    fontSize: 10,
    color: C.dark,
    fontWeight: "800",
  },

  plusText: {
    color: C.muted,
    marginHorizontal: 8,
    fontWeight: "900",
  },

  /* MOOD */

  moodRow: {
    flexDirection:
      "row",
    flexWrap:
      "wrap",
    marginBottom: 2,
  },

  moodOption: {
    flexDirection:
      "row",
    alignItems:
      "center",
    backgroundColor:
      C.white,
    borderWidth: 1,
    borderColor:
      C.lightBorder,
    borderRadius: 17,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: 7,
    marginBottom: 7,
  },

  moodOptionActive: {
    backgroundColor:
      C.paleTeal,
    borderColor:
      "rgba(25,183,176,0.2)",
  },

  moodOptionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor:
      "#E8F8F6",
    marginRight: 6,
  },

  moodOptionDotActive: {
    backgroundColor:
      C.teal,
  },

  moodOptionText: {
    fontSize: 10,
    color: C.muted,
    fontWeight: "700",
  },

  moodOptionTextActive: {
    color: C.deepTeal,
    fontWeight: "900",
  },

  /* MEMORY */

  memoryCard: {
    backgroundColor:
      C.white,
    borderRadius: 25,
    padding: 12,
    flexDirection:
      "row",
    borderWidth: 1,
    borderColor:
      C.lightBorder,
  },

  memoryPlaceholder: {
    width: 105,
    minHeight: 115,
    borderRadius: 18,
    backgroundColor:
      C.softYellow,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  memoryInnerCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor:
      C.white,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  memorySymbol: {
    fontSize: 24,
    color: "#0E7C86",
  },

  memoryContent: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },

  memoryTitleRow: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
  },

  memoryTitle: {
    flex: 1,
    fontSize: 15,
    color: C.dark,
    fontWeight: "900",
  },

  memoryArrow: {
    fontSize: 19,
    color: C.deepTeal,
  },

  memoryText: {
    fontSize: 11,
    lineHeight: 17,
    color: C.muted,
    marginTop: 7,
  },

  memoryButton: {
    fontSize: 10,
    color: C.deepTeal,
    fontWeight: "900",
    marginTop: 11,
  },

  savedMemories: {
    marginTop: 9,
  },

  savedMemory: {
    flexDirection:
      "row",
    alignItems:
      "center",
    backgroundColor:
      C.white,
    borderRadius: 15,
    padding: 12,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor:
      C.coral,
  },

  memoryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor:
      C.coral,
    marginRight: 9,
  },

  savedMemoryText: {
    flex: 1,
    fontSize: 11,
    color: C.dark,
    lineHeight: 17,
  },

  /* COMBINED MEMORY GALLERY */

  memoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  memoryTile: {
    width: "48.5%",
    backgroundColor: C.white,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.lightBorder,
  },

  memoryPhoto: {
    width: "100%",
    height: 125,
    backgroundColor: C.paleTeal,
  },

  memoryPhotoPlaceholder: {
    height: 125,
    backgroundColor: C.paleTeal,
    alignItems: "center",
    justifyContent: "center",
  },

  memoryPlaceholderHeart: {
    fontSize: 42,
    color: C.teal,
  },

  memoryTileBody: {
    padding: 11,
  },

  memoryKind: {
    fontSize: 8,
    letterSpacing: 1.1,
    color: C.deepTeal,
    fontWeight: "900",
    marginBottom: 5,
  },

  memoryDate: {
    fontSize: 9,
    color: C.muted,
    marginTop: 6,
  },

  emptyMemoryCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.lightBorder,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  addMilestoneInline: {
    alignSelf: "flex-start",
    backgroundColor: C.paleTeal,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 7,
    marginBottom: 10,
  },

  addMilestoneInlineText: {
    color: C.deepTeal,
    fontSize: 11,
    fontWeight: "900",
  },

  photoPickerButton: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: C.paleTeal,
    borderWidth: 1,
    borderColor: C.lightBorder,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 11,
  },

  photoPickerText: {
    color: C.deepTeal,
    fontSize: 12,
    fontWeight: "800",
    padding: 12,
  },

  photoPreview: {
    width: "100%",
    height: 155,
  },

  /* MILESTONES */

  addButton: {
    backgroundColor:
      C.paleTeal,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },

  addButtonText: {
    color: C.deepTeal,
    fontSize: 10,
    fontWeight: "900",
  },

  milestoneCard: {
    backgroundColor:
      C.white,
    borderRadius: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor:
      C.lightBorder,
  },

  milestone: {
    flexDirection:
      "row",
    alignItems:
      "center",
    paddingVertical: 15,
  },

  milestoneBorder: {
    borderBottomWidth: 1,
    borderBottomColor:
      C.lightBorder,
  },

  milestoneNumber: {
    width: 31,
    height: 31,
    borderRadius: 11,
    backgroundColor:
      C.paleTeal,
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  milestoneNumberText: {
    fontSize: 9,
    color: C.deepTeal,
    fontWeight: "900",
  },

  milestoneLine: {
    flex: 1,
    flexDirection:
      "row",
    alignItems:
      "center",
    marginLeft: 12,
  },

  milestoneDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor:
      C.teal,
    marginRight: 8,
  },

  milestoneText: {
    flex: 1,
    fontSize: 12,
    color: C.dark,
    fontWeight: "700",
  },

  milestoneCheck: {
    color: C.teal,
    fontSize: 17,
    fontWeight: "900",
  },

  /* SUPPLIES */

  suppliesCard: {
    marginTop: 29,
    backgroundColor:
      C.dark,
    borderRadius: 26,
    padding: 18,
  },

  suppliesTopRow: {
    flexDirection:
      "row",
    justifyContent:
      "space-between",
    alignItems:
      "center",
  },

  suppliesLabel: {
    fontSize: 9,
    letterSpacing: 1.8,
    color: C.yellow,
    fontWeight: "900",
  },

  suppliesTitle: {
    fontSize: 20,
    color: C.white,
    fontWeight: "900",
    marginTop: 4,
  },

  suppliesCount: {
    flexDirection:
      "row",
    alignItems:
      "baseline",
  },

  suppliesCountNumber: {
    fontSize: 24,
    color: C.yellow,
    fontWeight: "900",
  },

  suppliesCountText: {
    color: "#E8F8F6",
    fontSize: 11,
    marginLeft: 2,
  },

  suppliesText: {
    fontSize: 11,
    lineHeight: 17,
    color: "#E8F8F6",
    marginTop: 8,
    marginBottom: 9,
  },

  supplyRow: {
    flexDirection:
      "row",
    alignItems:
      "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor:
      "rgba(255,255,255,0.08)",
  },

  supplyRowChecked: {
    opacity: 0.7,
  },

  supplyCheck: {
    width: 23,
    height: 23,
    borderRadius: 8,
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.25)",
    alignItems:
      "center",
    justifyContent:
      "center",
  },

  supplyCheckActive: {
    backgroundColor:
      C.teal,
    borderColor:
      C.teal,
  },

  checkText: {
    color: C.white,
    fontSize: 13,
    fontWeight: "900",
  },

  supplyText: {
    flex: 1,
    marginLeft: 10,
    color: C.white,
    fontSize: 11,
    fontWeight: "700",
  },

  supplyTextChecked: {
    textDecorationLine:
      "line-through",
    color: "#648384",
  },

  supplyArrow: {
    width: 22,
    alignItems:
      "center",
  },

  supplyArrowText: {
    color: "#648384",
    fontSize: 17,
  },

  /* FOOTER */

  footer: {
    alignItems:
      "center",
    marginTop: 24,
  },

  footerLine: {
    width: 55,
    height: 3,
    borderRadius: 2,
    backgroundColor:
      C.yellow,
    marginBottom: 12,
  },

  footerText: {
    fontSize: 11,
    color: C.muted,
  },

  footerDots: {
    flexDirection:
      "row",
    marginTop: 10,
  },

  footerDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor:
      "#E8F8F6",
    marginHorizontal: 3,
  },

  footerDotActive: {
    backgroundColor:
      C.teal,
  },

  /* MODAL */

  modalOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(22,79,82,0.42)",
    alignItems:
      "center",
    justifyContent:
      "center",
    padding: 22,
  },

  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor:
      C.white,
    borderRadius: 28,
    padding: 22,
  },

  modalAccent: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor:
      C.paleTeal,
    alignItems:
      "center",
    justifyContent:
      "center",
    marginBottom: 15,
  },

  modalAccentText: {
    color: C.deepTeal,
    fontSize: 22,
    fontWeight: "800",
  },

  modalTitle: {
    fontSize: 22,
    color: C.dark,
    fontWeight: "900",
  },

  modalDescription: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 14,
  },

  inputLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: C.deepTeal,
    fontWeight: "900",
    marginBottom: 6,
    marginTop: 7,
  },

  input: {
    minHeight: 48,
    borderRadius: 15,
    backgroundColor:
      C.cream,
    borderWidth: 1,
    borderColor:
      C.lightBorder,
    paddingHorizontal: 13,
    paddingVertical: 11,
    color: C.dark,
    fontSize: 13,
  },

  textArea: {
    minHeight: 100,
    textAlignVertical:
      "top",
  },

  modalButtons: {
    flexDirection:
      "row",
    marginTop: 17,
  },

  cancelButton: {
    flex: 1,
    backgroundColor:
      "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems:
      "center",
    marginRight: 6,
  },

  cancelText: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "800",
  },

  primaryButton: {
    flex: 1,
    backgroundColor:
      C.deepTeal,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems:
      "center",
    marginLeft: 6,
  },

  primaryText: {
    color: C.white,
    fontSize: 11,
    fontWeight: "900",
  },

  modalMoodButton: {
    flexDirection:
      "row",
    alignItems:
      "center",
    borderRadius: 15,
    padding: 13,
    backgroundColor:
      C.cream,
    marginTop: 7,
  },

  modalMoodButtonActive: {
    backgroundColor:
      C.paleTeal,
  },

  modalMoodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor:
      "#E8F8F6",
    marginRight: 9,
  },

  modalMoodDotActive: {
    backgroundColor:
      C.teal,
  },

  modalMoodText: {
    flex: 1,
    color: C.muted,
    fontSize: 12,
    fontWeight: "700",
  },

  modalMoodTextActive: {
    color: C.deepTeal,
    fontWeight: "900",
  },

  selectedCheck: {
    color: C.teal,
    fontSize: 17,
    fontWeight: "900",
  },

  cancelFullButton: {
    marginTop: 10,
    backgroundColor:
      "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems:
      "center",
  },
});