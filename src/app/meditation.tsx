import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAudioPlayer } from "expo-audio";
import MeditationIllustration from "../../assets/undraw_meditation_k4oa.svg";

const HISTORY_KEY = "mamamind_meditation_history";

const { width, height } = Dimensions.get("window");

/* =====================================================
   MAMAMIND PALETTE
   ===================================================== */

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

type MeditationSession = {
  id: string;
  date: string;
  duration: number;
};

type FloatType = "circle" | "dot" | "ring" | "heart" | "star" | "bubble";

type FloatingDefinition = {
  type: FloatType;
  left: number;
  top: number;
  size: number;
  color: string;
};

type FloatItem = {
  x: Animated.Value;
  y: Animated.Value;
  scale: Animated.Value;
  rotate: Animated.Value;
};

const floatingDefinitions: FloatingDefinition[] = [
  { type: "bubble", left: 0.05, top: 0.13, size: 42, color: C.yellow },
  { type: "dot", left: 0.88, top: 0.09, size: 16, color: C.coral },
  { type: "heart", left: 0.08, top: 0.31, size: 31, color: C.teal },
  { type: "ring", left: 0.91, top: 0.30, size: 32, color: C.yellow },
  { type: "star", left: 0.04, top: 0.54, size: 29, color: C.coral },
  { type: "bubble", left: 0.91, top: 0.53, size: 44, color: C.teal },
  { type: "dot", left: 0.16, top: 0.72, size: 13, color: C.yellow },
  { type: "ring", left: 0.82, top: 0.75, size: 24, color: C.coral },
];

const encouragements = [
  {
    title: "You made space for yourself. ♡",
    text: "Even a few quiet minutes count. Carry this little moment with you.",
  },
  {
    title: "You showed up for yourself. ✨",
    text: "Taking care of yourself is part of taking care of everyone you love.",
  },
  {
    title: "A little pause can go a long way. 🌸",
    text: "You don't need to do everything at once. One calm moment is enough.",
  },
  {
    title: "You gave yourself some breathing room. ♡",
    text: "Keep this feeling of calm with you as you continue your day.",
  },
  {
    title: "You chose yourself for a few minutes. 🌿",
    text: "That small choice matters more than you think.",
  },
];

const durationOptions = [1, 5, 10, 15];

const FloatingShape = ({
  definition,
  item,
}: {
  definition: FloatingDefinition;
  item: FloatItem;
}) => {
  const renderShape = () => {
    switch (definition.type) {
      case "heart":
        return (
          <Text
            style={[
              styles.floatHeart,
              { color: definition.color, fontSize: definition.size },
            ]}
          >
            ♡
          </Text>
        );

      case "star":
        return (
          <Text
            style={[
              styles.floatStar,
              { color: definition.color, fontSize: definition.size },
            ]}
          >
            ✦
          </Text>
        );

      case "ring":
        return (
          <View
            style={{
              width: definition.size,
              height: definition.size,
              borderRadius: definition.size / 2,
              borderWidth: 3,
              borderColor: definition.color,
            }}
          />
        );

      case "dot":
        return (
          <View
            style={{
              width: definition.size,
              height: definition.size,
              borderRadius: definition.size / 2,
              backgroundColor: definition.color,
            }}
          />
        );

      case "bubble":
        return (
          <View
            style={{
              width: definition.size,
              height: definition.size,
              borderRadius: definition.size * 0.38,
              backgroundColor: definition.color,
              opacity: 0.82,
            }}
          />
        );

      case "circle":
        return (
          <View
            style={{
              width: definition.size,
              height: definition.size,
              borderRadius: definition.size / 2,
              backgroundColor: definition.color,
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.floatingElement,
        {
          left: width * definition.left,
          top: height * definition.top,
          transform: [
            { translateX: item.x },
            { translateY: item.y },
            { scale: item.scale },
            {
              rotate: item.rotate.interpolate({
                inputRange: [-1, 1],
                outputRange: ["-6deg", "6deg"],
              }),
            },
          ],
        },
      ]}
    >
      {renderShape()}
    </Animated.View>
  );
};

export default function Meditation() {
  const [selectedDuration, setSelectedDuration] = useState(5);
  const [timeLeft, setTimeLeft] = useState(5 * 60);

  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [history, setHistory] = useState<MeditationSession[]>([]);

  const [completionMessage, setCompletionMessage] = useState(
    encouragements[0]
  );

  const breathingAnimation = useRef(new Animated.Value(0)).current;

  const floatingItems = useRef<FloatItem[]>(
    floatingDefinitions.map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      scale: new Animated.Value(1),
      rotate: new Animated.Value(0),
    }))
  ).current;

  const floatingAnimations = useRef<Animated.CompositeAnimation[]>([]).current;

  // Completion sound
  const beepPlayer = useAudioPlayer(
    require("../../assets/images/meditate.mp3")
  );

  /* =====================================================
     LOAD MEDITATION HISTORY
     ===================================================== */

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const savedHistory = await AsyncStorage.getItem(HISTORY_KEY);

      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.log("Could not load meditation history:", error);
    }
  };

  /* =====================================================
     SAVE COMPLETED SESSION
     ===================================================== */

  const saveSession = async (duration: number) => {
    try {
      const newSession: MeditationSession = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        duration,
      };

      const updatedHistory = [newSession, ...history];

      setHistory(updatedHistory);

      await AsyncStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(updatedHistory)
      );
    } catch (error) {
      console.log("Could not save meditation session:", error);
    }
  };

  /* =====================================================
     FLOATING BACKGROUND ANIMATION
     ===================================================== */

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    floatingItems.forEach((item, index) => {
      const move = () => {
        if (cancelled) return;

        const xDistance = (Math.random() - 0.5) * 75;
        const yDistance = (Math.random() - 0.5) * 70;
        const duration = 6500 + Math.random() * 2600;
        const rotateTarget = Math.random() > 0.5 ? 1 : -1;

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

        floatingAnimations[index] = animation;

        animation.start(({ finished }) => {
          if (finished && !cancelled) {
            move();
          }
        });
      };

      timers.push(
        setTimeout(() => {
          move();
        }, index * 220)
      );
    });

    return () => {
      cancelled = true;

      timers.forEach((timer) => clearTimeout(timer));

      floatingAnimations.forEach((animation) => animation?.stop());
    };
  }, []);

  /* =====================================================
     START BREATHING ANIMATION
     ===================================================== */

  const startBreathingAnimation = () => {
    breathingAnimation.setValue(0);

    Animated.loop(
      Animated.sequence([
        Animated.timing(breathingAnimation, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),

        Animated.timing(breathingAnimation, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  /* =====================================================
     START MEDITATION
     ===================================================== */

  const startMeditation = () => {
    const seconds = selectedDuration * 60;

    setTimeLeft(seconds);
    setCompleted(false);
    setStarted(true);

    startBreathingAnimation();
  };

  /* =====================================================
     FINISH MEDITATION
     ===================================================== */

  const finishMeditation = async () => {
    breathingAnimation.stopAnimation();

    setStarted(false);
    setCompleted(true);

    // Play completion sound
    try {
      beepPlayer.seekTo(0);
      beepPlayer.play();
    } catch (error) {
      console.log("Could not play completion sound:", error);
    }

    // Pick an encouragement
    const randomIndex = Math.floor(
      Math.random() * encouragements.length
    );

    setCompletionMessage(encouragements[randomIndex]);

    // Save session
    await saveSession(selectedDuration);
  };

  /* =====================================================
     TIMER
     ===================================================== */

  useEffect(() => {
    if (!started) return;

    const timer = setInterval(() => {
      setTimeLeft((previousTime) => {
        if (previousTime <= 1) {
          clearInterval(timer);

          setTimeout(() => {
            finishMeditation();
          }, 100);

          return 0;
        }

        return previousTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started]);

  /* =====================================================
     CLEANUP
     ===================================================== */

  useEffect(() => {
    return () => {
      breathingAnimation.stopAnimation();
    };
  }, []);

  /* =====================================================
     FORMAT TIME
     ===================================================== */

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  /* =====================================================
     SELECT DURATION
     ===================================================== */

  const selectDuration = (minutes: number) => {
    if (started) return;

    setSelectedDuration(minutes);
    setTimeLeft(minutes * 60);
  };

  /* =====================================================
     HISTORY DATA
     ===================================================== */

  const totalSessions = history.length;

  const totalMinutes = history.reduce(
    (total, session) => total + session.duration,
    0
  );

  /* =====================================================
     ANIMATION
     ===================================================== */

  // Main breathing scale is intentionally unchanged: 0.85 -> 1.15 -> 0.85
  const breathingScale = breathingAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.15],
  });

  const breathingOpacity = breathingAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1],
  });

  // Extra decorative motion uses the same breathing progress
  // without changing the main scale.
  const breathingRotation = breathingAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["-3deg", "3deg"],
  });

  const accentOneY = breathingAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [8, -10],
  });

  const accentTwoY = breathingAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 10],
  });

  const accentThreeX = breathingAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-7, 8],
  });

  const accentOpacity = breathingAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 0.95],
  });

  /* =====================================================
     UI
     ===================================================== */

  return (
    <View style={styles.screen}>
      {/* FLOATING BACKGROUND */}

      <View pointerEvents="none" style={styles.floatingLayer}>
        {floatingDefinitions.map((definition, index) => (
          <FloatingShape
            key={index}
            definition={definition}
            item={floatingItems[index]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* BACK */}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* HEADER */}

        <Text style={styles.label}>A LITTLE PAUSE</Text>

        <Text style={styles.title}>
          Breathe.{"\n"}
          You are here.
        </Text>

        <Text style={styles.subtitle}>
          You don't need to fix everything right now.
          Just give yourself a few quiet minutes.
        </Text>

        {/* UNIQUE MEDITATION VISUAL */}

        <View style={styles.visual}>
          <MeditationIllustration
            width="100%"
            height="100%"
          />
        </View>

        {/* DURATION SELECTOR */}

        {!started && !completed && (
          <View style={styles.durationCard}>
            <Text style={styles.durationLabel}>CHOOSE YOUR TIME</Text>

            <Text style={styles.durationTitle}>
              How long would you like to pause?
            </Text>

            <View style={styles.durationRow}>
              {durationOptions.map((minutes) => (
                <TouchableOpacity
                  key={minutes}
                  style={[
                    styles.durationButton,
                    selectedDuration === minutes &&
                      styles.durationButtonActive,
                  ]}
                  onPress={() => selectDuration(minutes)}
                >
                  <Text
                    style={[
                      styles.durationNumber,
                      selectedDuration === minutes &&
                        styles.durationNumberActive,
                    ]}
                  >
                    {minutes}
                  </Text>

                  <Text
                    style={[
                      styles.durationUnit,
                      selectedDuration === minutes &&
                        styles.durationUnitActive,
                    ]}
                  >
                    min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* READY CARD */}

        {!started && !completed && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>YOUR SESSION</Text>

            <Text style={styles.cardTitle}>Gentle breathing</Text>

            <Text style={styles.cardText}>
              Sit somewhere comfortable. Relax your shoulders
              and follow your breath without trying to change it.
            </Text>

            <View style={styles.selectedTimeBox}>
              <Text style={styles.selectedTime}>{selectedDuration}</Text>

              <Text style={styles.selectedTimeUnit}>minutes</Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={startMeditation}
            >
              <Text style={styles.primaryText}>Begin Meditation</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ACTIVE MEDITATION */}

        {started && (
          <View style={styles.activeCard}>
            <Text style={styles.cardLabel}>RIGHT NOW</Text>

            <Text style={styles.breatheText}>Breathe slowly</Text>

            {/* Animated breathing circle */}

            <View style={styles.breathingStage}>
              <Animated.View
                style={[
                  styles.breathAccentOne,
                  {
                    opacity: accentOpacity,
                    transform: [
                      { translateY: accentOneY },
                      { rotate: breathingRotation },
                    ],
                  },
                ]}
              />

              <Animated.View
                style={[
                  styles.breathAccentTwo,
                  {
                    opacity: accentOpacity,
                    transform: [
                      { translateY: accentTwoY },
                      { rotate: breathingRotation },
                    ],
                  },
                ]}
              />

              <Animated.View
                style={[
                  styles.breathAccentThree,
                  {
                    opacity: accentOpacity,
                    transform: [{ translateX: accentThreeX }],
                  },
                ]}
              />

              <Animated.View
                style={[
                  styles.breathCircleOuter,
                  {
                    transform: [{ scale: breathingScale }],
                    opacity: breathingOpacity,
                  },
                ]}
              >
                <View style={styles.breathCircleInner}>
                  <Text style={styles.timerText}>
                    {formatTime(timeLeft)}
                  </Text>

                  <Text style={styles.timerLabel}>remaining</Text>
                </View>
              </Animated.View>
            </View>

            <Text style={styles.breathInstruction}>
              Breathe in as the circle grows.
              Breathe out as it gently returns.
            </Text>

            <TouchableOpacity
              style={styles.finishButton}
              onPress={finishMeditation}
            >
              <Text style={styles.finishButtonText}>Finish Early</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* COMPLETION */}

        {completed && (
          <View style={styles.completedCard}>
            <View style={styles.completedCircle}>
              <Text style={styles.completedHeart}>✓</Text>
            </View>

            <Text style={styles.completedLabel}>
              MEDITATION COMPLETE
            </Text>

            <Text style={styles.completedTitle}>
              {completionMessage.title}
            </Text>

            <Text style={styles.completedText}>
              {completionMessage.text}
            </Text>

            <View style={styles.completedTimeBox}>
              <Text style={styles.completedTime}>
                {selectedDuration}
              </Text>

              <Text style={styles.completedTimeLabel}>
                peaceful minutes
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.back()}
            >
              <Text style={styles.primaryText}>Back to My Space</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* OTHER OPTIONS */}

        {!started && !completed && (
          <View style={styles.options}>
            <Text style={styles.optionsTitle}>
              When you need a little more
            </Text>

            <View style={styles.optionRow}>
              <View style={styles.option}>
                <Text style={styles.optionNumber}>01</Text>

                <Text style={styles.optionTitle}>
                  Slow breathing
                </Text>

                <Text style={styles.optionText}>
                  Find your rhythm.
                </Text>
              </View>

              <View style={styles.option}>
                <Text style={styles.optionNumber}>02</Text>

                <Text style={styles.optionTitle}>Body pause</Text>

                <Text style={styles.optionText}>
                  Release some tension.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* MEDITATION HISTORY */}

        {!started && (
          <View style={styles.historySection}>
            <Text style={styles.optionsTitle}>
              Your Meditation Journey
            </Text>

            {/* Stats */}

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {totalSessions}
                </Text>

                <Text style={styles.statLabel}>Sessions</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statNumber}>
                  {totalMinutes}
                </Text>

                <Text style={styles.statLabel}>Minutes</Text>
              </View>
            </View>

            {/* History */}

            {history.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Text style={styles.emptyHistoryIcon}>♡</Text>

                <Text style={styles.emptyHistoryTitle}>
                  Your journey starts here.
                </Text>

                <Text style={styles.emptyHistoryText}>
                  Complete your first meditation and
                  it will appear here.
                </Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {history.slice(0, 5).map((session) => {
                  const sessionDate = new Date(session.date);

                  return (
                    <View
                      key={session.id}
                      style={styles.historyItem}
                    >
                      <View style={styles.historyIcon}>
                        <Text style={styles.historyIconText}>
                          ♡
                        </Text>
                      </View>

                      <View style={styles.historyInfo}>
                        <Text style={styles.historyTitle}>
                          {session.duration} minute meditation
                        </Text>

                        <Text style={styles.historyDate}>
                          {sessionDate.toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </Text>
                      </View>

                      <Text style={styles.historyCheck}>✓</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.cream,
  },

  container: {
    flex: 1,
    backgroundColor: "transparent",
    zIndex: 1,
  },

  content: {
    padding: 22,
    paddingBottom: 60,
  },

  /* FLOATING */

  floatingLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },

  floatingElement: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },

  floatHeart: {
    fontWeight: "800",
  },

  floatStar: {
    fontWeight: "800",
  },

  /* BACK */

  backButton: {
    marginTop: 45,
    marginBottom: 28,
  },

  backText: {
    fontSize: 15,
    color: C.deepTeal,
    fontWeight: "700",
  },

  /* HEADER */

  label: {
    fontSize: 11,
    letterSpacing: 2,
    color: C.deepTeal,
    fontWeight: "700",
  },

  title: {
    fontSize: 38,
    lineHeight: 43,
    fontWeight: "700",
    color: C.dark,
    marginTop: 10,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: C.muted,
    marginTop: 14,
  },

  /* UNIQUE VISUAL */

  visual: {
    height: 280,
    backgroundColor: C.paleTeal,
    borderRadius: 32,
    marginTop: 28,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
  },

  moonGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: C.yellow,
    top: 20,
    right: 20,
  },

  moon: {
    position: "absolute",
    width: 95,
    height: 95,
    borderRadius: 48,
    backgroundColor: C.deepTeal,
    top: 55,
    right: 65,
  },

  starOne: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.white,
    top: 55,
    left: 55,
  },

  starTwo: {
    position: "absolute",
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.white,
    top: 105,
    left: 90,
  },

  starThree: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.white,
    top: 75,
    right: 40,
  },

  meditationPerson: {
    width: 160,
    height: 170,
    alignItems: "center",
    position: "relative",
    zIndex: 2,
  },

  head: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#D89578",
    marginTop: 12,
  },

  body: {
    width: 78,
    height: 88,
    borderTopLeftRadius: 42,
    borderTopRightRadius: 42,
    backgroundColor: C.deepTeal,
    marginTop: 8,
  },

  leftLeg: {
    position: "absolute",
    width: 75,
    height: 18,
    borderRadius: 15,
    backgroundColor: C.deepTeal,
    bottom: 5,
    left: 5,
    transform: [{ rotate: "12deg" }],
  },

  rightLeg: {
    position: "absolute",
    width: 75,
    height: 18,
    borderRadius: 15,
    backgroundColor: C.deepTeal,
    bottom: 5,
    right: 5,
    transform: [{ rotate: "-12deg" }],
  },

  leftArm: {
    position: "absolute",
    width: 55,
    height: 14,
    borderRadius: 10,
    backgroundColor: C.deepTeal,
    left: 5,
    top: 92,
    transform: [{ rotate: "25deg" }],
  },

  rightArm: {
    position: "absolute",
    width: 55,
    height: 14,
    borderRadius: 10,
    backgroundColor: C.deepTeal,
    right: 5,
    top: 92,
    transform: [{ rotate: "-25deg" }],
  },

  ground: {
    position: "absolute",
    width: "75%",
    height: 16,
    borderRadius: 20,
    backgroundColor: C.paleTeal,
    bottom: 25,
  },

  /* DURATION */

  durationCard: {
    backgroundColor: C.white,
    borderRadius: 25,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: C.paleTeal,
  },

  durationLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: C.deepTeal,
    fontWeight: "700",
  },

  durationTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: C.dark,
    marginTop: 7,
  },

  durationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 17,
  },

  durationButton: {
    width: "23%",
    backgroundColor: C.cream,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.paleTeal,
  },

  durationButtonActive: {
    backgroundColor: C.deepTeal,
    borderColor: C.deepTeal,
  },

  durationNumber: {
    fontSize: 19,
    fontWeight: "700",
    color: C.deepTeal,
  },

  durationNumberActive: {
    color: C.white,
  },

  durationUnit: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },

  durationUnitActive: {
    color: C.paleTeal,
  },

  /* READY CARD */

  card: {
    backgroundColor: C.white,
    borderRadius: 28,
    padding: 24,
    marginTop: 20,
    borderWidth: 1,
    borderColor: C.paleTeal,
    shadowColor: C.deepTeal,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  cardLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: C.deepTeal,
    fontWeight: "700",
  },

  cardTitle: {
    fontSize: 25,
    fontWeight: "700",
    color: C.dark,
    marginTop: 8,
  },

  cardText: {
    fontSize: 15,
    lineHeight: 23,
    color: C.muted,
    marginTop: 12,
  },

  selectedTimeBox: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginTop: 18,
  },

  selectedTime: {
    fontSize: 38,
    fontWeight: "700",
    color: C.deepTeal,
  },

  selectedTimeUnit: {
    fontSize: 15,
    color: C.muted,
    marginLeft: 7,
  },

  /* BUTTON */

  primaryButton: {
    backgroundColor: C.deepTeal,
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 25,
    alignItems: "center",
    marginTop: 22,
    shadowColor: C.deepTeal,
    shadowOpacity: 0.18,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  primaryText: {
    color: C.white,
    fontSize: 15,
    fontWeight: "700",
  },

  /* ACTIVE MEDITATION */

  activeCard: {
    backgroundColor: C.paleTeal,
    borderRadius: 28,
    padding: 25,
    marginTop: 20,
    alignItems: "center",
  },

  breatheText: {
    textAlign: "center",
    fontSize: 23,
    fontWeight: "700",
    color: C.dark,
    marginTop: 20,
  },

  breathingStage: {
    width: 250,
    height: 250,
    marginTop: 22,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  breathAccentOne: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.yellow,
    top: 25,
    left: 34,
  },

  breathAccentTwo: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: C.coral,
    top: 42,
    right: 34,
  },

  breathAccentThree: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.teal,
    bottom: 28,
    left: 42,
  },

  breathCircleOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },

  breathCircleInner: {
    width: 175,
    height: 175,
    borderRadius: 88,
    backgroundColor: C.deepTeal,
    alignItems: "center",
    justifyContent: "center",
  },

  timerText: {
    fontSize: 40,
    fontWeight: "700",
    color: C.white,
  },

  timerLabel: {
    fontSize: 12,
    color: C.paleTeal,
    marginTop: 3,
  },

  breathInstruction: {
    fontSize: 14,
    lineHeight: 21,
    color: C.muted,
    textAlign: "center",
    marginTop: 22,
  },

  finishButton: {
    borderWidth: 1.5,
    borderColor: C.deepTeal,
    borderRadius: 26,
    paddingHorizontal: 25,
    paddingVertical: 12,
    marginTop: 20,
  },

  finishButtonText: {
    color: C.deepTeal,
    fontSize: 14,
    fontWeight: "700",
  },

  /* COMPLETED */

  completedCard: {
    backgroundColor: C.paleTeal,
    borderRadius: 28,
    padding: 25,
    marginTop: 20,
    alignItems: "center",
  },

  completedCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.deepTeal,
    alignItems: "center",
    justifyContent: "center",
  },

  completedHeart: {
    fontSize: 35,
    color: C.white,
    fontWeight: "700",
  },

  completedLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: C.deepTeal,
    fontWeight: "700",
    marginTop: 18,
  },

  completedTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: C.dark,
    textAlign: "center",
    marginTop: 10,
  },

  completedText: {
    fontSize: 15,
    lineHeight: 22,
    color: C.muted,
    textAlign: "center",
    marginTop: 10,
  },

  completedTimeBox: {
    backgroundColor: C.cream,
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 18,
  },

  completedTime: {
    fontSize: 25,
    fontWeight: "700",
    color: C.deepTeal,
  },

  completedTimeLabel: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },

  /* OPTIONS */

  options: {
    marginTop: 30,
  },

  optionsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: C.dark,
    marginBottom: 15,
  },

  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  option: {
    width: "48%",
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 17,
    borderWidth: 1,
    borderColor: C.paleTeal,
  },

  optionNumber: {
    fontSize: 12,
    color: C.deepTeal,
    fontWeight: "700",
  },

  optionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.dark,
    marginTop: 8,
  },

  optionText: {
    fontSize: 13,
    color: C.muted,
    marginTop: 5,
  },

  /* HISTORY */

  historySection: {
    marginTop: 32,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  statCard: {
    width: "48%",
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: C.paleTeal,
  },

  statNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: C.deepTeal,
  },

  statLabel: {
    fontSize: 13,
    color: C.muted,
    marginTop: 3,
  },

  emptyHistory: {
    backgroundColor: C.paleTeal,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    marginTop: 15,
  },

  emptyHistoryIcon: {
    fontSize: 35,
    color: C.teal,
  },

  emptyHistoryTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: C.dark,
    marginTop: 8,
  },

  emptyHistoryText: {
    fontSize: 13,
    lineHeight: 19,
    color: C.muted,
    textAlign: "center",
    marginTop: 6,
  },

  historyList: {
    marginTop: 15,
  },

  historyItem: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.paleTeal,
  },

  historyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.paleTeal,
    alignItems: "center",
    justifyContent: "center",
  },

  historyIconText: {
    fontSize: 22,
    color: C.teal,
  },

  historyInfo: {
    flex: 1,
    marginLeft: 12,
  },

  historyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.dark,
  },

  historyDate: {
    fontSize: 12,
    color: C.muted,
    marginTop: 4,
  },

  historyCheck: {
    fontSize: 18,
    fontWeight: "700",
    color: C.teal,
  },
});