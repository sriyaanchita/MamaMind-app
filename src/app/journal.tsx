
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Dimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../services/firebase";

const { width, height } = Dimensions.get("window");

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

type JournalEntry = {
  id: string;
  text: string;
  mood: string;
};

const floatingDefinitions = [
  { type: "bubble", left: 0.04, top: 0.12, size: 42, color: C.yellow },
  { type: "dot", left: 0.89, top: 0.08, size: 16, color: C.coral },
  { type: "heart", left: 0.07, top: 0.34, size: 31, color: C.teal },
  { type: "ring", left: 0.91, top: 0.31, size: 32, color: C.yellow },
  { type: "star", left: 0.04, top: 0.57, size: 29, color: C.coral },
  { type: "bubble", left: 0.91, top: 0.55, size: 44, color: C.teal },
  { type: "dot", left: 0.15, top: 0.75, size: 13, color: C.yellow },
  { type: "ring", left: 0.83, top: 0.78, size: 24, color: C.coral },
];

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

  if (item.type === "bubble" || item.type === "dot") {
    return (
      <Animated.View
        style={[
          shapeStyle,
          {
            borderRadius: item.size / 2,
            backgroundColor: item.color,
            opacity: item.type === "bubble" ? 0.2 : 0.38,
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

  return (
    <Animated.View style={shapeStyle}>
      <Text
        style={{
          fontSize: item.size,
          color: item.color,
          opacity: 0.28,
        }}
      >
        {item.type === "heart" ? "♡" : "✦"}
      </Text>
    </Animated.View>
  );
}

export default function Journal() {
  const [entry, setEntry] = useState("");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const floatingItems = useRef(
    floatingDefinitions.map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      scale: new Animated.Value(1),
      rotate: new Animated.Value(0),
    }))
  ).current;

  const saveButtonScale = useRef(new Animated.Value(1)).current;

  const promptScales = useRef(
    Array.from({ length: 4 }, () => new Animated.Value(1))
  ).current;

  const moodScales = useRef(
    Array.from({ length: 4 }, () => new Animated.Value(1))
  ).current;

  const savedMessageAnimation = useRef(new Animated.Value(0)).current;

  const prompts = [
    "Today, I am grateful for...",
    "Something that made me smile today...",
    "Right now, I need...",
    "One thing I am proud of...",
  ];

  const moods = [
    { label: "Calm", symbol: "☺", color: C.teal },
    { label: "Happy", symbol: "☀", color: C.yellow },
    { label: "Tired", symbol: "◔", color: C.coral },
    { label: "Heavy", symbol: "♡", color: C.deepTeal },
  ];

  /* ---------------- FLOATING ANIMATION ---------------- */

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const runningAnimations: Animated.CompositeAnimation[] = [];

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

        runningAnimations.push(animation);

        animation.start(({ finished }) => {
          if (finished && !cancelled) {
            move();
          }
        });
      };

      timers.push(setTimeout(move, index * 220));
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      runningAnimations.forEach((animation) => animation.stop());

      floatingItems.forEach((item) => {
        item.x.stopAnimation();
        item.y.stopAnimation();
        item.scale.stopAnimation();
        item.rotate.stopAnimation();
      });
    };
  }, [floatingItems]);

  /* ---------------- FIRESTORE LOAD + LIVE SYNC ---------------- */

  useEffect(() => {
    let unsubscribeEntries: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeEntries?.();
      unsubscribeEntries = undefined;

      // Clear previous account's entries before loading the new account.
      setEntries([]);
      setExpandedEntry(null);
      setLoading(true);

      if (!user) {
        setLoading(false);
        return;
      }

      const entriesRef = collection(
        db,
        "users",
        user.uid,
        "journalEntries"
      );

      const entriesQuery = query(
        entriesRef,
        orderBy("createdAt", "desc")
      );

      unsubscribeEntries = onSnapshot(
        entriesQuery,
        (snapshot) => {
          const loadedEntries: JournalEntry[] = snapshot.docs.map(
            (entryDoc) => {
              const data = entryDoc.data();

              return {
                id: entryDoc.id,
                text: typeof data.text === "string" ? data.text : "",
                mood: typeof data.mood === "string" ? data.mood : "A moment",
              };
            }
          );

          setEntries(loadedEntries);
          setLoading(false);
        },
        (error) => {
          console.error("JOURNAL LOAD ERROR:", error);
          setLoading(false);

          Alert.alert(
            "Unable to load journal",
            "Please check your internet connection and Firestore permissions."
          );
        }
      );
    });

    return () => {
      unsubscribeEntries?.();
      unsubscribeAuth();
    };
  }, []);

  /* ---------------- SAVE MESSAGE ANIMATION ---------------- */

  useEffect(() => {
    if (!savedMessage) return;

    savedMessageAnimation.setValue(0);

    Animated.spring(savedMessageAnimation, {
      toValue: 1,
      friction: 7,
      tension: 90,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => setSavedMessage(false), 2200);

    return () => clearTimeout(timer);
  }, [savedMessage, savedMessageAnimation]);

  /* ---------------- SAVE ENTRY ---------------- */

  const saveEntry = async () => {
    const text = entry.trim();

    if (!text || saving) return;

    const user = auth.currentUser;

    if (!user) {
      Alert.alert(
        "Sign in required",
        "Please sign in to save your journal entries."
      );
      return;
    }

    setSaving(true);

    try {
      await addDoc(
        collection(db, "users", user.uid, "journalEntries"),
        {
          text,
          mood: selectedMood || "A moment",
          createdAt: serverTimestamp(),
        }
      );

      // The Firestore listener updates the list automatically.
      setEntry("");
      setSelectedMood(null);
      setSelectedPrompt(null);
      setSavedMessage(true);
    } catch (error) {
      console.error("JOURNAL SAVE ERROR:", error);

      Alert.alert(
        "Couldn't save your moment",
        "Please check your connection and Firestore rules. Your text is still in the writing area."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- BUTTON PRESS ---------------- */

  const handleSavePressIn = () => {
    Animated.spring(saveButtonScale, {
      toValue: 0.96,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handleSavePressOut = () => {
    Animated.spring(saveButtonScale, {
      toValue: 1,
      friction: 6,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  /* ---------------- PROMPT PRESS ---------------- */

  const handlePromptPress = (prompt: string, index: number) => {
    Animated.sequence([
      Animated.spring(promptScales[index], {
        toValue: 0.96,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(promptScales[index], {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setSelectedPrompt(prompt);

    if (!entry.trim()) {
      setEntry(prompt + " ");
    }
  };

  /* ---------------- MOOD PRESS ---------------- */

  const handleMoodPress = (mood: string, index: number) => {
    Animated.sequence([
      Animated.spring(moodScales[index], {
        toValue: 0.92,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(moodScales[index], {
        toValue: 1,
        friction: 6,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setSelectedMood(mood);
  };

  /* ---------------- DELETE ENTRY ---------------- */

  const deleteEntry = (entryId: string) => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Sign in required", "Please sign in again.");
      return;
    }

    Alert.alert(
      "Delete this moment?",
      "This journal entry will be permanently deleted.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(
                doc(
                  db,
                  "users",
                  user.uid,
                  "journalEntries",
                  entryId
                )
              );

              if (expandedEntry === entryId) {
                setExpandedEntry(null);
              }
            } catch (error) {
              console.error("JOURNAL DELETE ERROR:", error);

              Alert.alert(
                "Couldn't delete entry",
                "Please check your connection and try again."
              );
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Floating decorative layer */}

      <View pointerEvents="none" style={styles.floatingLayer}>
        {floatingDefinitions.map((item, index) => (
          <FloatingShape
            key={index}
            item={item}
            animation={floatingItems[index]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.label}>YOUR THOUGHTS</Text>

        <Text style={styles.title}>
          A little space{"\n"}to write.
        </Text>

        <Text style={styles.subtitle}>
          There is no right way to journal. Write whatever
          is on your mind, even if it is just one sentence.
        </Text>

        {/* Mood selection */}

        <View style={styles.moodSection}>
          <Text style={styles.moodTitle}>How are you feeling?</Text>

          <View style={styles.moodRow}>
            {moods.map((mood, index) => {
              const selected = selectedMood === mood.label;

              return (
                <Animated.View
                  key={mood.label}
                  style={{ transform: [{ scale: moodScales[index] }] }}
                >
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[
                      styles.moodCard,
                      selected && styles.moodCardSelected,
                    ]}
                    onPress={() => handleMoodPress(mood.label, index)}
                  >
                    <View
                      style={[
                        styles.moodCircle,
                        { backgroundColor: mood.color },
                      ]}
                    >
                      <Text style={styles.moodSymbol}>
                        {mood.symbol}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.moodLabel,
                        selected && styles.moodLabelSelected,
                      ]}
                    >
                      {mood.label}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Writing area */}

        <View style={styles.editor}>
          <TextInput
            value={entry}
            onChangeText={setEntry}
            placeholder="Today, I..."
            placeholderTextColor="#82A1A1"
            multiline
            textAlignVertical="top"
            maxLength={1000}
            style={styles.input}
          />

          <View style={styles.editorFooter}>
            <Text style={styles.helper}>
              This moment is just for you.
            </Text>

            <Text style={styles.counter}>{entry.length}/1000</Text>
          </View>
        </View>

        {/* Writing prompts */}

        <View style={styles.promptSection}>
          <Text style={styles.promptHeading}>
            Need a little inspiration?
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promptScroll}
          >
            {prompts.map((prompt, index) => (
              <Animated.View
                key={prompt}
                style={{ transform: [{ scale: promptScales[index] }] }}
              >
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[
                    styles.promptChip,
                    selectedPrompt === prompt && styles.promptChipSelected,
                  ]}
                  onPress={() => handlePromptPress(prompt, index)}
                >
                  <Text
                    style={[
                      styles.promptText,
                      selectedPrompt === prompt && styles.promptTextSelected,
                    ]}
                  >
                    {prompt}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>
        </View>

        {/* Save button */}

        <Animated.View style={{ transform: [{ scale: saveButtonScale }] }}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!entry.trim() || saving) && styles.disabledButton,
            ]}
            onPress={saveEntry}
            disabled={!entry.trim() || saving}
            onPressIn={handleSavePressIn}
            onPressOut={handleSavePressOut}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <>
                <Text style={styles.saveText}>Save This Moment</Text>
                <Text style={styles.saveArrow}>→</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Saved confirmation */}

        {savedMessage && (
          <Animated.View
            style={[
              styles.savedMessage,
              {
                opacity: savedMessageAnimation,
                transform: [
                  {
                    translateY: savedMessageAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.savedMessageSymbol}>✓</Text>
            <Text style={styles.savedMessageText}>
              Your moment has been saved.
            </Text>
          </Animated.View>
        )}

        {/* Saved entries */}

        <View style={styles.savedSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Your Moments</Text>
              <Text style={styles.sectionSubtitle}>
                Little pieces of your journey.
              </Text>
            </View>

            <View style={styles.countBadge}>
              <Text style={styles.countText}>{entries.length}</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={C.deepTeal} />
              <Text style={styles.loadingText}>
                Loading your moments...
              </Text>
            </View>
          ) : entries.length > 0 ? (
            entries.map((item, index) => {
              const expanded = expandedEntry === item.id;

              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.9}
                  style={styles.entryCard}
                  onPress={() =>
                    setExpandedEntry(expanded ? null : item.id)
                  }
                >
                  <View style={styles.entryTopRow}>
                    <Text style={styles.entryLabel}>
                      MOMENT {entries.length - index}
                    </Text>

                    <View style={styles.entryActions}>
                      <View style={styles.moodTag}>
                        <Text style={styles.moodTagText}>
                          {item.mood}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => deleteEntry(item.id)}
                        style={styles.deleteButton}
                        accessibilityLabel="Delete journal entry"
                      >
                        <Text style={styles.deleteText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text
                    style={styles.entryText}
                    numberOfLines={expanded ? undefined : 4}
                  >
                    {item.text}
                  </Text>

                  <Text style={styles.expandText}>
                    {expanded ? "Tap to collapse" : "Tap to read more"}
                  </Text>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyHeart}>
                <Text style={styles.emptySymbol}>♡</Text>
              </View>

              <Text style={styles.emptyTitle}>
                Your moments will live here.
              </Text>

              <Text style={styles.emptyText}>
                Start with something small.{"\n"}
                How was your day? What made you smile?
              </Text>

              <View style={styles.emptyBadge}>
                <Text style={styles.emptyBadgeText}>
                  One thought is enough.
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.cream,
  },

  floatingLayer: {
    top:0,bottom:0,right:0,left:0,
    zIndex: 0,
  },

  content: {
    padding: 22,
    paddingBottom: 70,
    zIndex: 1,
  },

  backButton: {
    marginTop: 45,
    marginBottom: 28,
  },

  backText: {
    fontSize: 15,
    color: C.muted,
    fontWeight: "600",
  },

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

  moodSection: {
    marginTop: 24,
  },

  moodTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.dark,
    marginBottom: 12,
  },

  moodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  moodCard: {
    width: (width - 54) / 4,
    minHeight: 88,
    borderRadius: 20,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOpacity: 0.035,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  moodCardSelected: {
    backgroundColor: C.paleTeal,
    borderColor: C.teal,
  },

  moodCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },

  moodSymbol: {
    fontSize: 18,
    color: C.dark,
    fontWeight: "700",
  },

  moodLabel: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "600",
  },

  moodLabelSelected: {
    color: C.deepTeal,
  },

  editor: {
    backgroundColor: C.white,
    borderRadius: 28,
    padding: 20,
    marginTop: 24,
    minHeight: 250,
    borderWidth: 1,
    borderColor: C.paleTeal,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  input: {
    minHeight: 190,
    fontSize: 17,
    lineHeight: 27,
    color: C.dark,
  },

  editorFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
  },

  helper: {
    fontSize: 12,
    color: "#82A1A1",
  },

  counter: {
    fontSize: 11,
    color: C.muted,
    fontWeight: "600",
  },

  promptSection: {
    marginTop: 22,
  },

  promptHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: C.dark,
    marginBottom: 10,
  },

  promptScroll: {
    paddingRight: 10,
  },

  promptChip: {
    backgroundColor: C.paleTeal,
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 11,
    marginRight: 9,
    borderWidth: 1,
    borderColor: "#D0EFEC",
    maxWidth: width * 0.66,
  },

  promptChipSelected: {
    backgroundColor: C.teal,
    borderColor: C.teal,
  },

  promptText: {
    fontSize: 12,
    lineHeight: 17,
    color: C.deepTeal,
    fontWeight: "600",
  },

  promptTextSelected: {
    color: C.white,
  },

  saveButton: {
    backgroundColor: C.deepTeal,
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 18,
    minHeight: 54,
    shadowColor: C.deepTeal,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },

  disabledButton: {
    opacity: 0.55,
  },

  saveText: {
    color: C.white,
    fontSize: 15,
    fontWeight: "700",
  },

  saveArrow: {
    color: C.yellow,
    fontSize: 20,
    marginLeft: 8,
    fontWeight: "700",
  },

  savedMessage: {
    marginTop: 12,
    backgroundColor: C.paleTeal,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  savedMessageSymbol: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.teal,
    color: C.white,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "700",
    marginRight: 8,
  },

  savedMessageText: {
    fontSize: 13,
    color: C.deepTeal,
    fontWeight: "600",
  },

  savedSection: {
    marginTop: 35,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: C.dark,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: C.muted,
    marginTop: 3,
  },

  countBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.yellow,
    alignItems: "center",
    justifyContent: "center",
  },

  countText: {
    fontSize: 13,
    fontWeight: "800",
    color: C.dark,
  },

  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    backgroundColor: C.white,
    borderRadius: 22,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: C.muted,
  },

  entryCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 20,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: C.paleTeal,
    shadowColor: "#000",
    shadowOpacity: 0.035,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  entryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  entryLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: C.deepTeal,
    fontWeight: "700",
  },

  entryActions: {
    flexDirection: "row",
    alignItems: "center",
  },

  moodTag: {
    backgroundColor: C.cream,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginRight: 7,
  },

  moodTagText: {
    fontSize: 9,
    color: C.deepTeal,
    fontWeight: "700",
  },

  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFE5E1",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteText: {
    fontSize: 20,
    lineHeight: 21,
    color: C.coral,
    fontWeight: "500",
  },

  entryText: {
    fontSize: 16,
    lineHeight: 24,
    color: C.dark,
    marginTop: 10,
  },

  expandText: {
    fontSize: 11,
    color: C.teal,
    fontWeight: "700",
    marginTop: 10,
  },

  emptyState: {
    marginTop: 10,
    backgroundColor: C.paleTeal,
    borderRadius: 25,
    padding: 25,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D2EFEC",
  },

  emptyHeart: {
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },

  emptySymbol: {
    fontSize: 45,
    color: C.coral,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: C.dark,
    textAlign: "center",
    marginTop: 12,
  },

  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: C.muted,
    textAlign: "center",
    marginTop: 8,
  },

  emptyBadge: {
    marginTop: 15,
    backgroundColor: C.yellow,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },

  emptyBadgeText: {
    fontSize: 11,
    color: C.dark,
    fontWeight: "700",
  },
});
