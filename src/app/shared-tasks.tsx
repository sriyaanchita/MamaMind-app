
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
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
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";
import { getMyFamily } from "../utils/familyService";

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
  border: "#E4EEEE",
  softCoral: "#FFF0EE",
};

const TASKS_KEY = "mamamind_shared_tasks";

type Task = {
  id: number;
  title: string;
  assignedTo: "You" | "Mama";
  completed: boolean;
  completedBy?: "You" | "Mama";
};

const initialTasks: Task[] = [
  {
    id: 1,
    title: "Give Mama 20 minutes to rest",
    assignedTo: "You",
    completed: false,
  },
  {
    id: 2,
    title: "Wash baby's bottles",
    assignedTo: "Mama",
    completed: true,
    completedBy: "Mama",
  },
  {
    id: 3,
    title: "Prepare baby's clothes",
    assignedTo: "You",
    completed: false,
  },
  {
    id: 4,
    title: "Help with baby's bedtime",
    assignedTo: "You",
    completed: false,
  },
];

export default function SharedTasks() {
  const router = useRouter();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [newTask, setNewTask] = useState("");
  const [assignedTo, setAssignedTo] =
    useState<"You" | "Mama">("You");

  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;

  const familyIdRef = useRef<string | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  // --------------------------------------------------
  // LOAD AND SYNC SHARED TASKS
  // --------------------------------------------------

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const startSync = async () => {
      try {
        const family = await getMyFamily();

        if (!active) return;

        // If no family is connected, use local storage.
        if (!family) {
          familyIdRef.current = null;

          const stored = await AsyncStorage.getItem(TASKS_KEY);

          if (!active) return;

          try {
            const parsed = stored ? JSON.parse(stored) : initialTasks;
            setTasks(Array.isArray(parsed) ? parsed : initialTasks);
          } catch {
            setTasks(initialTasks);
          }

          setLoading(false);
          return;
        }

        const familyId = family.familyId;
        familyIdRef.current = familyId;

        const tasksRef = doc(
          db,
          "families",
          familyId,
          "sharedTasks",
          "current"
        );

        unsubscribe = onSnapshot(
          tasksRef,
          (snapshot) => {
            if (!active) return;

            if (snapshot.exists()) {
              const cloudTasks = snapshot.data().tasks;

              if (Array.isArray(cloudTasks)) {
                setTasks(cloudTasks as Task[]);

                void AsyncStorage.setItem(
                  TASKS_KEY,
                  JSON.stringify(cloudTasks)
                ).catch((error) => {
                  console.warn("Local cache update failed:", error);
                });
              }

              setLoading(false);
              return;
            }

            // Initialize only if the shared document is still missing.
            // A transaction prevents two first-time opens from blindly
            // overwriting a document created by the other phone.
            void runTransaction(db, async (transaction) => {
              const latest = await transaction.get(tasksRef);

              if (!latest.exists()) {
                transaction.set(tasksRef, {
                  tasks: initialTasks,
                  updatedAt: serverTimestamp(),
                  updatedBy: auth.currentUser?.uid ?? null,
                });
              }
            })
              .catch((error) => {
                console.error("Task initialization failed:", error);

                if (active) {
                  Alert.alert(
                    "Couldn't initialize tasks",
                    "Check your connection and Firestore security rules."
                  );
                }
              })
              .finally(() => {
                if (active) setLoading(false);
              });
          },
          (error) => {
            console.error("Shared task sync failed:", error);

            if (active) {
              setLoading(false);

              Alert.alert(
                "Sync unavailable",
                "Shared tasks couldn't be loaded. Check your connection and Firestore security rules."
              );
            }
          }
        );
      } catch (error) {
        console.error("Could not start shared task sync:", error);

        if (active) {
          familyIdRef.current = null;
          setLoading(false);

          Alert.alert(
            "Couldn't load tasks",
            "Check that you're logged in and connected to a family."
          );
        }
      }
    };

    void startSync();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  // --------------------------------------------------
  // SAVE TASKS
  // --------------------------------------------------

  const saveTasks = (updatedTasks: Task[]) => {
    const familyId = familyIdRef.current;
    const userId = auth.currentUser?.uid;

    // Keep writes from this screen in order on this phone.
    const saveOperation = saveQueueRef.current.then(async () => {
      if (!familyId) {
        // Local-only mode.
        await AsyncStorage.setItem(
          TASKS_KEY,
          JSON.stringify(updatedTasks)
        );
        return;
      }

      if (!userId) {
        throw new Error("No authenticated user is available.");
      }

      const tasksRef = doc(
        db,
        "families",
        familyId,
        "sharedTasks",
        "current"
      );

      await setDoc(
        tasksRef,
        {
          tasks: updatedTasks,
          updatedAt: serverTimestamp(),
          updatedBy: userId,
        },
        { merge: true }
      );

      // Update local recovery data after a successful cloud save.
      await AsyncStorage.setItem(
        TASKS_KEY,
        JSON.stringify(updatedTasks)
      );
    });

    // Keep the queue usable even if a previous write failed.
    saveQueueRef.current = saveOperation.catch((error) => {
      console.error("Shared task save failed:", error);
    });

    void saveOperation.catch((error) => {
      console.error("Could not save tasks:", error);

      Alert.alert(
        "Couldn't sync tasks",
        "Your changes may not have reached the other phone. Check your connection and try again."
      );
    });
  };

  // --------------------------------------------------
  // ANIMATIONS
  // --------------------------------------------------

  useEffect(() => {
    const floatingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    floatingLoop.start();
    pulseLoop.start();

    return () => {
      floatingLoop.stop();
      pulseLoop.stop();
    };
  }, [floatingAnim, pulseAnim]);

  // --------------------------------------------------
  // PROGRESS
  // --------------------------------------------------

  const completedCount = tasks.filter(
    (task) => task.completed
  ).length;

  const totalCount = tasks.length;

  const progress =
    totalCount === 0 ? 0 : completedCount / totalCount;

  useEffect(() => {
    const animation = Animated.timing(progressAnim, {
      toValue: progress,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    });

    animation.start();

    return () => animation.stop();
  }, [progress, progressAnim]);

  // --------------------------------------------------
  // TOGGLE TASK
  // --------------------------------------------------

  const toggleTask = (id: number) => {
    const updatedTasks = tasks.map((task) => {
      if (task.id !== id) return task;

      const completed = !task.completed;

      return {
        ...task,
        completed,
        completedBy: completed ? task.assignedTo : undefined,
      };
    });

    setTasks(updatedTasks);
    saveTasks(updatedTasks);
  };

  // --------------------------------------------------
  // ADD TASK
  // --------------------------------------------------

  const addTask = () => {
    const trimmedTask = newTask.trim();

    if (!trimmedTask) {
      Alert.alert(
        "Add a task",
        "Please enter something that needs to be done."
      );
      return;
    }

    const newTaskObject: Task = {
      id: Date.now(),
      title: trimmedTask,
      assignedTo,
      completed: false,
    };

    const updatedTasks = [...tasks, newTaskObject];

    setTasks(updatedTasks);
    saveTasks(updatedTasks);

    setNewTask("");
    setAssignedTo("You");
    setModalVisible(false);
  };

  // --------------------------------------------------
  // DELETE TASK
  // --------------------------------------------------

  const deleteTask = (id: number) => {
    Alert.alert(
      "Delete task?",
      "This task will be removed from shared tasks.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updatedTasks = tasks.filter(
              (task) => task.id !== id
            );

            setTasks(updatedTasks);
            saveTasks(updatedTasks);
          },
        },
      ]
    );
  };

  // --------------------------------------------------
  // RESET TASKS
  // --------------------------------------------------

  const resetTasks = () => {
    Alert.alert(
      "Reset tasks?",
      "This will restore the original shared tasks for both parents.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset",
          onPress: () => {
            setTasks(initialTasks);
            saveTasks(initialTasks);
          },
        },
      ]
    );
  };

  // --------------------------------------------------
  // HELP TEXT
  // --------------------------------------------------

  const getProgressMessage = () => {
    if (tasks.length === 0) {
      return "Add something that needs doing.";
    }

    if (completedCount === 0) {
      return "A little help can make Mama's day easier.";
    }

    if (completedCount === totalCount) {
      return "Everything is done. Great teamwork!";
    }

    if (completedCount === 1) {
      return "One thing done. Keep supporting each other.";
    }

    return `${completedCount} things done. You're making a difference.`;
  };

  // --------------------------------------------------
  // TASK CARD
  // --------------------------------------------------

  const renderTask = (task: Task) => (
    <Pressable
      key={task.id}
      onPress={() => toggleTask(task.id)}
      onLongPress={() => deleteTask(task.id)}
      style={({ pressed }) => [
        styles.taskCard,
        pressed && styles.taskCardPressed,
        task.completed && styles.completedTaskCard,
      ]}
    >
      <View
        style={[
          styles.checkbox,
          task.completed && styles.checkboxCompleted,
        ]}
      >
        {task.completed && (
          <Text style={styles.checkmark}>✓</Text>
        )}
      </View>

      <View style={styles.taskContent}>
        <Text
          style={[
            styles.taskTitle,
            task.completed && styles.completedTaskTitle,
          ]}
        >
          {task.title}
        </Text>

        <View style={styles.taskMetaRow}>
          <View
            style={[
              styles.assigneeBadge,
              task.assignedTo === "You"
                ? styles.youBadge
                : styles.mamaBadge,
            ]}
          >
            <Text
              style={[
                styles.assigneeText,
                task.assignedTo === "You"
                  ? styles.youText
                  : styles.mamaText,
              ]}
            >
              {task.assignedTo === "You" ? "Dad" : "Mama"}
            </Text>
          </View>

          {task.completed && (
            <Text style={styles.completedByText}>
              Completed by{" "}
              {task.completedBy === "You" ? "Dad" : "Mama"}
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={C.cream}
        />

        <View style={styles.loadingContainer}>
          <Animated.View
            style={[
              styles.loadingCircle,
              { transform: [{ scale: pulseAnim }] },
            ]}
          />

          <Text style={styles.loadingText}>
            Loading shared tasks...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // MAIN UI
  // --------------------------------------------------

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={C.cream}
      />

      <View style={styles.background}>
        <Animated.View
          style={[
            styles.floatingCircleOne,
            {
              transform: [
                {
                  translateY: floatingAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -10],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.floatingCircleTwo,
            {
              transform: [
                {
                  translateY: floatingAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 12],
                  }),
                },
              ],
            },
          ]}
        />

        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backArrow}>‹</Text>
          </Pressable>

          <View style={styles.headerTextContainer}>
            <Text style={styles.eyebrow}>FAMILY CARE</Text>
            <Text style={styles.headerTitle}>Shared Tasks</Text>
          </View>

          <Pressable
            style={styles.resetButton}
            onPress={resetTasks}
          >
            <Text style={styles.resetText}>Reset</Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* INTRO */}
          <View style={styles.introSection}>
            <Text style={styles.introTitle}>
              Let's share the care.
            </Text>

            <Text style={styles.introText}>
              Small things become easier when you do them together.
            </Text>
          </View>

          {/* PROGRESS CARD */}
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.progressLabel}>
                  TODAY'S PROGRESS
                </Text>

                <Text style={styles.progressNumber}>
                  {completedCount}
                  <Text style={styles.progressTotal}>
                    {" "}
                    / {totalCount}
                  </Text>
                </Text>
              </View>

              <Animated.View
                style={[
                  styles.progressCircle,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              >
                <Text style={styles.progressPercent}>
                  {Math.round(progress * 100)}%
                </Text>
              </Animated.View>
            </View>

            <View style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>

            <Text style={styles.progressMessage}>
              {getProgressMessage()}
            </Text>
          </View>

          {/* ADD TASK */}
          <Pressable
            style={({ pressed }) => [
              styles.addTaskButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => setModalVisible(true)}
          >
            <View style={styles.addIcon}>
              <Text style={styles.addIconText}>+</Text>
            </View>

            <View style={styles.addTaskTextContainer}>
              <Text style={styles.addTaskTitle}>
                Add a shared task
              </Text>

              <Text style={styles.addTaskSubtitle}>
                Decide who can take care of it
              </Text>
            </View>

            <Text style={styles.addArrow}>›</Text>
          </Pressable>

          {/* TASKS */}
          <View style={styles.tasksSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>TODAY</Text>
              <Text style={styles.sectionHint}>
                Long press to delete
              </Text>
            </View>

            {tasks.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyCircle}>
                  <Text style={styles.emptyPlus}>+</Text>
                </View>

                <Text style={styles.emptyTitle}>
                  Nothing here yet
                </Text>

                <Text style={styles.emptyText}>
                  Add a task and decide who will take care of it.
                </Text>

                <Pressable
                  style={styles.emptyButton}
                  onPress={() => setModalVisible(true)}
                >
                  <Text style={styles.emptyButtonText}>
                    Add first task
                  </Text>
                </Pressable>
              </View>
            ) : (
              tasks.map(renderTask)
            )}
          </View>

          {/* TIP CARD */}
          <View style={styles.tipCard}>
            <View style={styles.tipAccent} />

            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>
                A little reminder
              </Text>

              <Text style={styles.tipText}>
                The goal isn't to finish everything. It's to make
                sure Mama doesn't have to carry everything alone.
              </Text>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* ADD TASK MODAL */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Pressable
            style={styles.modalBackground}
            onPress={() => setModalVisible(false)}
          />

          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalEyebrow}>NEW TASK</Text>

            <Text style={styles.modalTitle}>
              What needs to be done?
            </Text>

            <Text style={styles.modalSubtitle}>
              Add something that would make the day a little easier.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. Prepare baby's clothes"
              placeholderTextColor="#9BAFAF"
              value={newTask}
              onChangeText={setNewTask}
              autoFocus
              multiline
            />

            <Text style={styles.assignLabel}>WHO WILL DO IT?</Text>

            <View style={styles.assignmentRow}>
              <Pressable
                style={[
                  styles.assignmentButton,
                  assignedTo === "You" && styles.assignmentSelected,
                ]}
                onPress={() => setAssignedTo("You")}
              >
                <View
                  style={[
                    styles.radio,
                    assignedTo === "You" && styles.radioSelected,
                  ]}
                >
                  {assignedTo === "You" && (
                    <View style={styles.radioDot} />
                  )}
                </View>

                <Text
                  style={[
                    styles.assignmentText,
                    assignedTo === "You" &&
                      styles.assignmentTextSelected,
                  ]}
                >
                  Dad
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.assignmentButton,
                  assignedTo === "Mama" &&
                    styles.assignmentSelectedMama,
                ]}
                onPress={() => setAssignedTo("Mama")}
              >
                <View
                  style={[
                    styles.radio,
                    assignedTo === "Mama" &&
                      styles.radioSelectedMama,
                  ]}
                >
                  {assignedTo === "Mama" && (
                    <View
                      style={[
                        styles.radioDot,
                        styles.radioDotMama,
                      ]}
                    />
                  )}
                </View>

                <Text
                  style={[
                    styles.assignmentText,
                    assignedTo === "Mama" &&
                      styles.assignmentTextSelectedMama,
                  ]}
                >
                  Mama
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={[
                styles.saveButton,
                !newTask.trim() && styles.saveButtonDisabled,
              ]}
              onPress={addTask}
            >
              <Text style={styles.saveButtonText}>Add task</Text>
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                setNewTask("");
                setAssignedTo("You");
                setModalVisible(false);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// --------------------------------------------------
// STYLES
// --------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.cream,
  },
  background: {
    flex: 1,
    position: "relative",
  },
  floatingCircleOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(25,183,176,0.06)",
    top: -60,
    right: -60,
  },
  floatingCircleTwo: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,218,87,0.08)",
    bottom: 100,
    left: -70,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  backArrow: {
    fontSize: 34,
    lineHeight: 38,
    color: C.dark,
    fontWeight: "300",
    marginTop: -3,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: "700",
    color: C.teal,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: C.dark,
  },
  resetButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  resetText: {
    fontSize: 12,
    color: C.muted,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  introSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 27,
    fontWeight: "800",
    color: C.dark,
    marginBottom: 6,
  },
  introText: {
    fontSize: 14,
    lineHeight: 21,
    color: C.muted,
    maxWidth: 310,
  },
  progressCard: {
    backgroundColor: C.white,
    borderRadius: 25,
    padding: 20,
    marginBottom: 14,
    shadowColor: "#164F52",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLabel: {
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: "800",
    color: C.muted,
    marginBottom: 3,
  },
  progressNumber: {
    fontSize: 34,
    fontWeight: "800",
    color: C.dark,
  },
  progressTotal: {
    fontSize: 17,
    color: C.muted,
    fontWeight: "600",
  },
  progressCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.paleTeal,
    alignItems: "center",
    justifyContent: "center",
  },
  progressPercent: {
    fontSize: 13,
    color: C.deepTeal,
    fontWeight: "800",
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: "#EDF3F3",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 15,
  },
  progressBar: {
    height: "100%",
    backgroundColor: C.teal,
    borderRadius: 10,
  },
  progressMessage: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
    color: C.muted,
  },
  addTaskButton: {
    backgroundColor: C.deepTeal,
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    shadowColor: C.deepTeal,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.14,
    shadowRadius: 15,
    elevation: 4,
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  addIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  addIconText: {
    fontSize: 26,
    color: C.white,
    fontWeight: "300",
    marginTop: -2,
  },
  addTaskTextContainer: {
    flex: 1,
    marginLeft: 13,
  },
  addTaskTitle: {
    color: C.white,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 3,
  },
  addTaskSubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
  },
  addArrow: {
    color: C.white,
    fontSize: 26,
    fontWeight: "300",
    marginLeft: 8,
  },
  tasksSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: C.muted,
    fontWeight: "800",
  },
  sectionHint: {
    fontSize: 10,
    color: "#9AAEAE",
  },
  taskCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
    shadowColor: "#164F52",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.035,
    shadowRadius: 10,
    elevation: 1,
  },
  taskCardPressed: {
    transform: [{ scale: 0.985 }],
  },
  completedTaskCard: {
    backgroundColor: "#FAFCFC",
    borderColor: C.border,
  },
  checkbox: {
    width: 27,
    height: 27,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#C8D8D8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkboxCompleted: {
    backgroundColor: C.teal,
    borderColor: C.teal,
  },
  checkmark: {
    color: C.white,
    fontSize: 16,
    fontWeight: "800",
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    lineHeight: 19,
    color: C.dark,
    fontWeight: "700",
    marginBottom: 7,
  },
  completedTaskTitle: {
    color: "#8AA0A0",
    textDecorationLine: "line-through",
  },
  taskMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  assigneeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  youBadge: {
    backgroundColor: C.paleTeal,
  },
  mamaBadge: {
    backgroundColor: C.softCoral,
  },
  assigneeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  youText: {
    color: C.deepTeal,
  },
  mamaText: {
    color: "#D45F5F",
  },
  completedByText: {
    fontSize: 9,
    color: "#9AAEAE",
    marginLeft: 8,
  },
  arrow: {
    fontSize: 25,
    color: "#B7C8C8",
    fontWeight: "300",
    marginLeft: 8,
  },
  emptyCard: {
    backgroundColor: C.white,
    borderRadius: 23,
    padding: 28,
    alignItems: "center",
  },
  emptyCircle: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: C.paleTeal,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyPlus: {
    color: C.teal,
    fontSize: 28,
    fontWeight: "300",
  },
  emptyTitle: {
    fontSize: 16,
    color: C.dark,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    color: C.muted,
    maxWidth: 270,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: C.deepTeal,
    borderRadius: 13,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  emptyButtonText: {
    color: C.white,
    fontSize: 12,
    fontWeight: "700",
  },
  tipCard: {
    backgroundColor: "#FFF5D6",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    overflow: "hidden",
  },
  tipAccent: {
    width: 4,
    borderRadius: 4,
    backgroundColor: C.yellow,
    marginRight: 13,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.dark,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 11,
    lineHeight: 17,
    color: C.muted,
  },

  // MODAL
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(22,79,84,0.28)",
  },
  modalCard: {
    backgroundColor: C.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 28,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 5,
    backgroundColor: "#DCE7E7",
    alignSelf: "center",
    marginBottom: 20,
  },
  modalEyebrow: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: C.teal,
    fontWeight: "800",
    marginBottom: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: C.dark,
    marginBottom: 5,
  },
  modalSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: C.muted,
    marginBottom: 18,
  },
  input: {
    minHeight: 52,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 13,
    color: C.dark,
    backgroundColor: "#FAFCFC",
    textAlignVertical: "top",
  },
  assignLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: C.muted,
    fontWeight: "800",
    marginTop: 18,
    marginBottom: 9,
  },
  assignmentRow: {
    flexDirection: "row",
    gap: 10,
  },
  assignmentButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#FAFCFC",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
  },
  assignmentSelected: {
    backgroundColor: C.paleTeal,
    borderColor: C.teal,
  },
  assignmentSelectedMama: {
    backgroundColor: C.softCoral,
    borderColor: C.coral,
  },
  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#B8CACA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  radioSelected: {
    borderColor: C.teal,
  },
  radioSelectedMama: {
    borderColor: C.coral,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: C.teal,
  },
  radioDotMama: {
    backgroundColor: C.coral,
  },
  assignmentText: {
    fontSize: 13,
    color: C.muted,
    fontWeight: "600",
  },
  assignmentTextSelected: {
    color: C.deepTeal,
    fontWeight: "800",
  },
  assignmentTextSelectedMama: {
    color: "#D45F5F",
    fontWeight: "800",
  },
  saveButton: {
    height: 51,
    backgroundColor: C.deepTeal,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.45,
  },
  saveButtonText: {
    color: C.white,
    fontSize: 14,
    fontWeight: "800",
  },
  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  cancelButtonText: {
    color: C.muted,
    fontSize: 13,
    fontWeight: "600",
  },

  // LOADING
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.cream,
  },
  loadingCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.paleTeal,
    marginBottom: 15,
  },
  loadingText: {
    fontSize: 13,
    color: C.muted,
    fontWeight: "600",
  },
});
