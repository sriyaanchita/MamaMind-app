import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { logActivity } from "../utils/activityLogger";

const MEDICATION_KEY = "mamamind_medications";

/*
 * IMPORTANT:
 * This is a new channel ID.
 * We are using a new one because Android remembers old
 * notification channel settings.
 */
const CHANNEL_ID = "medication-reminders-v2";

type Medicine = {
  id: string;
  medicineName: string;
  medicineTime: string;
  saved: boolean;
  taken: boolean;
  takenDate: string | null;
  notificationId: string | null;
};

/* =========================================================
   NOTIFICATION HANDLER
========================================================= */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/* =========================================================
   SCREEN
========================================================= */

export default function MedicationScreen() {
  const router = useRouter();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [medicineName, setMedicineName] = useState("");
  const [medicineTime, setMedicineTime] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  /* =======================================================
     INITIAL SETUP
  ======================================================= */

  useEffect(() => {
    loadMedicines();
    setupNotifications();
  }, []);

  /* =======================================================
     NOTIFICATION SETUP
  ======================================================= */

  const setupNotifications = async () => {
    try {
      if (Platform.OS === "android") {
        /*
         * IMPORTANT:
         * Do NOT put sound: "default" here.
         *
         * Android notification channels remember their
         * configuration once created.
         */
        await Notifications.setNotificationChannelAsync(
          CHANNEL_ID,
          {
            name: "Medication Reminders",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
          }
        );
      }

      const permission =
        await Notifications.getPermissionsAsync();

      if (permission.status !== "granted") {
        const requested =
          await Notifications.requestPermissionsAsync();

        console.log(
          "Notification permission:",
          requested.status
        );
      }
    } catch (error) {
      console.log(
        "Notification setup error:",
        error
      );
    }
  };

  /* =======================================================
     LOAD MEDICINES
  ======================================================= */

  const loadMedicines = async () => {
  try {
    const stored = await AsyncStorage.getItem(MEDICATION_KEY);

    const localMedicines: Medicine[] = stored
      ? JSON.parse(stored)
      : [];

    const user = auth.currentUser;

    if (!user) {
      setMedicines(localMedicines);
      return;
    }

    const medicinesRef = collection(
      db,
      "users",
      user.uid,
      "medications"
    );

    const snapshot = await getDocs(medicinesRef);

    const cloudMedicines: Medicine[] = snapshot.docs.map(
      (item) => item.data() as Medicine
    );

    const merged = new Map<string, Medicine>();

    localMedicines.forEach((medicine) => {
      merged.set(medicine.id, medicine);
    });

    // Cloud version takes priority for matching IDs.
    cloudMedicines.forEach((medicine) => {
      merged.set(medicine.id, medicine);
    });

    const today = new Date().toISOString().slice(0, 10);

    const updated = Array.from(merged.values()).map(
      (medicine) => ({
        ...medicine,
        taken:
          medicine.taken === true &&
          medicine.takenDate === today,
      })
    );

    // Save merged data locally.
    await AsyncStorage.setItem(
      MEDICATION_KEY,
      JSON.stringify(updated)
    );

    // Upload local medicines that aren't in the cloud yet.
    await Promise.all(
      updated.map((medicine) =>
        setDoc(
          doc(medicinesRef, medicine.id),
          medicine,
          { merge: true }
        )
      )
    );

    setMedicines(updated);
    console.log("Medicines loaded and synced:", updated);
  } catch (error) {
    console.log("Error loading medicines:", error);

    // Fall back to local storage if cloud access fails.
    try {
      const stored = await AsyncStorage.getItem(MEDICATION_KEY);
      setMedicines(stored ? JSON.parse(stored) : []);
    } catch {
      setMedicines([]);
    }
  }
};

  /* =======================================================
     SAVE TO ASYNC STORAGE
  ======================================================= */

const persistMedicines = async (
  updatedMedicines: Medicine[]
) => {
  // Save locally first.
  try {
    await AsyncStorage.setItem(
      MEDICATION_KEY,
      JSON.stringify(updatedMedicines)
    );

    setMedicines(updatedMedicines);
  } catch (error) {
    console.log("AsyncStorage save error:", error);

    Alert.alert(
      "Save error",
      "The medicine could not be saved on this device."
    );

    return;
  }

  // Sync the complete list for the signed-in user.
  try {
    const user = auth.currentUser;

    if (!user) {
      console.log("Medicines saved locally; user is signed out.");
      return;
    }

    const medicinesRef = collection(
      db,
      "users",
      user.uid,
      "medications"
    );

    const snapshot = await getDocs(medicinesRef);

    const currentIds = new Set(
      updatedMedicines.map((medicine) => medicine.id)
    );

    // Remove cloud records that were removed from the list.
    await Promise.all(
      snapshot.docs
        .filter((item) => !currentIds.has(item.id))
        .map((item) => deleteDoc(item.ref))
    );

    // Create or update the remaining records.
    await Promise.all(
      updatedMedicines.map((medicine) =>
        setDoc(
          doc(medicinesRef, medicine.id),
          medicine
        )
      )
    );

    console.log("Medicines synced to Firestore.");
  } catch (error) {
    console.log("Medicine cloud sync failed:", error);
    Alert.alert(
      "Cloud sync issue",
      "Your changes are saved on this device, but could not be synced to your account."
    );
  }
};

  /* =======================================================
     PARSE TIME
  ======================================================= */

  const parseTime = (time: string) => {
    const normalized = time
      .trim()
      .toUpperCase();

    const match = normalized.match(
      /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/
    );

    if (!match) {
      return null;
    }

    let hour = Number(match[1]);
    const minute = Number(match[2]);
    const period = match[3];

    if (minute > 59) {
      return null;
    }

    /* 12-hour format */

    if (period) {
      if (hour < 1 || hour > 12) {
        return null;
      }

      if (period === "AM" && hour === 12) {
        hour = 0;
      }

      if (period === "PM" && hour !== 12) {
        hour += 12;
      }
    }

    /* 24-hour format */

    else {
      if (hour > 23) {
        return null;
      }
    }

    return {
      hour,
      minute,
    };
  };

  /* =======================================================
     SCHEDULE MEDICINE REMINDER
  ======================================================= */

  const scheduleMedicineReminder = async (
    name: string,
    time: string
  ) => {
    try {
      const permission =
        await Notifications.getPermissionsAsync();

      let finalPermission = permission;

      if (permission.status !== "granted") {
        finalPermission =
          await Notifications.requestPermissionsAsync();
      }

      if (finalPermission.status !== "granted") {
        Alert.alert(
          "Notifications disabled",
          "The medicine can still be saved, but reminders are disabled. Please enable notifications in Android settings."
        );

        return null;
      }

      const parsedTime = parseTime(time);

      if (!parsedTime) {
        Alert.alert(
          "Invalid time",
          "Please enter the time like 9:00 AM or 21:00."
        );

        return null;
      }

      /*
       * Make sure the channel exists.
       *
       * NO sound: "default" here.
       */
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(
          CHANNEL_ID,
          {
            name: "Medication Reminders",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
          }
        );
      }

      /*
       * Schedule DAILY notification.
       */
      const notificationId =
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Gentle medicine reminder",

            body:
              "It's time to take your " +
              name +
              ".",

            /*
             * We intentionally omit sound here.
             * Android channel controls the notification sound.
             */

            data: {
              type: "medication",
              medicineName: name,
            },
          },

          trigger: {
            type:
              Notifications
                .SchedulableTriggerInputTypes
                .DAILY,

            hour: parsedTime.hour,
            minute: parsedTime.minute,

            ...(Platform.OS === "android"
              ? {
                  channelId: CHANNEL_ID,
                }
              : {}),
          },
        });

      console.log(
        "Scheduled notification:",
        notificationId
      );

      return notificationId;
    } catch (error) {
      console.log(
        "Notification scheduling error:",
        error
      );

      /*
       * Return null instead of crashing.
       * The medicine itself can still be saved.
       */
      return null;
    }
  };

  /* =======================================================
     SAVE / UPDATE MEDICINE
  ======================================================= */

  const saveMedicine = async () => {
    const cleanName = medicineName.trim();
    const cleanTime = medicineTime.trim();

    if (!cleanName) {
  Alert.alert(
    "Missing information",
    "Please enter the medicine name."
  );
  return;
}


   if (cleanTime && !parseTime(cleanTime)) {
  Alert.alert(
    "Invalid time",
    "Enter the time like 9:00 AM or 21:00."
  );
  return;
}

    try {
      /* ==================================================
         EDIT EXISTING MEDICINE
      ================================================== */

      if (editingId) {
        const existingMedicine =
          medicines.find(
            (medicine) =>
              medicine.id === editingId
          );

        /*
         * Cancel old notification.
         */

        if (
          existingMedicine?.notificationId
        ) {
          try {
            await Notifications.cancelScheduledNotificationAsync(
              existingMedicine.notificationId
            );
          } catch (error) {
            console.log(
              "Could not cancel old notification:",
              error
            );
          }
        }

        /*
         * Schedule new notification.
         */

        const notificationId = cleanTime
  ? await scheduleMedicineReminder(cleanName, cleanTime)
  : null;


        /*
         * Even if notification scheduling fails,
         * save the medicine.
         */

        const updatedMedicines =
          medicines.map((medicine) => {
            if (medicine.id !== editingId) {
              return medicine;
            }

            return {
              ...medicine,

              medicineName:
                cleanName,

              medicineTime:
                cleanTime,

              saved: true,

              taken: false,

              takenDate: null,

              notificationId:
                notificationId,
            };
          });

        await persistMedicines(
          updatedMedicines
        );

        setEditingId(null);
        setMedicineName("");
        setMedicineTime("");

        if (notificationId) {
          Alert.alert(
            "Medicine updated",
            "Your daily medicine reminder has been updated."
          );
        } else {
          Alert.alert(
            "Medicine updated",
            "Your medicine was saved, but the notification could not be scheduled."
          );
        }

        return;
      }

      /* ==================================================
         ADD NEW MEDICINE
      ================================================== */

      const notificationId =
        await scheduleMedicineReminder(
          cleanName,
          cleanTime
        );

      const newMedicine: Medicine = {
        id: Date.now().toString(),

        medicineName:
          cleanName,

        medicineTime:
          cleanTime,

        saved: true,

        taken: false,

        takenDate: null,

        notificationId:
          notificationId,
      };

      const updatedMedicines = [
        ...medicines,
        newMedicine,
      ];

      /*
       * SAVE TO ASYNC STORAGE
       */

      await persistMedicines(
        updatedMedicines
      );

      /*
       * Clear form.
       */

      setMedicineName("");
      setMedicineTime("");

      console.log(
        "New medicine saved:",
        newMedicine
      );

      if (notificationId) {
        Alert.alert(
          "Medicine added",
          "Your daily medicine reminder has been created."
        );
      } else {
        Alert.alert(
          "Medicine saved",
          "Your medicine was saved, but the notification could not be scheduled."
        );
      }
    } catch (error) {
      console.log(
        "Error saving medicine:",
        error
      );

      Alert.alert(
        "Error",
        "Could not save the medicine."
      );
    }
  };

  /* =======================================================
     MARK MEDICINE AS TAKEN
  ======================================================= */

  const markTaken = async (
    medicineId: string
  ) => {
    try {
      const today = new Date()
        .toISOString()
        .slice(0, 10);

      const updatedMedicines =
        medicines.map((medicine) => {
          if (
            medicine.id !== medicineId
          ) {
            return medicine;
          }

          return {
            ...medicine,

            taken: true,

            takenDate: today,
          };
        });

      await persistMedicines(
        updatedMedicines
      );
      // Log medication activity
const takenMedicine = medicines.find(
  (medicine) => medicine.id === medicineId
);

if (takenMedicine) {
  await logActivity("medication", {
    medicineName: takenMedicine.medicineName,
    medicineTime: takenMedicine.medicineTime,
  });
}

      Alert.alert(
        "Well done",
        "Your medicine has been marked as taken for today."
      );
    } catch (error) {
      console.log(
        "Error marking medicine:",
        error
      );
    }
  };

  /* =======================================================
     EDIT MEDICINE
  ======================================================= */

  const editMedicine = (
    medicine: Medicine
  ) => {
    setMedicineName(
      medicine.medicineName
    );

    setMedicineTime(
      medicine.medicineTime
    );

    setEditingId(
      medicine.id
    );
  };

  /* =======================================================
     DELETE MEDICINE
  ======================================================= */

  const deleteMedicine = (
    medicine: Medicine
  ) => {
    Alert.alert(
      "Remove medicine?",
      "Remove this medicine and its daily reminder?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Remove",
          style: "destructive",

          onPress: async () => {
            try {
              /*
               * Cancel notification.
               */

              if (
                medicine.notificationId
              ) {
                try {
                  await Notifications.cancelScheduledNotificationAsync(
                    medicine.notificationId
                  );
                } catch (error) {
                  console.log(
                    "Could not cancel notification:",
                    error
                  );
                }
              }

              /*
               * Remove medicine.
               */

              const updatedMedicines =
                medicines.filter(
                  (item) =>
                    item.id !==
                    medicine.id
                );

              await persistMedicines(
                updatedMedicines
              );

              /*
               * Clear form if editing.
               */

              if (
                editingId ===
                medicine.id
              ) {
                setEditingId(null);
                setMedicineName("");
                setMedicineTime("");
              }
            } catch (error) {
              console.log(
                "Error deleting medicine:",
                error
              );
            }
          },
        },
      ]
    );
  };

  /* =======================================================
     CANCEL EDIT
  ======================================================= */

  const cancelEdit = () => {
    setEditingId(null);
    setMedicineName("");
    setMedicineTime("");
  };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={C.cream}
      />

      <ScrollView
        contentContainerStyle={
          styles.container
        }
        showsVerticalScrollIndicator={
          false
        }
      >
        {/* BACK BUTTON */}

        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>
            ‹
          </Text>

          <Text
            style={styles.backLabel}
          >
            Back
          </Text>
        </Pressable>

        {/* HEADER */}

        <View style={styles.header}>
          <Text style={styles.eyebrow}>
            MEDICATION COMPANION
          </Text>

          <Text style={styles.title}>
            Gentle support for your medicine
          </Text>

          <Text style={styles.subtitle}>
            MamaMind will remember them for you,
            so you don't have to.
          </Text>
        </View>

        {/* MEDICINE LIST */}

        {medicines.length > 0 && (
          <View
            style={
              styles.medicineSection
            }
          >
            <View
              style={
                styles.sectionHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.sectionLabel
                  }
                >
                  YOUR MEDICINES
                </Text>

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Daily reminders
                </Text>
              </View>

              <View
                style={
                  styles.countBubble
                }
              >
                <Text
                  style={
                    styles.countText
                  }
                >
                  {medicines.length}
                </Text>
              </View>
            </View>

            {medicines.map(
              (medicine) => (
                <View
                  key={medicine.id}
                  style={
                    styles.medicineCard
                  }
                >
                  {/* TOP */}

                  <View
                    style={styles.cardTop}
                  >
                    <View
                      style={
                        styles.medicineInfo
                      }
                    >
                      <Text
                        style={
                          styles.cardLabel
                        }
                      >
                        MEDICINE
                      </Text>

                      <Text
                        style={
                          styles.medicineName
                        }
                      >
                        {
                          medicine.medicineName
                        }
                      </Text>
                    </View>

                    <View
                      style={
                        styles.timeBubble
                      }
                    >
                      <Text
                        style={
                          styles.timeText
                        }
                      >
                        {
                          medicine.medicineTime
                        }
                      </Text>
                    </View>
                  </View>

                  <View
                    style={styles.divider}
                  />

                  {/* TAKEN STATUS */}

                  {medicine.taken ? (
                    <View
                      style={
                        styles.takenBox
                      }
                    >
                      <Text
                        style={
                          styles.takenTitle
                        }
                      >
                        Medicine taken
                      </Text>

                      <Text
                        style={
                          styles.takenSubtitle
                        }
                      >
                        You've taken this
                        medicine today.
                      </Text>
                    </View>
                  ) : (
                    <Pressable
                      style={
                        styles.takeButton
                      }
                      onPress={() =>
                        markTaken(
                          medicine.id
                        )
                      }
                    >
                      <Text
                        style={
                          styles.takeButtonText
                        }
                      >
                        I took it
                      </Text>
                    </Pressable>
                  )}

                  {/* EDIT / REMOVE */}

                  <View
                    style={
                      styles.actionRow
                    }
                  >
                    <Pressable
                      style={
                        styles.changeButton
                      }
                      onPress={() =>
                        editMedicine(
                          medicine
                        )
                      }
                    >
                      <Text
                        style={
                          styles.changeButtonText
                        }
                      >
                        Edit
                      </Text>
                    </Pressable>

                    <Pressable
                      style={
                        styles.deleteButton
                      }
                      onPress={() =>
                        deleteMedicine(
                          medicine
                        )
                      }
                    >
                      <Text
                        style={
                          styles.deleteButtonText
                        }
                      >
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )
            )}
          </View>
        )}

        {/* ADD / EDIT FORM */}

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>
            {editingId
              ? "Change medicine"
              : medicines.length > 0
              ? "Add another medicine"
              : "Add your medicine"}
          </Text>

          <Text
            style={styles.inputLabel}
          >
            Medicine name
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Example: Iron Tablet"
            placeholderTextColor={
              C.muted
            }
            value={medicineName}
            onChangeText={
              setMedicineName
            }
            autoCapitalize="words"
          />

          <Text
            style={styles.inputLabel}
          >
            Reminder time
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Example: 9:00 AM"
            placeholderTextColor={
              C.muted
            }
            value={medicineTime}
            onChangeText={
              setMedicineTime
            }
            keyboardType="numbers-and-punctuation"
          />

          <Text
            style={styles.helperText}
          >
            Enter Time with AM and PM.
          </Text>

          <Pressable
            style={styles.saveButton}
            onPress={saveMedicine}
          >
            <Text
              style={
                styles.saveButtonText
              }
            >
              {editingId
                ? "Update medicine"
                : "Save medicine"}
            </Text>
          </Pressable>

          {editingId && (
            <Pressable
              style={
                styles.cancelButton
              }
              onPress={cancelEdit}
            >
              <Text
                style={
                  styles.cancelButtonText
                }
              >
                Cancel
              </Text>
            </Pressable>
          )}
        </View>

        {/* VOICE CARD */}

        <View
          style={styles.voiceCard}
        >
          <View
            style={styles.voiceCircle}
          >
            <Text
              style={styles.voiceMark}
            >
              V
            </Text>
          </View>

          <View
            style={styles.voiceContent}
          >
            <Text
              style={styles.voiceTitle}
            >
              Soon, just tell MamaMind
            </Text>

            <Text
              style={styles.voiceText}
            >
              "Remind me to take my medicine
              at 9 AM."
            </Text>

            <Text
              style={styles.voiceSmall}
            >
              Voice interaction can later add
              medicines without typing.
            </Text>
          </View>
        </View>

        {/* INFO CARD */}

        <View
          style={styles.infoCard}
        >
          <Text
            style={styles.infoTitle}
          >
            How your reminders work
          </Text>

          <Text
            style={styles.infoText}
          >
            Each medicine has its own daily
            reminder. Your medicine details are
            saved on this device, and MamaMind
            will remind you at the time you
            selected.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   COLORS
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
};

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.cream,
  },

  container: {
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 40,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 24,
  },

  backText: {
    fontSize: 32,
    lineHeight: 32,
    color: C.dark,
    marginRight: 5,
  },

  backLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: C.dark,
  },

  header: {
    marginBottom: 24,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.8,
    color: C.teal,
    marginBottom: 8,
  },

  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: C.dark,
    maxWidth: 350,
  },

  subtitle: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: C.muted,
    maxWidth: 340,
  },

  medicineSection: {
    marginBottom: 4,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: C.muted,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.dark,
    marginTop: 4,
  },

  countBubble: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.paleTeal,
    alignItems: "center",
    justifyContent: "center",
  },

  countText: {
    fontSize: 14,
    fontWeight: "800",
    color: C.deepTeal,
  },

  medicineCard: {
    backgroundColor: C.white,
    borderRadius: 26,
    padding: 22,
    marginBottom: 14,

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 3,
  },

  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  medicineInfo: {
    flex: 1,
    paddingRight: 12,
  },

  cardLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: C.muted,
    marginBottom: 7,
  },

  medicineName: {
    fontSize: 21,
    fontWeight: "800",
    color: C.dark,
  },

  timeBubble: {
    backgroundColor: C.paleTeal,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 14,
  },

  timeText: {
    fontSize: 13,
    fontWeight: "800",
    color: C.deepTeal,
  },

  divider: {
    height: 1,
    backgroundColor: "#EAF0EF",
    marginVertical: 20,
  },

  takeButton: {
    backgroundColor: C.teal,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },

  takeButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: "800",
  },

  takenBox: {
    backgroundColor: C.paleTeal,
    borderRadius: 16,
    padding: 15,
  },

  takenTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.deepTeal,
  },

  takenSubtitle: {
    fontSize: 13,
    color: C.muted,
    marginTop: 4,
  },

  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
  },

  changeButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
  },

  changeButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: C.deepTeal,
  },

  deleteButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
  },

  deleteButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: C.coral,
  },

  formCard: {
    backgroundColor: C.white,
    borderRadius: 26,
    padding: 22,
    marginTop: 4,
    marginBottom: 18,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 2,
  },

  formTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: C.dark,
    marginBottom: 22,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: C.dark,
    marginBottom: 8,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#DDE9E7",
    borderRadius: 15,
    paddingHorizontal: 15,
    fontSize: 15,
    color: C.dark,
    backgroundColor: "#FCFEFD",
    marginBottom: 16,
  },

  helperText: {
    fontSize: 12,
    color: C.muted,
    marginTop: -7,
    marginBottom: 18,
  },

  saveButton: {
    backgroundColor: C.teal,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },

  saveButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: "800",
  },

  cancelButton: {
    alignItems: "center",
    paddingVertical: 13,
    marginTop: 3,
  },

  cancelButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: C.muted,
  },

  voiceCard: {
    flexDirection: "row",
    backgroundColor: "#FFF0EC",
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
  },

  voiceCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.coral,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  voiceMark: {
    color: C.white,
    fontSize: 17,
    fontWeight: "900",
  },

  voiceContent: {
    flex: 1,
  },

  voiceTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.dark,
    marginBottom: 5,
  },

  voiceText: {
    fontSize: 13,
    lineHeight: 19,
    color: C.dark,
    fontStyle: "italic",
  },

  voiceSmall: {
    fontSize: 11,
    lineHeight: 16,
    color: C.muted,
    marginTop: 7,
  },

  infoCard: {
    backgroundColor: C.paleTeal,
    borderRadius: 22,
    padding: 18,
  },

  infoTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: C.deepTeal,
    marginBottom: 7,
  },

  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: C.muted,
  },
});