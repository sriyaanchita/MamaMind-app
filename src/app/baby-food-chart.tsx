import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { db } from "@/services/firebase";
import { getMyFamily } from "@/utils/familyService";
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

const C = {
  yellow: "#FFDA57",
  teal: "#19B7B0",
  deepTeal: "#0E7C86",
  white: "#FFFFFF",
  cream: "#FFF9E8",
  paleTeal: "#E8F8F6",
  dark: "#164F52",
  muted: "#648384",
  coral: "#FF6B6B",
  border: "#E5EFEC",
};

const STORAGE_KEY = "mamamind_baby_food_chart_v1";

type AgeGroup = "under6" | "6to8" | "9to11" | "12to23";
type MealCategory = "Breakfast" | "Lunch" | "Dinner" | "Snack";

type Meal = {
  id: string;
  time: string;
  category: MealCategory;
  title: string;
  description: string;
  note?: string;
};

type SavedData = {
  date: string;
  ageGroup: AgeGroup;
  completed: string[];
};

const AGE_OPTIONS: { label: string; value: AgeGroup }[] = [
  { label: "0–5 months", value: "under6" },
  { label: "6–8 months", value: "6to8" },
  { label: "9–11 months", value: "9to11" },
  { label: "12–23 months", value: "12to23" },
];

const FOOD_PLANS: Record<AgeGroup, Meal[]> = {
  under6: [
    {
      id: "milk",
      time: "Throughout the day",
      category: "Breakfast",
      title: "Breast milk or appropriate infant formula",
      description:
        "Milk feeds remain the baby's primary source of nutrition.",
      note: "Do not introduce routine solid foods before around 6 months unless a qualified clinician advises otherwise.",
    },
  ],

  "6to8": [
    {
      id: "breakfast",
      time: "Morning",
      category: "Breakfast",
      title: "Soft rice porridge",
      description:
        "Offer a thick, soft porridge enriched with an iron-rich food where appropriate.",
    },
    {
      id: "lunch",
      time: "Midday",
      category: "Lunch",
      title: "Mashed dal and vegetable khichdi",
      description:
        "Cook rice, lentils and vegetables until very soft. Mash to a suitable consistency.",
    },
    {
      id: "snack",
      time: "Afternoon",
      category: "Snack",
      title: "Mashed banana",
      description:
        "Offer ripe banana mashed thoroughly, or another suitable soft fruit.",
    },
    {
      id: "dinner",
      time: "Evening",
      category: "Dinner",
      title: "Soft mashed vegetables and lentils",
      description:
        "Offer a small, soft meal with vegetables and a protein-rich food.",
    },
  ],

  "9to11": [
    {
      id: "breakfast",
      time: "Morning",
      category: "Breakfast",
      title: "Soft vegetable idli",
      description:
        "Serve a very soft idli broken into small, manageable pieces with a suitable accompaniment.",
    },
    {
      id: "lunch",
      time: "Midday",
      category: "Lunch",
      title: "Dal khichdi with vegetables",
      description:
        "Cook until soft and adapt the texture to the baby's chewing and swallowing abilities.",
    },
    {
      id: "snack",
      time: "Afternoon",
      category: "Snack",
      title: "Soft fruit",
      description:
        "Try mashed fruit or safely prepared, very soft fruit pieces.",
    },
    {
      id: "dinner",
      time: "Evening",
      category: "Dinner",
      title: "Soft rice, dal and vegetables",
      description:
        "Offer a varied meal containing energy-rich and protein-rich foods.",
    },
  ],

  "12to23": [
    {
      id: "breakfast",
      time: "Morning",
      category: "Breakfast",
      title: "Idli, dosa or soft oats",
      description:
        "Serve in age-appropriate pieces with a nutritious accompaniment.",
    },
    {
      id: "lunch",
      time: "Midday",
      category: "Lunch",
      title: "Rice, dal and vegetables",
      description:
        "Offer adapted family foods, with a variety of textures and food groups.",
    },
    {
      id: "snack",
      time: "Afternoon",
      category: "Snack",
      title: "Fruit or plain full-fat yogurt",
      description:
        "Offer an age-appropriate portion of soft fruit or pasteurized plain yogurt.",
    },
    {
      id: "dinner",
      time: "Evening",
      category: "Dinner",
      title: "Soft family meal",
      description:
        "Include vegetables, grains and protein such as lentils, egg or other suitable foods.",
    },
  ],
};

function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getAgeLabel(age: AgeGroup) {
  return AGE_OPTIONS.find((item) => item.value === age)?.label ?? "6–8 months";
}


export default function BabyFoodChartScreen() {
  const router = useRouter();

  const [ageGroup, setAgeGroup] = useState<AgeGroup>("6to8");
  const [completed, setCompleted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyId, setFamilyId] = useState<string | null>(null);

  const today = localDateKey();
  const meals = useMemo(() => FOOD_PLANS[ageGroup], [ageGroup]);

  // Find the shared family, then listen to its Firestore document.
  useEffect(() => {
    let active = true;

    async function findFamily() {
      try {
        const familyResult = await getMyFamily();

        if (!active) return;

        const result: any = familyResult;

const id =
  typeof result === "string"
    ? result
    : result?.familyId ??
      result?.id ??
      result?.family?.familyId ??
      result?.family?.id ??
      result?.familyData?.id;

if (typeof id !== "string" || !id.trim()) {
  throw new Error("Could not find your family ID.");
}

setFamilyId(id);
      } catch (error) {
        console.error("Unable to find family:", error);

        if (active) {
          setLoading(false);
          Alert.alert(
            "Family unavailable",
            error instanceof Error
              ? error.message
              : "Unable to find your family. Please try again."
          );
        }
      }
    }

    findFamily();

    return () => {
      active = false;
    };
  }, []);

  // Subscribe to real-time updates shared by both parents.
  useEffect(() => {
    if (!familyId) return;

    let active = true;
    const chartRef = doc(
      db,
      "families",
      familyId,
      "babyFoodChart",
      "current"
    );

    const unsubscribe = onSnapshot(
      chartRef,
      async (snapshot) => {
        if (!active) return;

        try {
          if (!snapshot.exists()) {
            const initialData: SavedData = {
              date: localDateKey(),
              ageGroup: "6to8",
              completed: [],
            };

            setAgeGroup(initialData.ageGroup);
            setCompleted([]);
            setLoading(false);

            await setDoc(chartRef, {
              ...initialData,
              updatedAt: serverTimestamp(),
            });

            return;
          }

          const saved = snapshot.data();

          const validAge = AGE_OPTIONS.some(
            (option) => option.value === saved.ageGroup
          )
            ? (saved.ageGroup as AgeGroup)
            : "6to8";

          const currentDate = localDateKey();
          const isToday = saved.date === currentDate;

          const validCompleted = Array.isArray(saved.completed)
            ? saved.completed.filter(
                (id: unknown): id is string => typeof id === "string"
              )
            : [];

          setAgeGroup(validAge);
          setCompleted(isToday ? validCompleted : []);
          setLoading(false);

          // Reset yesterday's completion marks for the new day.
          if (!isToday) {
            await setDoc(
              chartRef,
              {
                date: currentDate,
                ageGroup: validAge,
                completed: [],
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          }
        } catch (error) {
          console.error("Unable to process food chart:", error);

          if (active) {
            setLoading(false);
            Alert.alert(
              "Food chart error",
              "The shared food chart could not be loaded. Please check your connection and Firestore permissions."
            );
          }
        }
      },
      (error) => {
        console.error("Food chart listener failed:", error);

        if (active) {
          setLoading(false);
          Alert.alert(
            "Unable to sync",
            "Could not access the shared food chart. Check your internet connection and Firestore security rules."
          );
        }
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [familyId]);

  async function saveData(
    nextAge: AgeGroup,
    nextCompleted: string[]
  ) {
    if (!familyId) {
      Alert.alert(
        "Family not ready",
        "Please wait while your shared family data loads."
      );
      return false;
    }

    const data: SavedData = {
      date: localDateKey(),
      ageGroup: nextAge,
      completed: nextCompleted,
    };

    try {
      await setDoc(
        doc(db, "families", familyId, "babyFoodChart", "current"),
        {
          ...data,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return true;
    } catch (error) {
      console.error("Unable to save food chart:", error);

      Alert.alert(
        "Unable to save",
        "Your feeding progress could not be saved. Please check your connection and Firestore permissions."
      );

      return false;
    }
  }

  async function changeAge(nextAge: AgeGroup) {
    if (nextAge === ageGroup) return;

    const previousAge = ageGroup;
    const previousCompleted = completed;

    setAgeGroup(nextAge);
    setCompleted([]);

    const saved = await saveData(nextAge, []);

    if (!saved) {
      setAgeGroup(previousAge);
      setCompleted(previousCompleted);
    }
  }

  async function toggleMeal(mealId: string) {
    const previousCompleted = completed;

    const nextCompleted = completed.includes(mealId)
      ? completed.filter((id) => id !== mealId)
      : [...completed, mealId];

    setCompleted(nextCompleted);

    const saved = await saveData(ageGroup, nextCompleted);

    if (!saved) {
      setCompleted(previousCompleted);
    }
  }

  const progress =
    meals.length === 0
      ? 0
      : completed.filter((id) => meals.some((meal) => meal.id === id))
          .length / meals.length;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={C.deepTeal} />
        <Text style={styles.loadingText}>
          Preparing your shared food chart...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹  Back to Baby Dashboard</Text>
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>BABY WELLNESS</Text>
          </View>

          <Text style={styles.heroTitle}>Little Bites, Big Growth</Text>

          <Text style={styles.heroDescription}>
            A gentle daily food guide to help you plan your little one's meals.
          </Text>

          <View style={styles.heroBottom}>
            <View style={styles.heroCircle}>
              <Text style={styles.heroSymbol}>♡</Text>
            </View>
            <View style={styles.heroBottomText}>
              <Text style={styles.heroBottomTitle}>
                Every little bite counts
              </Text>
              <Text style={styles.heroBottomSubtitle}>
                Follow your baby's hunger and fullness cues.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select baby's age</Text>
          <Text style={styles.sectionDescription}>
            Food textures and feeding needs change as babies grow.
          </Text>

          <View style={styles.ageGrid}>
            {AGE_OPTIONS.map((option) => {
              const selected = ageGroup === option.value;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => changeAge(option.value)}
                  style={[
                    styles.ageButton,
                    selected && styles.ageButtonSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.ageButtonText,
                      selected && styles.ageButtonTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {ageGroup === "under6" ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Milk feeds come first</Text>
            <Text style={styles.infoText}>
              Breast milk or appropriate infant formula is the main source of
              nutrition at this age. Complementary foods generally begin around
              6 months, when the baby is developmentally ready. Ask your
              pediatrician if you have concerns.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.progressCard}>
              <View style={styles.progressTop}>
                <View style={styles.progressTextContainer}>
                  <Text style={styles.progressTitle}>
                    Today's feeding plan
                  </Text>
                  <Text style={styles.progressSubtitle}>
                    {getAgeLabel(ageGroup)}
                  </Text>
                </View>

                <View style={styles.progressCount}>
                  <Text style={styles.progressCountText}>
                    {
                      completed.filter((id) =>
                        meals.some((meal) => meal.id === id)
                      ).length
                    }
                    /{meals.length}
                  </Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress * 100}%` },
                  ]}
                />
              </View>

              <Text style={styles.progressFooter}>
                {progress === 1
                  ? "You've checked off every suggested meal!"
                  : "Tick each meal when feeding is completed."}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today's food chart</Text>
              <Text style={styles.sectionDescription}>
                These are suggestions, not a strict feeding timetable.
              </Text>

              {meals.map((meal, index) => {
                const isDone = completed.includes(meal.id);

                return (
                  <View
                    key={`${ageGroup}-${meal.id}`}
                    style={[
                      styles.mealCard,
                      isDone && styles.mealCardDone,
                    ]}
                  >
                    <View style={styles.mealTop}>
                      <View
                        style={[
                          styles.mealNumber,
                          isDone && styles.mealNumberDone,
                        ]}
                      >
                        <Text
                          style={[
                            styles.mealNumberText,
                            isDone && styles.mealNumberTextDone,
                          ]}
                        >
                          {isDone
                            ? "✓"
                            : String(index + 1).padStart(2, "0")}
                        </Text>
                      </View>

                      <View style={styles.mealHeading}>
                        <Text style={styles.mealCategory}>
                          {meal.category.toUpperCase()}
                        </Text>
                        <Text style={styles.mealTime}>{meal.time}</Text>
                      </View>

                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: isDone }}
                        accessibilityLabel={`Mark ${meal.category} as ${
                          isDone ? "not completed" : "completed"
                        }`}
                        onPress={() => toggleMeal(meal.id)}
                        style={[
                          styles.checkButton,
                          isDone && styles.checkButtonDone,
                        ]}
                      >
                        <Text
                          style={[
                            styles.checkButtonText,
                            isDone && styles.checkButtonTextDone,
                          ]}
                        >
                          {isDone ? "Done" : "Mark done"}
                        </Text>
                      </Pressable>
                    </View>

                    <Text
                      style={[
                        styles.mealTitle,
                        isDone && styles.completedMealTitle,
                      ]}
                    >
                      {meal.title}
                    </Text>

                    <Text style={styles.mealDescription}>
                      {meal.description}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={styles.safetyCard}>
          <Text style={styles.safetyTitle}>A little safety reminder</Text>

          <Text style={styles.safetyItem}>
            • Always supervise your baby while eating, with the baby sitting
            upright.
          </Text>

          <Text style={styles.safetyItem}>
            • Avoid whole nuts, whole grapes, hard raw vegetables and other
            choking hazards. Prepare foods in a safe shape and texture.
          </Text>

          <Text style={styles.safetyItem}>
            • Avoid honey before 12 months. Do not add salt or sugar to
            complementary foods.
          </Text>

          <Text style={styles.safetyItem}>
            • Introduce common allergens in safe forms and age-appropriate
            amounts. Seek medical guidance for known allergies or high-risk
            concerns.
          </Text>

          <Text style={styles.safetyItem}>
            • Continue breast milk or appropriate infant formula as advised.
            Never force-feed; respond to hunger and fullness cues.
          </Text>

          <Text style={styles.disclaimer}>
            General educational guidance only. This chart is not a medical
            prescription and does not replace advice from your pediatrician.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>
            Care for Mom. Share the Care.
          </Text>
          <Text style={styles.footerText}>
            One small step at a time, with MamaMind.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.cream,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: C.cream,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: C.muted,
    fontSize: 14,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 10,
    paddingRight: 12,
    marginBottom: 12,
  },
  backText: {
    color: C.deepTeal,
    fontSize: 14,
    fontWeight: "700",
  },
  hero: {
    backgroundColor: C.paleTeal,
    borderRadius: 28,
    padding: 22,
    overflow: "hidden",
    marginBottom: 26,
  },
  heroBadge: {
    backgroundColor: C.white,
    borderRadius: 20,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 16,
  },
  heroBadgeText: {
    fontSize: 10,
    letterSpacing: 1.3,
    fontWeight: "800",
    color: C.deepTeal,
  },
  heroTitle: {
    fontSize: 30,
    lineHeight: 37,
    fontWeight: "800",
    color: C.dark,
    marginBottom: 10,
  },
  heroDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: C.muted,
  },
  heroBottom: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    gap: 12,
  },
  heroCircle: {
    height: 54,
    width: 54,
    borderRadius: 27,
    backgroundColor: C.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  heroSymbol: {
    fontSize: 30,
    color: C.dark,
  },
  heroBottomText: {
    flex: 1,
  },
  heroBottomTitle: {
    color: C.dark,
    fontWeight: "800",
    fontSize: 14,
    marginBottom: 4,
  },
  heroBottomSubtitle: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: C.dark,
    marginBottom: 7,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: C.muted,
    marginBottom: 16,
  },
  ageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  ageButton: {
    width: "48%",
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  ageButtonSelected: {
    backgroundColor: C.deepTeal,
    borderColor: C.deepTeal,
  },
  ageButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.dark,
  },
  ageButtonTextSelected: {
    color: C.white,
  },
  progressCard: {
    backgroundColor: C.white,
    padding: 19,
    borderRadius: 22,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: C.border,
  },
  progressTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 17,
  },
  progressTextContainer: {
    flex: 1,
  },
  progressTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.dark,
    marginBottom: 5,
  },
  progressSubtitle: {
    fontSize: 12,
    color: C.muted,
  },
  progressCount: {
    backgroundColor: C.paleTeal,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 14,
  },
  progressCountText: {
    color: C.deepTeal,
    fontWeight: "800",
    fontSize: 14,
  },
  progressTrack: {
    height: 9,
    backgroundColor: C.paleTeal,
    borderRadius: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: C.teal,
    borderRadius: 8,
  },
  progressFooter: {
    marginTop: 11,
    fontSize: 12,
    color: C.muted,
    lineHeight: 18,
  },
  mealCard: {
    backgroundColor: C.white,
    borderRadius: 21,
    padding: 17,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: C.border,
  },
  mealCardDone: {
    borderColor: C.teal,
    backgroundColor: "#F4FCFA",
  },
  mealTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },
  mealNumber: {
    width: 39,
    height: 39,
    borderRadius: 14,
    backgroundColor: C.cream,
    justifyContent: "center",
    alignItems: "center",
  },
  mealNumberDone: {
    backgroundColor: C.teal,
  },
  mealNumberText: {
    color: C.deepTeal,
    fontSize: 13,
    fontWeight: "800",
  },
  mealNumberTextDone: {
    color: C.white,
  },
  mealHeading: {
    flex: 1,
  },
  mealCategory: {
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "800",
    color: C.deepTeal,
    marginBottom: 4,
  },
  mealTime: {
    fontSize: 12,
    color: C.muted,
  },
  checkButton: {
    borderWidth: 1,
    borderColor: C.teal,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 9,
    minHeight: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  checkButtonDone: {
    backgroundColor: C.deepTeal,
    borderColor: C.deepTeal,
  },
  checkButtonText: {
    fontSize: 11,
    fontWeight: "800",
    color: C.deepTeal,
  },
  checkButtonTextDone: {
    color: C.white,
  },
  mealTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    color: C.dark,
    marginBottom: 7,
  },
  completedMealTitle: {
    color: C.deepTeal,
  },
  mealDescription: {
    fontSize: 13,
    lineHeight: 21,
    color: C.muted,
  },
  infoCard: {
    backgroundColor: C.white,
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 24,
  },
  infoTitle: {
    color: C.dark,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10,
  },
  infoText: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 23,
  },
  safetyCard: {
    backgroundColor: "#FFF1ED",
    borderRadius: 22,
    padding: 19,
    marginTop: 3,
  },
  safetyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.dark,
    marginBottom: 12,
  },
  safetyItem: {
    fontSize: 12,
    lineHeight: 20,
    color: C.dark,
    marginBottom: 9,
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 18,
    color: C.muted,
    marginTop: 7,
  },
  footer: {
    alignItems: "center",
    marginTop: 26,
  },
  footerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.deepTeal,
  },
  footerText: {
    fontSize: 11,
    color: C.muted,
    marginTop: 5,
  },
});
