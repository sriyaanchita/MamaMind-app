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
import {
  collection,
  doc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAudioPlayer } from "expo-audio";
import MeditationIllustration from "../../assets/undraw_meditation_k4oa.svg";
import { logActivity } from "../utils/activityLogger";

const { width } = Dimensions.get("window");

const HISTORY_KEY = "mamamind_meditation_history";
const TODAY_MEDITATION_KEY = "mamamind_meditation_today";

type MeditationSession = {
  id: string;
  date: string;
  duration: number;
};

const meditationOptions = [1, 5, 10, 15];

export default function Meditation() {
  const [selectedDuration, setSelectedDuration] = useState(5);
  const [isMeditating, setIsMeditating] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5 * 60);
  const [history, setHistory] = useState<MeditationSession[]>([]);
  const [encouragement, setEncouragement] = useState("");

  const breathingAnim = useRef(new Animated.Value(1)).current;
  const floatingAnim = useRef(new Animated.Value(0)).current;

  const player = useAudioPlayer(
    require("../../assets/images/meditate.mp3")
  );

  /* --------------------------------------------------
     LOAD MEDITATION HISTORY
  -------------------------------------------------- */

  useEffect(() => {
    loadHistory();
  }, []);
  const loadHistory = async () => {
  try {
    const savedHistory = await AsyncStorage.getItem(HISTORY_KEY);

    const localHistory: MeditationSession[] = savedHistory
      ? JSON.parse(savedHistory)
      : [];

    const user = auth.currentUser;

    // If signed out, retain the existing local-only behavior.
    if (!user) {
      setHistory(localHistory);
      return;
    }

    const historyRef = collection(
      db,
      "users",
      user.uid,
      "meditationHistory"
    );

    // Migrate existing local sessions to the cloud.
    await Promise.all(
      localHistory.map((session) =>
        setDoc(doc(historyRef, session.id), session, {
          merge: true,
        })
      )
    );

    // Load sessions from Firestore.
    const snapshot = await getDocs(historyRef);

    const cloudHistory: MeditationSession[] = snapshot.docs.map(
      (item) => item.data() as MeditationSession
    );

    // Merge by ID to avoid duplicates.
    const merged = new Map<string, MeditationSession>();

    localHistory.forEach((session) => {
      merged.set(session.id, session);
    });

    cloudHistory.forEach((session) => {
      merged.set(session.id, session);
    });

    const updatedHistory = Array.from(merged.values()).sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    );

    await AsyncStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(updatedHistory)
    );

    setHistory(updatedHistory);
  } catch (error) {
    console.log("Error loading meditation history:", error);

    // Keep the screen usable if cloud sync fails.
    try {
      const savedHistory = await AsyncStorage.getItem(HISTORY_KEY);
      setHistory(savedHistory ? JSON.parse(savedHistory) : []);
    } catch {
      setHistory([]);
    }
  }
};

  /* --------------------------------------------------
     FLOATING BACKGROUND ANIMATION
  -------------------------------------------------- */

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingAnim, {
          toValue: 1,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatingAnim, {
          toValue: 0,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  /* --------------------------------------------------
     BREATHING ANIMATION
  -------------------------------------------------- */

  useEffect(() => {
    if (!isMeditating) {
      breathingAnim.stopAnimation();
      breathingAnim.setValue(1);
      return;
    }

    Animated.loop(
      Animated.sequence([
        Animated.timing(breathingAnim, {
          toValue: 1.25,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathingAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [isMeditating]);

  /* --------------------------------------------------
     TIMER
  -------------------------------------------------- */

  useEffect(() => {
    if (!isMeditating) return;

    if (timeLeft <= 0) {
      finishMeditation();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((previous) => previous - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isMeditating, timeLeft]);

  /* --------------------------------------------------
     FORMAT TIME
  -------------------------------------------------- */

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  /* --------------------------------------------------
     SAVE MEDITATION HISTORY
  -------------------------------------------------- */

  const saveSession = async (duration: number) => {
  const newSession: MeditationSession = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString(),
    duration,
  };

  try {
    const savedHistory = await AsyncStorage.getItem(HISTORY_KEY);

    const existingHistory: MeditationSession[] = savedHistory
      ? JSON.parse(savedHistory)
      : [];

    const updatedHistory = [newSession, ...existingHistory];

    await AsyncStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(updatedHistory)
    );

    setHistory(updatedHistory);
  } catch (error) {
    console.log("Error saving meditation locally:", error);
  }

  try {
    const user = auth.currentUser;

    if (!user) {
      console.log(
        "Meditation saved locally. Sign in to sync it to the cloud."
      );
      return;
    }

    await setDoc(
      doc(
        db,
        "users",
        user.uid,
        "meditationHistory",
        newSession.id
      ),
      newSession
    );

    console.log("Meditation history synced to Firestore:", newSession);
  } catch (error) {
    console.log("Error syncing meditation history:", error);
  }
};

  /* --------------------------------------------------
     START MEDITATION
  -------------------------------------------------- */

  const startMeditation = () => {
    setCompleted(false);
    setTimeLeft(selectedDuration * 60);
    setIsMeditating(true);
  };

  /* --------------------------------------------------
     FINISH MEDITATION
  -------------------------------------------------- */

  const finishMeditation = async () => {
    setIsMeditating(false);
    setCompleted(true);

    const messages = [
      "You made space for yourself today.",
      "A calm moment can make a big difference.",
      "You took care of yourself. That matters.",
      "You deserve moments like this.",
    ];

    const randomMessage =
      messages[Math.floor(Math.random() * messages.length)];

    setEncouragement(randomMessage);

    /* Play completion sound */
    try {
      player.seekTo(0);
      player.play();
    } catch (error) {
      console.log("Audio error:", error);
    }

    /* Save meditation history */
    await saveSession(selectedDuration);
    const activity = await logActivity("meditation", {
  duration: selectedDuration,
});

console.log("Saved Activity:", activity);

    /* --------------------------------------------------
       NEW:
       SAVE THAT MEDITATION WAS COMPLETED TODAY
    -------------------------------------------------- */

    try {
      await AsyncStorage.setItem(
        TODAY_MEDITATION_KEY,
        JSON.stringify({
          completed: true,
          date: new Date().toISOString().slice(0, 10),
        })
      );
    } catch (error) {
      console.log(
        "Error saving today's meditation status:",
        error
      );
    }
  };
  

  /* --------------------------------------------------
     RESET
  -------------------------------------------------- */

  const resetMeditation = () => {
    setCompleted(false);
    setIsMeditating(false);
    setTimeLeft(selectedDuration * 60);
  };

  /* --------------------------------------------------
     SELECT DURATION
  -------------------------------------------------- */

  const selectDuration = (duration: number) => {
    if (isMeditating) return;

    setSelectedDuration(duration);
    setTimeLeft(duration * 60);
    setCompleted(false);
  };

  /* --------------------------------------------------
     TODAY'S STATS
  -------------------------------------------------- */

  const today = new Date().toISOString().slice(0, 10);

  const todaySessions = history.filter(
    (session) => session.date.slice(0, 10) === today
  );

  const todayMinutes = todaySessions.reduce(
    (total, session) => total + session.duration,
    0
  );

  /* --------------------------------------------------
     FLOATING ANIMATION
  -------------------------------------------------- */

  const floatingTranslate = floatingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  return (
    <View style={styles.container}>
      {/* --------------------------------------------------
          BACKGROUND FLOATING CIRCLE
      -------------------------------------------------- */}

      <Animated.View
        style={[
          styles.backgroundCircle,
          {
            transform: [
              {
                translateY: floatingTranslate,
              },
            ],
          },
        ]}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* --------------------------------------------------
            HEADER
        -------------------------------------------------- */}

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.smallTitle}>MAMAMIND</Text>
            <Text style={styles.headerTitle}>Meditation</Text>
          </View>
        </View>

        {/* --------------------------------------------------
            INTRO CARD
        -------------------------------------------------- */}

        <View style={styles.introCard}>
          <View style={styles.introTextContainer}>
            <Text style={styles.introSmall}>
              A MOMENT FOR YOU
            </Text>

            <Text style={styles.introTitle}>
              Breathe.{"\n"}
              Relax.{"\n"}
              Reset.
            </Text>

            <Text style={styles.introDescription}>
              You don't need a lot of time. Even a few
              quiet minutes can help you feel a little
              lighter.
            </Text>
          </View>

          <MeditationIllustration
            width={145}
            height={145}
          />
        </View>

        {/* --------------------------------------------------
            DURATION
        -------------------------------------------------- */}

        <Text style={styles.sectionTitle}>
          CHOOSE YOUR MOMENT
        </Text>

        <View style={styles.durationRow}>
          {meditationOptions.map((duration) => {
            const selected = selectedDuration === duration;

            return (
              <TouchableOpacity
                key={duration}
                style={[
                  styles.durationButton,
                  selected && styles.durationButtonSelected,
                ]}
                onPress={() => selectDuration(duration)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.durationNumber,
                    selected && styles.durationNumberSelected,
                  ]}
                >
                  {duration}
                </Text>

                <Text
                  style={[
                    styles.durationText,
                    selected && styles.durationTextSelected,
                  ]}
                >
                  min
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* --------------------------------------------------
            MEDITATION AREA
        -------------------------------------------------- */}

        <View style={styles.meditationCard}>
          {!isMeditating && !completed && (
            <>
              <Animated.View
                style={[
                  styles.breathCircle,
                  {
                    transform: [
                      {
                        scale: breathingAnim,
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.innerCircle}>
                  <Text style={styles.breathText}>
                    {selectedDuration}
                  </Text>

                  <Text style={styles.breathLabel}>
                    MINUTES
                  </Text>
                </View>
              </Animated.View>

              <Text style={styles.meditationTitle}>
                Ready when you are
              </Text>

              <Text style={styles.meditationDescription}>
                Find a comfortable place, put your phone
                down and give yourself this little moment.
              </Text>

              <TouchableOpacity
                style={styles.startButton}
                onPress={startMeditation}
                activeOpacity={0.85}
              >
                <Text style={styles.startButtonText}>
                  BEGIN MEDITATION
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* --------------------------------------------------
              ACTIVE MEDITATION
          -------------------------------------------------- */}

          {isMeditating && (
            <>
              <Animated.View
                style={[
                  styles.breathCircle,
                  styles.activeBreathCircle,
                  {
                    transform: [
                      {
                        scale: breathingAnim,
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.innerCircle}>
                  <Text style={styles.timerText}>
                    {formatTime(timeLeft)}
                  </Text>

                  <Text style={styles.breathLabel}>
                    BREATHE
                  </Text>
                </View>
              </Animated.View>

              <Text style={styles.meditationTitle}>
                Stay with your breath
              </Text>

              <Text style={styles.meditationDescription}>
                Slowly breathe in... and breathe out.
                There's nowhere else you need to be right now.
              </Text>

              <TouchableOpacity
                style={styles.stopButton}
                onPress={finishMeditation}
                activeOpacity={0.85}
              >
                <Text style={styles.stopButtonText}>
                  FINISH
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* --------------------------------------------------
              COMPLETED
          -------------------------------------------------- */}

          {completed && (
            <>
              <View style={styles.completedCircle}>
                <Text style={styles.completedMark}>✓</Text>
              </View>

              <Text style={styles.completedTitle}>
                You did it.
              </Text>

              <Text style={styles.encouragement}>
                {encouragement}
              </Text>

              <View style={styles.completedInfo}>
                <Text style={styles.completedInfoSmall}>
                  MEDITATION COMPLETED
                </Text>

                <Text style={styles.completedInfoMain}>
                  {selectedDuration} minutes
                </Text>
              </View>

              <TouchableOpacity
                style={styles.startButton}
                onPress={resetMeditation}
                activeOpacity={0.85}
              >
                <Text style={styles.startButtonText}>
                  MEDITATE AGAIN
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* --------------------------------------------------
            TODAY'S PROGRESS
        -------------------------------------------------- */}

        <Text style={styles.sectionTitle}>
          YOUR CALM MOMENTS
        </Text>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {todayMinutes}
            </Text>

            <Text style={styles.statLabel}>
              MINUTES TODAY
            </Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {todaySessions.length}
            </Text>

            <Text style={styles.statLabel}>
              SESSIONS
            </Text>
          </View>
        </View>

        {/* --------------------------------------------------
            HISTORY
        -------------------------------------------------- */}

        {history.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              RECENT MOMENTS
            </Text>

            <View style={styles.historyCard}>
              {history.slice(0, 5).map((session) => {
                const sessionDate = new Date(session.date);

                return (
                  <View
                    key={session.id}
                    style={styles.historyRow}
                  >
                    <View style={styles.historyLeft}>
                      <View style={styles.historyDot} />

                      <View>
                        <Text style={styles.historyTitle}>
                          Meditation
                        </Text>

                        <Text style={styles.historyDate}>
                          {sessionDate.toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                            }
                          )}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.historyDuration}>
                      {session.duration} min
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* --------------------------------------------------
            GENTLE REMINDER
        -------------------------------------------------- */}

        <View style={styles.reminderCard}>
          <Text style={styles.reminderLabel}>
            A LITTLE REMINDER
          </Text>

          <Text style={styles.reminderText}>
            Taking care of yourself isn't something
            extra. It's part of taking care of your family.
          </Text>
        </View>

        {/* --------------------------------------------------
            VOICE COMMAND
        -------------------------------------------------- */}

        <View style={styles.voiceCard}>
          <Text style={styles.voiceLabel}>
            MAMAMIND COMMAND
          </Text>

          <Text style={styles.voiceCommand}>
            "Open meditation"
          </Text>

          <Text style={styles.voiceDescription}>
            Voice navigation is ready for the development
            build. For now, use the command options on
            your dashboard.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* ==========================================================
   STYLES
========================================================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF9E8",
  },

  scrollContent: {
    paddingTop: 55,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },

  backgroundCircle: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: "#E8F8F6",
    right: -90,
    top: 110,
    opacity: 0.65,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  backText: {
    fontSize: 34,
    lineHeight: 36,
    color: "#164F52",
    fontWeight: "300",
  },

  smallTitle: {
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
    color: "#19B7B0",
    marginBottom: 3,
  },

  headerTitle: {
    fontSize: 27,
    fontWeight: "700",
    color: "#164F52",
  },

  introCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 22,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
    overflow: "hidden",
  },

  introTextContainer: {
    flex: 1,
    paddingRight: 5,
  },

  introSmall: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: "#19B7B0",
    fontWeight: "700",
    marginBottom: 9,
  },

  introTitle: {
    fontSize: 29,
    lineHeight: 32,
    fontWeight: "700",
    color: "#164F52",
    marginBottom: 10,
  },

  introDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: "#648384",
  },

  sectionTitle: {
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: "700",
    color: "#648384",
    marginBottom: 12,
    marginLeft: 3,
  },

  durationRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 22,
  },

  durationButton: {
    flex: 1,
    minHeight: 65,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  durationButtonSelected: {
    backgroundColor: "#19B7B0",
  },

  durationNumber: {
    fontSize: 21,
    fontWeight: "700",
    color: "#164F52",
  },

  durationNumberSelected: {
    color: "#FFFFFF",
  },

  durationText: {
    fontSize: 9,
    color: "#648384",
    marginTop: 1,
  },

  durationTextSelected: {
    color: "#FFFFFF",
  },

  meditationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    padding: 25,
    alignItems: "center",
    marginBottom: 28,
    minHeight: 410,
    justifyContent: "center",
  },

  breathCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#E8F8F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 22,
  },

  activeBreathCircle: {
    backgroundColor: "#DDF4F1",
  },

  innerCircle: {
    width: 138,
    height: 138,
    borderRadius: 69,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  breathText: {
    fontSize: 35,
    fontWeight: "700",
    color: "#19B7B0",
  },

  timerText: {
    fontSize: 30,
    fontWeight: "700",
    color: "#19B7B0",
  },

  breathLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: "700",
    color: "#648384",
    marginTop: 2,
  },

  meditationTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#164F52",
    textAlign: "center",
    marginBottom: 9,
  },

  meditationDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: "#648384",
    textAlign: "center",
    maxWidth: 290,
    marginBottom: 22,
  },

  startButton: {
    backgroundColor: "#19B7B0",
    paddingVertical: 14,
    paddingHorizontal: 27,
    borderRadius: 25,
    minWidth: 190,
    alignItems: "center",
  },

  startButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: "700",
  },

  stopButton: {
    backgroundColor: "#FFF0ED",
    paddingVertical: 14,
    paddingHorizontal: 27,
    borderRadius: 25,
    minWidth: 150,
    alignItems: "center",
  },

  stopButtonText: {
    color: "#FF6B6B",
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: "700",
  },

  completedCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E8F8F6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  completedMark: {
    fontSize: 45,
    color: "#19B7B0",
    fontWeight: "500",
  },

  completedTitle: {
    fontSize: 25,
    fontWeight: "700",
    color: "#164F52",
    marginBottom: 8,
  },

  encouragement: {
    fontSize: 13,
    lineHeight: 20,
    color: "#648384",
    textAlign: "center",
    maxWidth: 280,
    marginBottom: 20,
  },

  completedInfo: {
    backgroundColor: "#F7FCFB",
    borderRadius: 18,
    paddingVertical: 13,
    paddingHorizontal: 30,
    alignItems: "center",
    marginBottom: 20,
  },

  completedInfoSmall: {
    fontSize: 8,
    letterSpacing: 1.3,
    fontWeight: "700",
    color: "#648384",
    marginBottom: 4,
  },

  completedInfoMain: {
    fontSize: 16,
    fontWeight: "700",
    color: "#19B7B0",
  },

  statsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statNumber: {
    fontSize: 26,
    fontWeight: "700",
    color: "#164F52",
    marginBottom: 3,
  },

  statLabel: {
    fontSize: 8,
    letterSpacing: 1.2,
    fontWeight: "700",
    color: "#648384",
  },

  statDivider: {
    width: 1,
    height: 38,
    backgroundColor: "#E4EEEE",
  },

  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 18,
    marginBottom: 28,
  },

  historyRow: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF4F3",
  },

  historyLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  historyDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#19B7B0",
    marginRight: 12,
  },

  historyTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#164F52",
    marginBottom: 3,
  },

  historyDate: {
    fontSize: 10,
    color: "#648384",
  },

  historyDuration: {
    fontSize: 11,
    fontWeight: "700",
    color: "#19B7B0",
  },

  reminderCard: {
    backgroundColor: "#FFF0ED",
    borderRadius: 22,
    padding: 19,
    marginBottom: 18,
  },

  reminderLabel: {
    fontSize: 9,
    letterSpacing: 1.5,
    color: "#FF6B6B",
    fontWeight: "700",
    marginBottom: 7,
  },

  reminderText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#164F52",
  },

  voiceCard: {
    backgroundColor: "#164F52",
    borderRadius: 22,
    padding: 20,
  },

  voiceLabel: {
    fontSize: 8,
    letterSpacing: 1.5,
    color: "#8DE3DD",
    fontWeight: "700",
    marginBottom: 7,
  },

  voiceCommand: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 7,
  },

  voiceDescription: {
    fontSize: 11,
    lineHeight: 17,
    color: "#C5DEDD",
  },
});