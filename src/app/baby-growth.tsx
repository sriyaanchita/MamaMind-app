
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type DocumentReference,
} from "firebase/firestore";

import { db } from "@/services/firebase";
import { getMyFamily } from "@/utils/familyService";

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

const GROWTH_DOCUMENT = "growth";

const MILESTONES = [
  {
    age: "3 months",
    title: "Holds head steady",
    detail: "Neck and head control",
  },
  {
    age: "5 months",
    title: "Rolls over",
    detail: "Practises rolling",
  },
  {
    age: "6 months",
    title: "Sits with support",
    detail: "Tripod sitting",
  },
  {
    age: "8 months",
    title: "Sits without support",
    detail: "Sitting independently",
  },
  {
    age: "9 months",
    title: "Stands holding on",
    detail: "Uses support to stand",
  },
  {
    age: "12 months",
    title: "Creeps and may take steps",
    detail: "Movement and balance",
  },
  {
    age: "15 months",
    title: "Walks independently",
    detail: "May climb stairs with help",
  },
  {
    age: "18 months",
    title: "Runs and explores",
    detail: "Increasing mobility",
  },
  {
    age: "2 years",
    title: "Walks up and down steps",
    detail: "May begin jumping",
  },
  {
    age: "3 years",
    title: "Rides a tricycle",
    detail: "Improving coordination",
  },
  {
    age: "4 years",
    title: "Hops on one foot",
    detail: "Balance and coordination",
  },
];

const PRIMARY_TEETH = [
  { name: "Lower central incisors", age: "6–10 months", count: 2 },
  { name: "Upper central incisors", age: "8–12 months", count: 2 },
  { name: "Upper lateral incisors", age: "9–13 months", count: 2 },
  { name: "Lower lateral incisors", age: "10–16 months", count: 2 },
  { name: "First molars", age: "13–19 months", count: 4 },
  { name: "Canines", age: "16–23 months", count: 4 },
  { name: "Second molars", age: "23–33 months", count: 4 },
];

const PERMANENT_TEETH = [
  { name: "First molars", age: "6–7 years", count: 4 },
  { name: "Central incisors", age: "6–8 years", count: 4 },
  { name: "Lateral incisors", age: "7–9 years", count: 4 },
  { name: "First premolars", age: "10–12 years", count: 4 },
  { name: "Second premolars", age: "10–12 years", count: 4 },
  { name: "Canines", age: "9–12 years", count: 4 },
  { name: "Second molars", age: "11–13 years", count: 4 },
  { name: "Wisdom teeth", age: "17–21 years", count: 4 },
];

function Tooth({
  index,
  erupted,
  onPress,
}: {
  index: number;
  erupted: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(0.75)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: erupted ? 1.12 : 1,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [erupted, scale]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Tooth ${index + 1}, ${
        erupted ? "marked visible" : "not marked visible"
      }`}
      onPress={onPress}
      style={styles.toothPress}
    >
      <Animated.View
        style={[
          styles.tooth,
          erupted && styles.toothErupted,
          { transform: [{ scale }] },
        ]}
      >
        <View style={styles.toothRootLeft} />
        <View style={styles.toothRootRight} />
        <View style={styles.toothShine} />
      </Animated.View>
    </Pressable>
  );
}

function TeethDiagram({
  type,
  count,
  erupted,
  onToggle,
}: {
  type: string;
  count: number;
  erupted: boolean[];
  onToggle: (index: number) => void;
}) {
  const upperCount = count / 2;

  return (
    <View style={styles.jawCard}>
      <Text style={styles.jawTitle}>{type}</Text>

      <Text style={styles.jawCaption}>
        Tap a tooth to mark whether it has emerged
      </Text>

      <View style={styles.jaw}>
        <View style={styles.teethRow}>
          {Array.from({ length: upperCount }, (_, i) => (
            <Tooth
              key={`upper-${i}`}
              index={i}
              erupted={erupted[i] ?? false}
              onPress={() => onToggle(i)}
            />
          ))}
        </View>

        <View style={styles.jawDivider} />

        <View style={styles.teethRow}>
          {Array.from({ length: upperCount }, (_, i) => {
            const index = upperCount + i;

            return (
              <Tooth
                key={`lower-${i}`}
                index={index}
                erupted={erupted[index] ?? false}
                onPress={() => onToggle(index)}
              />
            );
          })}
        </View>
      </View>

      <Text style={styles.toothCount}>
        {erupted.filter(Boolean).length} of {count} teeth marked
      </Text>
    </View>
  );
}

export default function BabyGrowthScreen() {
  const router = useRouter();

  const [tab, setTab] = useState<"milestones" | "teeth">("milestones");
  const [completed, setCompleted] = useState<string[]>([]);

  const [toothType, setToothType] = useState<"primary" | "permanent">(
    "primary"
  );

  const [primaryErupted, setPrimaryErupted] = useState<boolean[]>(
    Array(20).fill(false)
  );

  const [permanentErupted, setPermanentErupted] = useState<boolean[]>(
    Array(32).fill(false)
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const growthRef = useRef<DocumentReference | null>(null);
  const activeRef = useRef(true);
  const pendingWrites = useRef(0);

  const pop = useRef(new Animated.Value(0.92)).current;

  // Connect to the family's shared growth document.
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    activeRef.current = true;

    const connectFamilyGrowth = async () => {
      try {
        const family = await getMyFamily();

        if (!family?.familyId) {
          throw new Error(
            "Your account isn't connected to a family yet. Connect Mama and Dad first."
          );
        }

        const ref = doc(
          db,
          "families",
          family.familyId,
          "babyDashboard",
          GROWTH_DOCUMENT
        );

        // Initialise the document only if it does not exist.
        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(ref);

          if (!snapshot.exists()) {
            transaction.set(ref, {
              completed: [],
              primaryErupted: Array(20).fill(false),
              permanentErupted: Array(32).fill(false),
              updatedAt: serverTimestamp(),
            });
          }
        });

        if (!active) return;

        growthRef.current = ref;

        // Listen for updates made by either parent.
        unsubscribe = onSnapshot(
          ref,
          (snapshot) => {
            if (!active || !snapshot.exists()) return;

            const data = snapshot.data();

            const nextCompleted: string[] = Array.isArray(data.completed)
              ? data.completed.filter(
                  (item: unknown): item is string =>
                    typeof item === "string"
                )
              : [];

            const nextPrimary: boolean[] = Array.from(
              { length: 20 },
              (_, index) => data.primaryErupted?.[index] === true
            );

            const nextPermanent: boolean[] = Array.from(
              { length: 32 },
              (_, index) => data.permanentErupted?.[index] === true
            );

            setCompleted(nextCompleted);
            setPrimaryErupted(nextPrimary);
            setPermanentErupted(nextPermanent);
            setLoading(false);
          },
          (error) => {
            console.error("Baby growth listener failed:", error);

            if (active) {
              setLoading(false);

              Alert.alert(
                "Couldn't sync growth",
                "Please check your internet connection and Firestore permissions."
              );
            }
          }
        );
      } catch (error) {
        console.error("Could not connect baby growth:", error);

        if (active) {
          setLoading(false);

          Alert.alert(
            "Baby Growth",
            error instanceof Error
              ? error.message
              : "Couldn't load family growth data."
          );
        }
      }
    };

    connectFamilyGrowth();

    return () => {
      active = false;
      activeRef.current = false;
      unsubscribe?.();
      growthRef.current = null;
    };
  }, []);

  // Preserve the existing screen transition animation.
  useEffect(() => {
    Animated.spring(pop, {
      toValue: 1,
      friction: 6,
      tension: 70,
      useNativeDriver: true,
    }).start();
  }, [tab, pop]);

  // Save milestone changes using a transaction so the latest
  // document values are used when two parents update concurrently.
  const toggleMilestone = async (title: string) => {
    const ref = growthRef.current;

    if (!ref) {
      Alert.alert("Please wait", "Baby Growth is still loading.");
      return;
    }

    pendingWrites.current += 1;
    setSaving(true);

    try {
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(ref);
        const data = snapshot.data();

        const current: string[] = Array.isArray(data?.completed)
          ? data.completed
          : [];

        const next = current.includes(title)
          ? current.filter((item) => item !== title)
          : [...current, title];

        transaction.set(
          ref,
          {
            completed: next,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });
    } catch (error) {
      console.error("Could not update milestone:", error);

      Alert.alert(
        "Couldn't save milestone",
        "Please check your connection and try again."
      );
    } finally {
      pendingWrites.current -= 1;

      if (activeRef.current && pendingWrites.current === 0) {
        setSaving(false);
      }
    }
  };

  // Save a tooth toggle to the appropriate family-shared array.
  const toggleTooth = async (index: number) => {
    const ref = growthRef.current;

    if (!ref) {
      Alert.alert("Please wait", "Baby Growth is still loading.");
      return;
    }

    const field =
      toothType === "primary" ? "primaryErupted" : "permanentErupted";

    const length = toothType === "primary" ? 20 : 32;

    pendingWrites.current += 1;
    setSaving(true);

    try {
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(ref);
        const data = snapshot.data();

        const saved = data?.[field];

        const current: boolean[] = Array.from(
          { length },
          (_, i) => saved?.[i] === true
        );

        current[index] = !current[index];

        transaction.set(
          ref,
          {
            [field]: current,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });
    } catch (error) {
      console.error("Could not update tooth:", error);

      Alert.alert(
        "Couldn't save tooth progress",
        "Please check your connection and try again."
      );
    } finally {
      pendingWrites.current -= 1;

      if (activeRef.current && pendingWrites.current === 0) {
        setSaving(false);
      }
    }
  };

  const toothCount =
    toothType === "primary" ? primaryErupted : permanentErupted;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <Text style={styles.heading}>Loading Baby Growth...</Text>
          <Text style={styles.subtitle}>
            Syncing your little one's progress.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={styles.eyebrow}>BABY'S LITTLE JOURNEY</Text>
            <Text style={styles.heading}>Growing Up</Text>
            <Text style={styles.subtitle}>
              Every little step is worth celebrating.
            </Text>
          </View>

          <Text style={styles.headerStar}>✦</Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroEmoji}>🌱</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>
              Growing at their own pace
            </Text>
            <Text style={styles.heroText}>
              Keep track of little milestones and those first tiny teeth.
            </Text>
          </View>
        </View>

        {saving && (
          <Text style={styles.syncHint}>Saving your little one's progress…</Text>
        )}

        <View style={styles.tabs}>
          <Pressable
            onPress={() => setTab("milestones")}
            style={[
              styles.tab,
              tab === "milestones" && styles.activeTab,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                tab === "milestones" && styles.activeTabText,
              ]}
            >
              Milestones
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setTab("teeth")}
            style={[styles.tab, tab === "teeth" && styles.activeTab]}
          >
            <Text
              style={[
                styles.tabText,
                tab === "teeth" && styles.activeTabText,
              ]}
            >
              Teeth Growth
            </Text>
          </Pressable>
        </View>

        {tab === "milestones" ? (
          <Animated.View style={{ transform: [{ scale: pop }] }}>
            <View style={styles.progressCard}>
              <View style={styles.progressTop}>
                <Text style={styles.sectionTitle}>
                  Little achievements
                </Text>

                <Text style={styles.progressNumber}>
                  {completed.length}/{MILESTONES.length}
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${
                        (completed.length / MILESTONES.length) * 100
                      }%`,
                    },
                  ]}
                />
              </View>

              <Text style={styles.progressHint}>
                Celebrate what your baby can do today.
              </Text>
            </View>

            {MILESTONES.map((item, index) => {
              const isDone = completed.includes(item.title);

              return (
                <View key={item.title} style={styles.milestoneRow}>
                  <View style={styles.timeline}>
                    <View
                      style={[
                        styles.timelineDot,
                        isDone && styles.timelineDotDone,
                      ]}
                    >
                      <Text style={styles.timelineDotText}>
                        {isDone ? "✓" : `${index + 1}`}
                      </Text>
                    </View>

                    {index !== MILESTONES.length - 1 && (
                      <View style={styles.timelineLine} />
                    )}
                  </View>

                  <Pressable
                    onPress={() => toggleMilestone(item.title)}
                    style={[
                      styles.milestoneCard,
                      isDone && styles.milestoneDone,
                    ]}
                  >
                    <View style={styles.milestoneHeading}>
                      <Text style={styles.agePill}>{item.age}</Text>

                      <Text style={styles.checkMark}>
                        {isDone ? "✓" : "○"}
                      </Text>
                    </View>

                    <Text style={styles.milestoneTitle}>
                      {item.title}
                    </Text>

                    <Text style={styles.milestoneDetail}>
                      {item.detail}
                    </Text>

                    <Text style={styles.tapHint}>
                      {isDone
                        ? "Marked as achieved · Tap to undo"
                        : "Tap when observed"}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </Animated.View>
        ) : (
          <Animated.View style={{ transform: [{ scale: pop }] }}>
            <View style={styles.teethIntro}>
              <Text style={styles.teethIntroTitle}>
                A tiny smile in progress
              </Text>

              <Text style={styles.teethIntroText}>
                Explore the tooth chart and tap each tooth to track its arrival.
              </Text>
            </View>

            <View style={styles.tabs}>
              <Pressable
                onPress={() => setToothType("primary")}
                style={[
                  styles.tab,
                  toothType === "primary" && styles.activeTab,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    toothType === "primary" && styles.activeTabText,
                  ]}
                >
                  Baby teeth · 20
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setToothType("permanent")}
                style={[
                  styles.tab,
                  toothType === "permanent" && styles.activeTab,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    toothType === "permanent" && styles.activeTabText,
                  ]}
                >
                  Adult teeth · 32
                </Text>
              </Pressable>
            </View>

            <TeethDiagram
              type={
                toothType === "primary"
                  ? "PRIMARY TEETH"
                  : "PERMANENT TEETH"
              }
              count={toothType === "primary" ? 20 : 32}
              erupted={toothCount}
              onToggle={toggleTooth}
            />

            <Text style={styles.sectionTitle}>
              Typical eruption timeline
            </Text>

            {(toothType === "primary"
              ? PRIMARY_TEETH
              : PERMANENT_TEETH
            ).map((item) => (
              <View key={item.name} style={styles.toothTimelineRow}>
                <View style={styles.toothTimelineIcon}>
                  <Text style={styles.toothTimelineEmoji}>✦</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.toothTimelineName}>
                    {item.name}
                  </Text>

                  <Text style={styles.toothTimelineAge}>
                    Usually around {item.age}
                  </Text>
                </View>

                <Text style={styles.toothGroupCount}>
                  ×{item.count}
                </Text>
              </View>
            ))}

            <View style={styles.noteCard}>
              <Text style={styles.noteTitle}>A gentle reminder</Text>

              <Text style={styles.noteText}>
                These ages are approximate. Teeth may emerge earlier or later.
                If you have concerns about your baby's teeth, ask a dentist or
                paediatrician.
              </Text>
            </View>
          </Animated.View>
        )}

        <Text style={styles.footer}>
          Every baby grows differently. This tracker is for general guidance,
          not a developmental or dental assessment.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },

  container: {
    padding: 20,
    paddingBottom: 38,
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  backText: {
    color: C.dark,
    fontSize: 32,
    lineHeight: 35,
  },

  eyebrow: {
    color: C.deepTeal,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "800",
  },

  heading: {
    color: C.dark,
    fontSize: 29,
    fontWeight: "800",
    marginTop: 3,
  },

  subtitle: {
    color: C.muted,
    fontSize: 12,
    marginTop: 4,
  },

  headerStar: {
    color: C.coral,
    fontSize: 26,
    marginLeft: 8,
  },

  hero: {
    backgroundColor: C.paleTeal,
    borderRadius: 23,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  heroIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  heroEmoji: {
    fontSize: 29,
  },

  heroTitle: {
    color: C.dark,
    fontSize: 16,
    fontWeight: "800",
  },

  heroText: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },

  syncHint: {
    color: C.deepTeal,
    fontSize: 11,
    textAlign: "center",
    marginBottom: 10,
  },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#F1EBDD",
    borderRadius: 16,
    padding: 4,
    marginBottom: 18,
  },

  tab: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  activeTab: {
    backgroundColor: C.teal,
  },

  tabText: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "700",
  },

  activeTabText: {
    color: C.white,
  },

  progressCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 17,
    marginBottom: 20,
  },

  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    color: C.dark,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 12,
  },

  progressNumber: {
    color: C.deepTeal,
    fontWeight: "800",
  },

  progressTrack: {
    height: 8,
    backgroundColor: C.paleTeal,
    borderRadius: 8,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: C.teal,
    borderRadius: 8,
  },

  progressHint: {
    color: C.muted,
    fontSize: 11,
    marginTop: 10,
  },

  milestoneRow: {
    flexDirection: "row",
    minHeight: 120,
  },

  timeline: {
    width: 31,
    alignItems: "center",
  },

  timelineDot: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: C.yellow,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },

  timelineDotDone: {
    backgroundColor: C.teal,
  },

  timelineDotText: {
    color: C.dark,
    fontSize: 11,
    fontWeight: "800",
  },

  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#D6EAE5",
    marginVertical: 3,
  },

  milestoneCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 15,
    marginLeft: 9,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "transparent",
  },

  milestoneDone: {
    backgroundColor: C.paleTeal,
    borderColor: C.teal,
  },

  milestoneHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  agePill: {
    backgroundColor: C.cream,
    color: C.deepTeal,
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },

  checkMark: {
    color: C.deepTeal,
    fontSize: 18,
    fontWeight: "800",
  },

  milestoneTitle: {
    color: C.dark,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 10,
  },

  milestoneDetail: {
    color: C.muted,
    fontSize: 12,
    marginTop: 4,
  },

  tapHint: {
    color: C.deepTeal,
    fontSize: 10,
    marginTop: 10,
  },

  teethIntro: {
    backgroundColor: C.white,
    padding: 18,
    borderRadius: 20,
    marginBottom: 16,
  },

  teethIntroTitle: {
    color: C.dark,
    fontSize: 19,
    fontWeight: "800",
  },

  teethIntroText: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
  },

  jawCard: {
    backgroundColor: C.white,
    padding: 17,
    borderRadius: 22,
    marginBottom: 24,
  },

  jawTitle: {
    color: C.deepTeal,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.1,
    textAlign: "center",
  },

  jawCaption: {
    color: C.muted,
    fontSize: 10,
    textAlign: "center",
    marginTop: 6,
  },

  jaw: {
    backgroundColor: C.paleTeal,
    borderRadius: 70,
    marginTop: 18,
    paddingVertical: 18,
    paddingHorizontal: 8,
    alignItems: "center",
  },

  teethRow: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
  },

  jawDivider: {
    height: 1,
    backgroundColor: "#B7DFD8",
    width: "80%",
    marginVertical: 14,
  },

  toothPress: {
    padding: 3,
  },

  tooth: {
    width: 23,
    height: 29,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#B8D8D5",
    borderRadius: 9,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-start",
  },

  toothErupted: {
    backgroundColor: C.yellow,
    borderColor: C.deepTeal,
  },

  toothRootLeft: {
    width: 5,
    height: 9,
    backgroundColor: "#F2F7F6",
    position: "absolute",
    bottom: -2,
    left: 4,
    borderRadius: 4,
  },

  toothRootRight: {
    width: 5,
    height: 9,
    backgroundColor: "#F2F7F6",
    position: "absolute",
    bottom: -2,
    right: 4,
    borderRadius: 4,
  },

  toothShine: {
    width: 5,
    height: 9,
    borderRadius: 4,
    backgroundColor: "#D9F5F1",
    position: "absolute",
    top: 4,
    left: 4,
  },

  toothCount: {
    textAlign: "center",
    color: C.deepTeal,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 15,
  },

  toothTimelineRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 13,
    marginBottom: 9,
  },

  toothTimelineIcon: {
    width: 37,
    height: 37,
    borderRadius: 13,
    backgroundColor: C.cream,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  toothTimelineEmoji: {
    color: C.deepTeal,
    fontSize: 21,
  },

  toothTimelineName: {
    color: C.dark,
    fontSize: 13,
    fontWeight: "800",
  },

  toothTimelineAge: {
    color: C.muted,
    fontSize: 11,
    marginTop: 4,
  },

  toothGroupCount: {
    color: C.deepTeal,
    fontSize: 12,
    fontWeight: "800",
  },

  noteCard: {
    backgroundColor: "#FFF0EC",
    borderRadius: 17,
    padding: 16,
    marginTop: 12,
  },

  noteTitle: {
    color: C.dark,
    fontSize: 14,
    fontWeight: "800",
  },

  noteText: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 6,
  },

  footer: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 25,
  },
});
