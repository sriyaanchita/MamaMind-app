import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  Easing,
  Dimensions,
} from "react-native";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

const { width, height } = Dimensions.get("window");

/* --------------------------------------------------
   MAMAMIND COLOUR PALETTE
-------------------------------------------------- */

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
} as const;

/* --------------------------------------------------
   TASK TYPE
-------------------------------------------------- */

type Task = {
  id: string;
  text: string;
  done: boolean;
  createdAt?: any;
};

type FilterType = "all" | "remaining" | "completed";

/* --------------------------------------------------
   DEFAULT TASKS
-------------------------------------------------- */

const DEFAULT_TASKS = [
  "Drink some water",
  "Take a few deep breaths",
  "Eat something nourishing",
  "Stretch your body",
  "Step outside for fresh air",
  "Listen to music",
  "Take a short rest",
  "Write one thought",
  "Spend a calm moment with baby",
  "Do one thing for yourself",
];

/* --------------------------------------------------
   FLOATING ELEMENTS
   Same animation style as previous MamaMind pages
-------------------------------------------------- */

const floatingDefinitions = [
  {
    type: "bubble",
    left: 0.04,
    top: 0.12,
    size: 42,
    color: C.yellow,
  },
  {
    type: "dot",
    left: 0.89,
    top: 0.08,
    size: 16,
    color: C.coral,
  },
  {
    type: "heart",
    left: 0.07,
    top: 0.34,
    size: 31,
    color: C.teal,
  },
  {
    type: "ring",
    left: 0.91,
    top: 0.31,
    size: 32,
    color: C.yellow,
  },
  {
    type: "star",
    left: 0.04,
    top: 0.57,
    size: 29,
    color: C.coral,
  },
  {
    type: "bubble",
    left: 0.91,
    top: 0.55,
    size: 44,
    color: C.teal,
  },
  {
    type: "dot",
    left: 0.15,
    top: 0.75,
    size: 13,
    color: C.yellow,
  },
  {
    type: "ring",
    left: 0.83,
    top: 0.78,
    size: 24,
    color: C.coral,
  },
];

/* --------------------------------------------------
   FLOATING SHAPE
-------------------------------------------------- */

function FloatingShape({
  item,
  animation,
}: {
  item: (typeof floatingDefinitions)[number];
  animation: {
    x: Animated.Value;
    y: Animated.Value;
    scale: Animated.Value;
    rotate: Animated.Value;
  };
}) {
  const rotate = animation.rotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-8deg", "0deg", "8deg"],
  });

  const shapeStyle = {
    position: "absolute" as const,
    left: item.left * width,
    top: item.top * height,
    width: item.size,
    height: item.size,
    transform: [
      { translateX: animation.x },
      { translateY: animation.y },
      { scale: animation.scale },
      { rotate },
    ],
  };

  if (item.type === "bubble") {
    return (
      <Animated.View
        style={[
          shapeStyle,
          {
            borderRadius: item.size / 2,
            backgroundColor: item.color,
            opacity: 0.2,
          },
        ]}
      />
    );
  }

  if (item.type === "dot") {
    return (
      <Animated.View
        style={[
          shapeStyle,
          {
            borderRadius: item.size / 2,
            backgroundColor: item.color,
            opacity: 0.38,
          },
        ]}
      />
    );
  }

  if (item.type === "ring") {
    return (
      <Animated.View
        style={[
          shapeStyle,
          {
            borderRadius: item.size / 2,
            borderWidth: 3,
            borderColor: item.color,
            opacity: 0.3,
          },
        ]}
      />
    );
  }

  if (item.type === "heart") {
    return (
      <Animated.View style={shapeStyle}>
        <Text
          style={{
            fontSize: item.size,
            color: item.color,
            opacity: 0.28,
          }}
        >
          ♡
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={shapeStyle}>
      <Text
        style={{
          fontSize: item.size,
          color: item.color,
          opacity: 0.28,
        }}
      >
        ✦
      </Text>
    </Animated.View>
  );
}

/* --------------------------------------------------
   MAIN COMPONENT
-------------------------------------------------- */

export default function DailyCare() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [editMode, setEditMode] = useState(false);

  const [taskModalVisible, setTaskModalVisible] =
    useState(false);

  const [taskText, setTaskText] = useState("");

  const [editingTask, setEditingTask] =
    useState<Task | null>(null);

  /* NEW INTERACTIVE STATES */

  const [filter, setFilter] =
    useState<FilterType>("all");

  const [celebrationVisible, setCelebrationVisible] =
    useState(false);

  /* --------------------------------------------------
     FLOATING ANIMATION
  -------------------------------------------------- */

  const floatingItems = useRef(
    floatingDefinitions.map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      scale: new Animated.Value(1),
      rotate: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    let cancelled = false;

    const timers: ReturnType<typeof setTimeout>[] = [];

    floatingItems.forEach((item, index) => {
      const move = () => {
        if (cancelled) return;

        const xDistance =
          (Math.random() - 0.5) * 75;

        const yDistance =
          (Math.random() - 0.5) * 70;

        const duration =
          6500 + Math.random() * 2600;

        const rotateTarget =
          Math.random() > 0.5 ? 1 : -1;

        const animation = Animated.parallel([
          Animated.timing(item.x, {
            toValue: xDistance,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),

          Animated.timing(item.y, {
            toValue: yDistance,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),

          Animated.sequence([
            Animated.timing(item.scale, {
              toValue: 1.045,
              duration: duration / 2,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),

            Animated.timing(item.scale, {
              toValue: 1,
              duration: duration / 2,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),

          Animated.sequence([
            Animated.timing(item.rotate, {
              toValue: rotateTarget,
              duration: duration / 2,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),

            Animated.timing(item.rotate, {
              toValue: 0,
              duration: duration / 2,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        ]);

        animation.start(({ finished }) => {
          if (finished && !cancelled) {
            move();
          }
        });
      };

      const timer = setTimeout(
        () => move(),
        index * 220
      );

      timers.push(timer);
    });

    return () => {
      cancelled = true;

      timers.forEach((timer) =>
        clearTimeout(timer)
      );

      floatingItems.forEach((item) => {
        item.x.stopAnimation();
        item.y.stopAnimation();
        item.scale.stopAnimation();
        item.rotate.stopAnimation();
      });
    };
  }, [floatingItems]);

  /* --------------------------------------------------
     ANIMATION REFS
  -------------------------------------------------- */

  const progressAnimation =
    useRef(new Animated.Value(0)).current;

  const editButtonScale =
    useRef(new Animated.Value(1)).current;

  const addButtonScale =
    useRef(new Animated.Value(1)).current;

  const modalSaveScale =
    useRef(new Animated.Value(1)).current;

  const modalCancelScale =
    useRef(new Animated.Value(1)).current;

  const celebrationScale =
    useRef(new Animated.Value(0.85)).current;

  const taskScales = useRef(
    {} as Record<string, Animated.Value>
  ).current;

  /* --------------------------------------------------
     LOAD TASKS
  -------------------------------------------------- */

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    const user = auth.currentUser;

    if (!user) {
      setLoading(false);

      Alert.alert(
        "Login required",
        "Please login again."
      );

      return;
    }

    try {
      const userRef = doc(
        db,
        "users",
        user.uid
      );

      const userSnapshot =
        await getDoc(userRef);

      const userData =
        userSnapshot.exists()
          ? userSnapshot.data()
          : {};

      const dailyCareInitialized =
        userData.dailyCareInitialized === true;

      const tasksRef = collection(
        db,
        "users",
        user.uid,
        "dailyCareTasks"
      );

      const tasksSnapshot =
        await getDocs(tasksRef);

      /* FIRST TIME ONLY */

      if (
        !dailyCareInitialized &&
        tasksSnapshot.empty
      ) {
        const createdTasks: Task[] = [];

        for (const taskText of DEFAULT_TASKS) {
          const newTaskRef =
            await addDoc(tasksRef, {
              text: taskText,
              done: false,
              createdAt:
                serverTimestamp(),
            });

          createdTasks.push({
            id: newTaskRef.id,
            text: taskText,
            done: false,
          });
        }

        await setDoc(
          userRef,
          {
            dailyCareInitialized: true,
          },
          {
            merge: true,
          }
        );

        setTasks(createdTasks);
      } else {
        const loadedTasks: Task[] =
          tasksSnapshot.docs.map((item) => ({
            id: item.id,
            text: item.data().text,
            done:
              item.data().done ?? false,
            createdAt:
              item.data().createdAt,
          }));

        loadedTasks.sort((a, b) => {
          const aTime =
            a.createdAt?.toMillis?.() || 0;

          const bTime =
            b.createdAt?.toMillis?.() || 0;

          return aTime - bTime;
        });

        setTasks(loadedTasks);
      }

      setLoading(false);
    } catch (error) {
      console.log(
        "DAILY CARE LOAD ERROR:",
        error
      );

      setLoading(false);

      Alert.alert(
        "Error",
        "Could not load your care goals."
      );
    }
  };

  /* --------------------------------------------------
     TOGGLE TASK
  -------------------------------------------------- */

  const toggleTask = async (task: Task) => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert(
        "Error",
        "Please login again."
      );

      return;
    }

    if (!taskScales[task.id]) {
      taskScales[task.id] =
        new Animated.Value(1);
    }

    Animated.sequence([
      Animated.spring(
        taskScales[task.id],
        {
          toValue: 0.96,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }
      ),

      Animated.spring(
        taskScales[task.id],
        {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }
      ),
    ]).start();

    try {
      await updateDoc(
        doc(
          db,
          "users",
          user.uid,
          "dailyCareTasks",
          task.id
        ),
        {
          done: !task.done,
        }
      );

      setTasks((currentTasks) =>
        currentTasks.map((item) =>
          item.id === task.id
            ? {
                ...item,
                done: !item.done,
              }
            : item
        )
      );
    } catch (error) {
      console.log(
        "TOGGLE TASK ERROR:",
        error
      );

      Alert.alert(
        "Error",
        "Could not update this task."
      );
    }
  };

  /* --------------------------------------------------
     OPEN ADD TASK
  -------------------------------------------------- */

  const openAddTask = () => {
    setEditingTask(null);
    setTaskText("");
    setTaskModalVisible(true);
  };

  /* --------------------------------------------------
     OPEN EDIT TASK
  -------------------------------------------------- */

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskText(task.text);
    setTaskModalVisible(true);
  };

  /* --------------------------------------------------
     SAVE TASK
  -------------------------------------------------- */

  const saveTask = async () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert(
        "Error",
        "Please login again."
      );

      return;
    }

    const trimmedText =
      taskText.trim();

    if (!trimmedText) {
      Alert.alert(
        "Missing goal",
        "Please enter a goal."
      );

      return;
    }

    try {
      /* EDIT */

      if (editingTask) {
        await updateDoc(
          doc(
            db,
            "users",
            user.uid,
            "dailyCareTasks",
            editingTask.id
          ),
          {
            text: trimmedText,
          }
        );

        setTasks((currentTasks) =>
          currentTasks.map((task) =>
            task.id === editingTask.id
              ? {
                  ...task,
                  text: trimmedText,
                }
              : task
          )
        );
      }

      /* ADD */

      else {
        const newTaskRef =
          await addDoc(
            collection(
              db,
              "users",
              user.uid,
              "dailyCareTasks"
            ),
            {
              text: trimmedText,
              done: false,
              createdAt:
                serverTimestamp(),
            }
          );

        const newTask: Task = {
          id: newTaskRef.id,
          text: trimmedText,
          done: false,
        };

        setTasks((currentTasks) => [
          ...currentTasks,
          newTask,
        ]);
      }

      closeTaskModal();
    } catch (error) {
      console.log(
        "SAVE TASK ERROR:",
        error
      );

      Alert.alert(
        "Error",
        "Could not save this goal."
      );
    }
  };

  /* --------------------------------------------------
     DELETE TASK
  -------------------------------------------------- */

  const deleteTask = (task: Task) => {
    Alert.alert(
      "Delete goal?",
      `"${task.text}" will be removed from your care list.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Delete",
          style: "destructive",

          onPress: async () => {
            const user =
              auth.currentUser;

            if (!user) return;

            try {
              await deleteDoc(
                doc(
                  db,
                  "users",
                  user.uid,
                  "dailyCareTasks",
                  task.id
                )
              );

              setTasks(
                (currentTasks) =>
                  currentTasks.filter(
                    (item) =>
                      item.id !== task.id
                  )
              );
            } catch (error) {
              console.log(
                "DELETE TASK ERROR:",
                error
              );

              Alert.alert(
                "Error",
                "Could not delete this goal."
              );
            }
          },
        },
      ]
    );
  };

  /* --------------------------------------------------
     CLOSE MODAL
  -------------------------------------------------- */

  const closeTaskModal = () => {
    setTaskModalVisible(false);
    setTaskText("");
    setEditingTask(null);
  };

  /* --------------------------------------------------
     PROGRESS
  -------------------------------------------------- */

  const completed = tasks.filter(
    (task) => task.done
  ).length;

  const remaining =
    tasks.length - completed;

  const progress =
    tasks.length > 0
      ? (completed / tasks.length) * 100
      : 0;

  /* --------------------------------------------------
     ANIMATE PROGRESS
  -------------------------------------------------- */

  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: progress,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnimation]);

  /* --------------------------------------------------
     CELEBRATION
  -------------------------------------------------- */

  useEffect(() => {
    if (
      tasks.length > 0 &&
      completed === tasks.length
    ) {
      setCelebrationVisible(true);

      celebrationScale.setValue(0.85);

      Animated.spring(
        celebrationScale,
        {
          toValue: 1,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }
      ).start();
    } else {
      setCelebrationVisible(false);
    }
  }, [
    completed,
    tasks.length,
    celebrationScale,
  ]);

  /* --------------------------------------------------
     MESSAGE
  -------------------------------------------------- */

  const getMessage = () => {
    if (completed === 0) {
      return "No pressure. Start with one little thing. ♡";
    }

    if (completed <= 2) {
      return "Small steps count. 🌿";
    }

    if (completed <= 5) {
      return "You're making space for yourself. ✨";
    }

    if (completed <= 8) {
      return "Beautiful progress today. 🌸";
    }

    return "You cared for yourself in many little ways. ♡";
  };

  /* --------------------------------------------------
     FILTER TASKS
  -------------------------------------------------- */

  const visibleTasks =
    tasks.filter((task) => {
      if (filter === "remaining") {
        return !task.done;
      }

      if (filter === "completed") {
        return task.done;
      }

      return true;
    });

  /* --------------------------------------------------
     BUTTON ANIMATION
  -------------------------------------------------- */

  const animateButton = (
    animation: Animated.Value
  ) => {
    Animated.sequence([
      Animated.spring(animation, {
        toValue: 0.95,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }),

      Animated.spring(animation, {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  /* --------------------------------------------------
     UI
  -------------------------------------------------- */

  return (
    <View style={styles.screen}>
      {/* FLOATING LAYER */}

      <View
        pointerEvents="none"
        style={styles.floatingLayer}
      >
        {floatingDefinitions.map(
          (item, index) => (
            <FloatingShape
              key={index}
              item={item}
              animation={
                floatingItems[index]
              }
            />
          )
        )}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={
          styles.contentContainer
        }
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}

        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.label}>
              DAILY CARE
            </Text>

            <Text style={styles.title}>
              Your Little Things
            </Text>

            <Text style={styles.subtitle}>
              Small things are still worth
              celebrating.
            </Text>
          </View>

          <Animated.View
            style={{
              transform: [
                {
                  scale: addButtonScale,
                },
              ],
            }}
          >
            <TouchableOpacity
              style={styles.headerAddButton}
              onPress={() => {
                animateButton(
                  addButtonScale
                );
                openAddTask();
              }}
              activeOpacity={0.9}
            >
              <Text
                style={styles.headerAddText}
              >
                +
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* PROGRESS */}

        <View style={styles.progressCard}>
          <View style={styles.progressTopRow}>
            <View>
              <Text
                style={styles.progressCaption}
              >
                TODAY'S PROGRESS
              </Text>

              <Text
                style={styles.progressText}
              >
                {completed} /{" "}
                {tasks.length}
              </Text>
            </View>

            <View
              style={styles.progressCircle}
            >
              <Text
                style={styles.progressPercent}
              >
                {Math.round(progress)}%
              </Text>
            </View>
          </View>

          <View
            style={styles.barBackground}
          >
            <Animated.View
              style={[
                styles.barFill,
                {
                  width:
                    progressAnimation.interpolate(
                      {
                        inputRange: [
                          0,
                          100,
                        ],
                        outputRange: [
                          "0%",
                          "100%",
                        ],
                      }
                    ),
                },
              ]}
            />
          </View>

          <Text style={styles.message}>
            {getMessage()}
          </Text>

          <View
            style={styles.progressStats}
          >
            <View
              style={styles.statItem}
            >
              <View
                style={[
                  styles.statDot,
                  {
                    backgroundColor:
                      C.teal,
                  },
                ]}
              />

              <Text
                style={styles.statText}
              >
                {completed} done
              </Text>
            </View>

            <View
              style={styles.statItem}
            >
              <View
                style={[
                  styles.statDot,
                  {
                    backgroundColor:
                      C.coral,
                  },
                ]}
              />

              <Text
                style={styles.statText}
              >
                {remaining} remaining
              </Text>
            </View>
          </View>
        </View>

        {/* CELEBRATION */}

        {celebrationVisible && (
          <Animated.View
            style={[
              styles.celebrationCard,
              {
                transform: [
                  {
                    scale:
                      celebrationScale,
                  },
                ],
              },
            ]}
          >
            <View
              style={styles.celebrationIcon}
            >
              <Text
                style={
                  styles.celebrationSymbol
                }
              >
                ✦
              </Text>
            </View>

            <View
              style={
                styles.celebrationContent
              }
            >
              <Text
                style={
                  styles.celebrationTitle
                }
              >
                You did it! ♡
              </Text>

              <Text
                style={
                  styles.celebrationText
                }
              >
                You made time for yourself
                today.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* FILTERS */}

        {!loading && tasks.length > 0 && (
          <View style={styles.filterSection}>
            <Text
              style={styles.filterTitle}
            >
              View your goals
            </Text>

            <View
              style={styles.filterRow}
            >
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filter === "all" &&
                    styles.filterButtonActive,
                ]}
                onPress={() =>
                  setFilter("all")
                }
              >
                <Text
                  style={[
                    styles.filterText,
                    filter === "all" &&
                      styles.filterTextActive,
                  ]}
                >
                  All
                </Text>

                <View
                  style={[
                    styles.filterCount,
                    filter === "all" &&
                      styles.filterCountActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      filter === "all" &&
                        styles.filterCountTextActive,
                    ]}
                  >
                    {tasks.length}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filter ===
                    "remaining" &&
                    styles.filterButtonActive,
                ]}
                onPress={() =>
                  setFilter(
                    "remaining"
                  )
                }
              >
                <Text
                  style={[
                    styles.filterText,
                    filter ===
                      "remaining" &&
                      styles.filterTextActive,
                  ]}
                >
                  Remaining
                </Text>

                <View
                  style={[
                    styles.filterCount,
                    filter ===
                      "remaining" &&
                      styles.filterCountActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      filter ===
                        "remaining" &&
                        styles.filterCountTextActive,
                    ]}
                  >
                    {remaining}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filter ===
                    "completed" &&
                    styles.filterButtonActive,
                ]}
                onPress={() =>
                  setFilter(
                    "completed"
                  )
                }
              >
                <Text
                  style={[
                    styles.filterText,
                    filter ===
                      "completed" &&
                      styles.filterTextActive,
                  ]}
                >
                  Done
                </Text>

                <View
                  style={[
                    styles.filterCount,
                    filter ===
                      "completed" &&
                      styles.filterCountActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      filter ===
                        "completed" &&
                        styles.filterCountTextActive,
                    ]}
                  >
                    {completed}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* LOADING */}

        {loading && (
          <View
            style={styles.loadingCard}
          >
            <View
              style={styles.loadingDot}
            />

            <Text
              style={styles.loadingText}
            >
              Loading your care goals...
            </Text>
          </View>
        )}

        {/* TASKS */}

        {!loading &&
          visibleTasks.map((task) => {
            if (!taskScales[task.id]) {
              taskScales[task.id] =
                new Animated.Value(1);
            }

            return (
              <Animated.View
                key={task.id}
                style={[
                  styles.taskCard,
                  {
                    transform: [
                      {
                        scale:
                          taskScales[
                            task.id
                          ],
                      },
                    ],
                  },
                  task.done &&
                    styles.completedTaskCard,
                ]}
              >
                {/* CHECKBOX */}

                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    task.done &&
                      styles.checked,
                  ]}
                  onPress={() =>
                    toggleTask(task)
                  }
                  activeOpacity={0.8}
                >
                  {task.done && (
                    <Text
                      style={styles.tick}
                    >
                      ✓
                    </Text>
                  )}
                </TouchableOpacity>

                {/* TASK TEXT */}

                <TouchableOpacity
                  style={
                    styles.taskTextContainer
                  }
                  onPress={() =>
                    toggleTask(task)
                  }
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.taskText,
                      task.done &&
                        styles.doneText,
                    ]}
                  >
                    {task.text}
                  </Text>

                  {task.done && (
                    <Text
                      style={
                        styles.completedLabel
                      }
                    >
                      DONE FOR TODAY
                    </Text>
                  )}
                </TouchableOpacity>

                {/* EDIT + DELETE */}

                {editMode && (
                  <View
                    style={
                      styles.actionButtons
                    }
                  >
                    <TouchableOpacity
                      onPress={() =>
                        openEditTask(task)
                      }
                      style={
                        styles.smallButton
                      }
                    >
                      <Text
                        style={
                          styles.editIcon
                        }
                      >
                        ✏️
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() =>
                        deleteTask(task)
                      }
                      style={
                        styles.smallButton
                      }
                    >
                      <Text
                        style={
                          styles.deleteIcon
                        }
                      >
                        🗑️
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Animated.View>
            );
          })}

        {/* FILTER EMPTY */}

        {!loading &&
          tasks.length > 0 &&
          visibleTasks.length === 0 && (
            <View
              style={styles.filterEmptyState}
            >
              <View
                style={styles.filterEmptyIcon}
              >
                <Text
                  style={
                    styles.filterEmptySymbol
                  }
                >
                  ✓
                </Text>
              </View>

              <Text
                style={
                  styles.filterEmptyTitle
                }
              >
                Nothing here right now.
              </Text>

              <Text
                style={
                  styles.filterEmptyText
                }
              >
                You've already taken care
                of everything in this view.
              </Text>

              <TouchableOpacity
                style={
                  styles.showAllButton
                }
                onPress={() =>
                  setFilter("all")
                }
              >
                <Text
                  style={
                    styles.showAllText
                  }
                >
                  Show All Goals
                </Text>
              </TouchableOpacity>
            </View>
          )}

        {/* ADD */}

        {editMode && (
          <Animated.View
            style={{
              transform: [
                {
                  scale: addButtonScale,
                },
              ],
            }}
          >
            <TouchableOpacity
              style={
                styles.addTaskButton
              }
              onPress={() => {
                animateButton(
                  addButtonScale
                );
                openAddTask();
              }}
              activeOpacity={0.9}
            >
              <Text
                style={
                  styles.addTaskPlus
                }
              >
                +
              </Text>

              <Text
                style={
                  styles.addTaskText
                }
              >
                Add a care goal
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* MOTIVATION CARD */}

        {!loading && (
          <View
            style={styles.motivationCard}
          >
            <View
              style={styles.motivationIcon}
            >
              <Text
                style={
                  styles.motivationSymbol
                }
              >
                ♡
              </Text>
            </View>

            <View
              style={
                styles.motivationContent
              }
            >
              <Text
                style={
                  styles.motivationTitle
                }
              >
                Remember
              </Text>

              <Text
                style={
                  styles.motivationText
                }
              >
                Caring for yourself isn't
                another task. It is part of
                caring for baby too.
              </Text>
            </View>
          </View>
        )}

        {/* EDIT GOALS */}

        <Animated.View
          style={{
            transform: [
              {
                scale: editButtonScale,
              },
            ],
          }}
        >
          <TouchableOpacity
            style={[
              styles.editButton,
              editMode &&
                styles.editButtonActive,
            ]}
            onPress={() => {
              animateButton(
                editButtonScale
              );

              setEditMode(!editMode);
            }}
            activeOpacity={0.9}
          >
            <Text
              style={[
                styles.editText,
                editMode &&
                  styles.editTextActive,
              ]}
            >
              {editMode
                ? "✓ Done Editing"
                : "✏ Edit Goals"}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ADD / EDIT MODAL */}

        <Modal
          visible={taskModalVisible}
          transparent
          animationType="fade"
          onRequestClose={
            closeTaskModal
          }
        >
          <View
            style={styles.modalOverlay}
          >
            <View
              style={styles.modalCard}
            >
              <View
                style={styles.modalHandle}
              />

              <Text
                style={styles.modalTitle}
              >
                {editingTask
                  ? "Edit Care Goal"
                  : "Add Care Goal"}
              </Text>

              <Text
                style={
                  styles.modalSubtitle
                }
              >
                Add something small that
                helps you take care of
                yourself.
              </Text>

              <TextInput
                value={taskText}
                onChangeText={
                  setTaskText
                }
                placeholder="Example: Read for 10 minutes"
                placeholderTextColor={
                  "#82A1A1"
                }
                style={styles.input}
                autoFocus
                maxLength={100}
              />

              <Text
                style={styles.characterCount}
              >
                {taskText.length}/100
              </Text>

              <View
                style={styles.modalButtons}
              >
                <Animated.View
                  style={{
                    transform: [
                      {
                        scale:
                          modalCancelScale,
                      },
                    ],
                  }}
                >
                  <TouchableOpacity
                    style={
                      styles.cancelButton
                    }
                    onPress={() => {
                      animateButton(
                        modalCancelScale
                      );
                      closeTaskModal();
                    }}
                  >
                    <Text
                      style={
                        styles.cancelText
                      }
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View
                  style={{
                    transform: [
                      {
                        scale:
                          modalSaveScale,
                      },
                    ],
                  }}
                >
                  <TouchableOpacity
                    style={
                      styles.modalSaveButton
                    }
                    onPress={() => {
                      animateButton(
                        modalSaveScale
                      );
                      saveTask();
                    }}
                    activeOpacity={0.9}
                  >
                    <Text
                      style={
                        styles.saveText
                      }
                    >
                      {editingTask
                        ? "Save Changes"
                        : "Save Goal"}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

/* ==================================================
   STYLES
================================================== */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.cream,
  },

  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  floatingLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },

  contentContainer: {
    padding: 22,
    paddingBottom: 60,
    zIndex: 1,
  },

  /* HEADER */

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginTop: 48,
  },

  headerText: {
    flex: 1,
    paddingRight: 15,
  },

  label: {
    fontSize: 11,
    letterSpacing: 2,
    color: C.deepTeal,
    fontWeight: "700",
    marginBottom: 7,
  },

  title: {
    fontSize: 34,
    fontWeight: "700",
    color: C.dark,
  },

  subtitle: {
    color: C.muted,
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
  },

  headerAddButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.yellow,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  headerAddText: {
    fontSize: 28,
    lineHeight: 30,
    color: C.dark,
    fontWeight: "500",
  },

  /* PROGRESS */

  progressCard: {
    backgroundColor: C.paleTeal,
    padding: 22,
    borderRadius: 24,
    marginTop: 24,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#D2EFEC",
  },

  progressTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  progressCaption: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: C.deepTeal,
    fontWeight: "700",
    marginBottom: 4,
  },

  progressText: {
    fontSize: 30,
    fontWeight: "700",
    color: C.dark,
  },

  progressCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.yellow,
    alignItems: "center",
    justifyContent: "center",
  },

  progressPercent: {
    fontSize: 13,
    fontWeight: "800",
    color: C.dark,
  },

  barBackground: {
    height: 10,
    backgroundColor: C.white,
    borderRadius: 20,
    marginTop: 17,
    overflow: "hidden",
  },

  barFill: {
    height: "100%",
    backgroundColor: C.teal,
    borderRadius: 20,
  },

  message: {
    marginTop: 15,
    color: C.muted,
    lineHeight: 22,
    fontSize: 14,
  },

  progressStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
  },

  statItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 18,
  },

  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },

  statText: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "600",
  },

  /* CELEBRATION */

  celebrationCard: {
    backgroundColor: C.yellow,
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "center",
  },

  celebrationIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  celebrationSymbol: {
    fontSize: 24,
    color: C.teal,
  },

  celebrationContent: {
    flex: 1,
  },

  celebrationTitle: {
    fontSize: 17,
    color: C.dark,
    fontWeight: "800",
  },

  celebrationText: {
    fontSize: 12,
    color: C.dark,
    marginTop: 3,
    lineHeight: 18,
  },

  /* FILTER */

  filterSection: {
    marginBottom: 16,
  },

  filterTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.dark,
    marginBottom: 10,
  },

  filterRow: {
    flexDirection: "row",
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 5,
    borderWidth: 1,
    borderColor: C.paleTeal,
  },

  filterButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  filterButtonActive: {
    backgroundColor: C.deepTeal,
  },

  filterText: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "700",
  },

  filterTextActive: {
    color: C.white,
  },

  filterCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: 5,
    backgroundColor: C.paleTeal,
    alignItems: "center",
    justifyContent: "center",
  },

  filterCountActive: {
    backgroundColor: C.teal,
  },

  filterCountText: {
    fontSize: 9,
    fontWeight: "800",
    color: C.deepTeal,
  },

  filterCountTextActive: {
    color: C.white,
  },

  /* LOADING */

  loadingCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 17,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: C.teal,
    marginRight: 8,
  },

  loadingText: {
    color: C.muted,
    fontSize: 13,
  },

  /* TASK */

  taskCard: {
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.paleTeal,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  completedTaskCard: {
    backgroundColor: "#F5FCFB",
  },

  checkbox: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
  },

  checked: {
    backgroundColor: C.teal,
  },

  tick: {
    color: C.white,
    fontWeight: "800",
    fontSize: 16,
  },

  taskTextContainer: {
    flex: 1,
    marginLeft: 16,
  },

  taskText: {
    fontSize: 16,
    color: C.dark,
    lineHeight: 22,
  },

  doneText: {
    textDecorationLine: "line-through",
    color: C.muted,
  },

  completedLabel: {
    fontSize: 9,
    letterSpacing: 1,
    color: C.teal,
    fontWeight: "800",
    marginTop: 4,
  },

  /* EDIT / DELETE */

  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 8,
  },

  smallButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.cream,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 5,
  },

  editIcon: {
    fontSize: 15,
  },

  deleteIcon: {
    fontSize: 15,
  },

  /* ADD */

  addTaskButton: {
    backgroundColor: C.paleTeal,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
    marginBottom: 5,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#CDEDE9",
  },

  addTaskPlus: {
    fontSize: 21,
    color: C.deepTeal,
    fontWeight: "600",
    marginRight: 7,
  },

  addTaskText: {
    color: C.deepTeal,
    fontWeight: "700",
    fontSize: 15,
  },

  /* FILTER EMPTY */

  filterEmptyState: {
    backgroundColor: C.paleTeal,
    borderRadius: 22,
    padding: 25,
    alignItems: "center",
    marginTop: 4,
    marginBottom: 10,
  },

  filterEmptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },

  filterEmptySymbol: {
    fontSize: 25,
    color: C.teal,
    fontWeight: "800",
  },

  filterEmptyTitle: {
    fontSize: 18,
    color: C.dark,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 11,
  },

  filterEmptyText: {
    fontSize: 13,
    lineHeight: 20,
    color: C.muted,
    textAlign: "center",
    marginTop: 6,
  },

  showAllButton: {
    backgroundColor: C.deepTeal,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 15,
  },

  showAllText: {
    color: C.white,
    fontSize: 12,
    fontWeight: "700",
  },

  /* MOTIVATION */

  motivationCard: {
    marginTop: 20,
    backgroundColor: C.cream,
    borderRadius: 22,
    padding: 17,
    borderWidth: 1,
    borderColor: "#F0E5BA",
    flexDirection: "row",
    alignItems: "center",
  },

  motivationIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  motivationSymbol: {
    fontSize: 27,
    color: C.coral,
  },

  motivationContent: {
    flex: 1,
  },

  motivationTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.dark,
  },

  motivationText: {
    fontSize: 12,
    lineHeight: 18,
    color: C.muted,
    marginTop: 3,
  },

  /* EDIT GOALS */

  editButton: {
    marginTop: 20,
    backgroundColor: C.deepTeal,
    padding: 16,
    borderRadius: 30,
    alignItems: "center",
  },

  editButtonActive: {
    backgroundColor: C.yellow,
  },

  editText: {
    color: C.white,
    fontWeight: "700",
    fontSize: 16,
  },

  editTextActive: {
    color: C.dark,
  },

  /* MODAL */

  modalOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(14, 124, 134, 0.30)",
    justifyContent: "center",
    padding: 22,
  },

  modalCard: {
    backgroundColor: C.white,
    borderRadius: 26,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 8,
  },

  modalHandle: {
    width: 38,
    height: 5,
    borderRadius: 5,
    backgroundColor: C.paleTeal,
    alignSelf: "center",
    marginBottom: 18,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: C.dark,
  },

  modalSubtitle: {
    marginTop: 8,
    marginBottom: 20,
    color: C.muted,
    lineHeight: 20,
    fontSize: 14,
  },

  input: {
    borderWidth: 1,
    borderColor: "#CDEDE9",
    borderRadius: 15,
    padding: 14,
    fontSize: 16,
    color: C.dark,
    backgroundColor: C.cream,
    minHeight: 50,
  },

  characterCount: {
    textAlign: "right",
    fontSize: 10,
    color: C.muted,
    marginTop: 6,
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 20,
  },

  cancelButton: {
    paddingVertical: 13,
    paddingHorizontal: 18,
    marginRight: 7,
  },

  cancelText: {
    color: C.muted,
    fontWeight: "700",
  },

  modalSaveButton: {
    backgroundColor: C.deepTeal,
    paddingVertical: 13,
    paddingHorizontal: 21,
    borderRadius: 22,
  },

  saveText: {
    color: C.white,
    fontWeight: "700",
  },
});