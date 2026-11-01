
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
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

/* -------------------------------------------------------
   MAMAMIND COLOUR PALETTE
------------------------------------------------------- */

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

type HappyMoment = {
  id: string;
  text: string;
};

/* -------------------------------------------------------
   HAPPY JAR
------------------------------------------------------- */

export default function HappyJar() {
  const [moment, setMoment] = useState("");
  const [moments, setMoments] = useState<HappyMoment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* -------------------------------------------------------
     JAR ANIMATIONS
  ------------------------------------------------------- */

  const jarFloat = useRef(new Animated.Value(0)).current;
  const jarScale = useRef(new Animated.Value(1)).current;
  const jarGlow = useRef(new Animated.Value(0)).current;

  const heartFloatOne = useRef(new Animated.Value(0)).current;
  const heartFloatTwo = useRef(new Animated.Value(0)).current;
  const heartFloatThree = useRef(new Animated.Value(0)).current;
  const heartFloatFour = useRef(new Animated.Value(0)).current;

  const newHeartScale = useRef(new Animated.Value(1)).current;

  /* -------------------------------------------------------
     JAR FLOATING ANIMATION
  ------------------------------------------------------- */

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(jarFloat, {
          toValue: -5,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(jarFloat, {
          toValue: 5,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(jarFloat, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [jarFloat]);

  /* -------------------------------------------------------
     HEART FLOATING ANIMATIONS
  ------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    const animations: Animated.CompositeAnimation[] = [];
    const timers: ReturnType<typeof setTimeout>[] = [];

    const createHeartAnimation = (
      value: Animated.Value,
      distance: number,
      duration: number,
      delay: number
    ) => {
      const timer = setTimeout(() => {
        if (cancelled) return;

        const animation = Animated.loop(
          Animated.sequence([
            Animated.timing(value, {
              toValue: distance,
              duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(value, {
              toValue: -distance,
              duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ])
        );

        animations.push(animation);
        animation.start();
      }, delay);

      timers.push(timer);
    };

    createHeartAnimation(heartFloatOne, 7, 2200, 0);
    createHeartAnimation(heartFloatTwo, -6, 2500, 400);
    createHeartAnimation(heartFloatThree, 8, 2300, 700);
    createHeartAnimation(heartFloatFour, -7, 2700, 1000);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
      animations.forEach((animation) => animation.stop());
    };
  }, [
    heartFloatOne,
    heartFloatTwo,
    heartFloatThree,
    heartFloatFour,
  ]);

  /* -------------------------------------------------------
     SOFT JAR GLOW
  ------------------------------------------------------- */

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(jarGlow, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(jarGlow, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [jarGlow]);

  /* -------------------------------------------------------
     FIRESTORE: LOAD AND SYNC HAPPY MOMENTS
  ------------------------------------------------------- */

  useEffect(() => {
    let unsubscribeMoments: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeMoments?.();
      unsubscribeMoments = undefined;

      // Clear data from any previously signed-in account.
      setMoments([]);
      setLoading(true);

      if (!user) {
        setLoading(false);
        return;
      }

      const momentsRef = collection(
        db,
        "users",
        user.uid,
        "happyJarMoments"
      );

      const momentsQuery = query(
        momentsRef,
        orderBy("createdAt", "desc")
      );

      unsubscribeMoments = onSnapshot(
        momentsQuery,
        (snapshot) => {
          const loadedMoments: HappyMoment[] = snapshot.docs.map(
            (momentDoc) => {
              const data = momentDoc.data();

              return {
                id: momentDoc.id,
                text:
                  typeof data.text === "string"
                    ? data.text
                    : "",
              };
            }
          );

          setMoments(loadedMoments);
          setLoading(false);
        },
        (error) => {
          console.error("HAPPY JAR LOAD ERROR:", error);
          setLoading(false);

          Alert.alert(
            "Couldn't load your Happy Jar",
            "Please check your internet connection and Firestore permissions."
          );
        }
      );
    });

    return () => {
      unsubscribeMoments?.();
      unsubscribeAuth();
    };
  }, []);

  /* -------------------------------------------------------
     ADD HAPPY MOMENT TO FIRESTORE
  ------------------------------------------------------- */

  const addMoment = async () => {
    const text = moment.trim();

    if (!text || saving) return;

    const user = auth.currentUser;

    if (!user) {
      Alert.alert(
        "Sign in required",
        "Please sign in to save your happy moments."
      );
      return;
    }

    setSaving(true);

    try {
      await addDoc(
        collection(
          db,
          "users",
          user.uid,
          "happyJarMoments"
        ),
        {
          text,
          createdAt: serverTimestamp(),
        }
      );

      // The Firestore listener updates the jar automatically.
      setMoment("");

      /* New heart appears */
      newHeartScale.setValue(0.15);

      Animated.sequence([
        Animated.spring(newHeartScale, {
          toValue: 1.3,
          tension: 75,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.spring(newHeartScale, {
          toValue: 1,
          tension: 45,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();

      /* Jar gently reacts */
      Animated.sequence([
        Animated.spring(jarScale, {
          toValue: 1.05,
          tension: 90,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.spring(jarScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error("HAPPY JAR SAVE ERROR:", error);

      Alert.alert(
        "Couldn't save your moment",
        "Please check your connection and Firestore rules. Your text is still in the input box."
      );
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------------------------------------
     DELETE HAPPY MOMENT FROM FIRESTORE
  ------------------------------------------------------- */

  const deleteMoment = (momentId: string) => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Sign in required", "Please sign in again.");
      return;
    }

    Alert.alert(
      "Remove this happy moment?",
      "This memory will be permanently removed from your jar.",
      [
        {
          text: "Keep it",
          style: "cancel",
        },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setDeletingId(momentId);

            try {
              await deleteDoc(
                doc(
                  db,
                  "users",
                  user.uid,
                  "happyJarMoments",
                  momentId
                )
              );
            } catch (error) {
              console.error("HAPPY JAR DELETE ERROR:", error);

              Alert.alert(
                "Couldn't remove the moment",
                "Please check your connection and try again."
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  /* -------------------------------------------------------
     TAP JAR
  ------------------------------------------------------- */

  const handleJarPress = () => {
    Animated.sequence([
      Animated.spring(jarScale, {
        toValue: 1.055,
        tension: 90,
        friction: 4,
        useNativeDriver: true,
      }),
      Animated.spring(jarScale, {
        toValue: 0.985,
        tension: 60,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.spring(jarScale, {
        toValue: 1,
        tension: 45,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  };

  /* -------------------------------------------------------
     GET HEART ANIMATION
  ------------------------------------------------------- */

  const getHeartAnimation = (index: number) => {
    const animations = [
      heartFloatOne,
      heartFloatTwo,
      heartFloatThree,
      heartFloatFour,
    ];

    return animations[index % animations.length];
  };

  /* -------------------------------------------------------
     GET HEART POSITION
  ------------------------------------------------------- */

  const getHeartPosition = (index: number) => {
    const positions = [
      { left: 28, top: 32 },
      { left: 73, top: 25 },
      { left: 112, top: 38 },
      { left: 45, top: 67 },
      { left: 94, top: 72 },
      { left: 22, top: 105 },
      { left: 68, top: 111 },
      { left: 120, top: 101 },
      { left: 45, top: 139 },
      { left: 94, top: 137 },
      { left: 22, top: 155 },
      { left: 120, top: 158 },
    ];

    return positions[index % positions.length];
  };

  /* -------------------------------------------------------
     GET HEART COLOUR
  ------------------------------------------------------- */

  const getHeartColor = (index: number) => {
    const colors = [
      C.coral,
      C.teal,
      C.yellow,
      C.coral,
      C.teal,
    ];

    return colors[index % colors.length];
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* BACK */}

      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backText}>← Back</Text>
      </Pressable>

      {/* HEADER */}

      <Text style={styles.label}>A LITTLE HAPPINESS</Text>

      <Text style={styles.title}>Your Happy Jar</Text>

      <Text style={styles.subtitle}>
        Save the tiny moments that made you smile.
        Come back to them whenever you need a
        little light.
      </Text>

      {/* JAR */}

      <View style={styles.jarArea}>
        <Animated.Text
          style={[
            styles.sparkleOne,
            { transform: [{ translateY: heartFloatOne }] },
          ]}
        >
          ✦
        </Animated.Text>

        <Animated.Text
          style={[
            styles.sparkleTwo,
            { transform: [{ translateY: heartFloatTwo }] },
          ]}
        >
          ·
        </Animated.Text>

        <Animated.Text
          style={[
            styles.sparkleThree,
            { transform: [{ translateY: heartFloatThree }] },
          ]}
        >
          ✦
        </Animated.Text>

        <Pressable onPress={handleJarPress}>
          <Animated.View
            style={[
              styles.jarWrapper,
              {
                transform: [
                  { translateY: jarFloat },
                  { scale: jarScale },
                ],
              },
            ]}
          >
            <View style={styles.jarLid} />

            <View style={styles.jar}>
              <Animated.View
                style={[
                  styles.jarGlass,
                  {
                    borderColor: jarGlow.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["#D7E9E5", "#FFDA57"],
                    }),
                  },
                ]}
              >
                {moments.map((item, index) => {
                  const position = getHeartPosition(index);
                  const animation = getHeartAnimation(index);

                  return (
                    <Animated.Text
                      key={item.id}
                      style={[
                        styles.jarHeart,
                        {
                          left: position.left,
                          top: position.top,
                          color: getHeartColor(index),
                          transform: [
                            { translateY: animation },
                            {
                              rotate:
                                index % 2 === 0 ? "-8deg" : "8deg",
                            },
                            {
                              scale:
                                index === 0 ? newHeartScale : 1,
                            },
                          ],
                        },
                      ]}
                    >
                      ♥
                    </Animated.Text>
                  );
                })}

                {!loading && moments.length === 0 && (
                  <View style={styles.emptyJarContent}>
                    <Text style={styles.emptyJarHeart}>♡</Text>
                    <Text style={styles.emptyJarText}>
                      Your first little{"\n"}
                      happiness goes here
                    </Text>
                  </View>
                )}

                {loading && (
                  <View style={styles.emptyJarContent}>
                    <ActivityIndicator color={C.deepTeal} />
                    <Text style={styles.emptyJarText}>
                      Opening your jar...
                    </Text>
                  </View>
                )}
              </Animated.View>
            </View>
          </Animated.View>
        </Pressable>

        <Text style={styles.tapHint}>Tap your jar ♡</Text>

        {moments.length > 0 && (
          <Text style={styles.memoryCount}>
            {moments.length}{" "}
            {moments.length === 1 ? "little memory" : "little memories"}
          </Text>
        )}
      </View>

      {/* ADD MOMENT */}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>KEEP A LITTLE MEMORY</Text>

        <Text style={styles.cardTitle}>
          What made you smile today?
        </Text>

        <TextInput
          value={moment}
          onChangeText={setMoment}
          placeholder="My happy moment was..."
          placeholderTextColor="#9AAFAE"
          multiline
          maxLength={500}
          textAlignVertical="top"
          style={styles.input}
        />

        <Text style={styles.characterCount}>
          {moment.length}/500
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            (!moment.trim() || saving) && styles.disabled,
            pressed && moment.trim() && styles.buttonPressed,
          ]}
          onPress={addMoment}
          disabled={!moment.trim() || saving}
        >
          {saving ? (
            <View style={styles.savingRow}>
              <ActivityIndicator color={C.white} size="small" />
              <Text style={styles.buttonText}>Saving your moment...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.buttonText}>Add to My Jar</Text>
              <View style={styles.buttonHeart}>
                <Text style={styles.buttonHeartText}>♡</Text>
              </View>
            </>
          )}
        </Pressable>
      </View>

      {/* SAVED MOMENTS */}

      <View style={styles.momentsSection}>
        <Text style={styles.sectionLabel}>YOUR LITTLE HAPPINESS</Text>

        <Text style={styles.sectionTitle}>
          Moments worth keeping.
        </Text>

        {loading ? (
          <View style={styles.statusCard}>
            <ActivityIndicator color={C.deepTeal} />
            <Text style={styles.statusText}>
              Finding your happy moments...
            </Text>
          </View>
        ) : moments.length > 0 ? (
          moments.map((item, index) => (
            <View key={item.id} style={styles.momentCard}>
              <View style={styles.momentIcon}>
                <Text
                  style={[
                    styles.momentHeart,
                    { color: getHeartColor(index) },
                  ]}
                >
                  ♥
                </Text>
              </View>

              <Text style={styles.momentText}>{item.text}</Text>

              <Pressable
                style={styles.deleteButton}
                onPress={() => deleteMoment(item.id)}
                disabled={deletingId === item.id}
                accessibilityLabel="Delete happy moment"
                hitSlop={8}
              >
                {deletingId === item.id ? (
                  <ActivityIndicator size="small" color={C.coral} />
                ) : (
                  <Text style={styles.deleteText}>×</Text>
                )}
              </Pressable>
            </View>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyHeart}>♡</Text>

            <Text style={styles.emptyText}>
              Your jar is waiting for its first little happy moment.
            </Text>

            <Text style={styles.emptyHint}>
              Even a tiny win is worth keeping.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/* -------------------------------------------------------
   STYLES
------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.cream,
  },

  content: {
    paddingHorizontal: 22,
    paddingBottom: 60,
  },

  backButton: {
    marginTop: 45,
    marginBottom: 28,
    alignSelf: "flex-start",
  },

  backText: {
    fontSize: 14,
    color: C.deepTeal,
    fontWeight: "800",
  },

  label: {
    fontSize: 10,
    letterSpacing: 2,
    color: C.deepTeal,
    fontWeight: "900",
  },

  title: {
    fontSize: 38,
    fontWeight: "900",
    color: C.dark,
    marginTop: 9,
    letterSpacing: -1,
  },

  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: C.muted,
    marginTop: 12,
    maxWidth: 360,
  },

  jarArea: {
    minHeight: 350,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },

  jarWrapper: {
    alignItems: "center",
  },

  jarLid: {
    width: 125,
    height: 22,
    borderRadius: 8,
    backgroundColor: C.deepTeal,
    marginBottom: -5,
    zIndex: 2,
    shadowColor: C.deepTeal,
    shadowOpacity: 0.15,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  jar: {
    width: 190,
    height: 215,
    borderRadius: 35,
    backgroundColor: "#DFF1EE",
    padding: 10,
    shadowColor: C.deepTeal,
    shadowOpacity: 0.13,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },

  jarGlass: {
    flex: 1,
    borderRadius: 27,
    backgroundColor: "#F7FCF7",
    borderWidth: 2,
    borderColor: "#D7E9E5",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  jarHeart: {
    position: "absolute",
    fontSize: 25,
    fontWeight: "900",
  },

  emptyJarContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },

  emptyJarHeart: {
    fontSize: 38,
    color: C.yellow,
    fontWeight: "300",
    marginBottom: 5,
  },

  emptyJarText: {
    textAlign: "center",
    color: C.muted,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "600",
    marginTop: 7,
  },

  sparkleOne: {
    position: "absolute",
    left: 48,
    top: 75,
    fontSize: 25,
    color: C.yellow,
    fontWeight: "900",
  },

  sparkleTwo: {
    position: "absolute",
    right: 53,
    top: 115,
    fontSize: 25,
    color: C.coral,
    fontWeight: "900",
  },

  sparkleThree: {
    position: "absolute",
    right: 42,
    bottom: 68,
    fontSize: 19,
    color: C.teal,
    fontWeight: "900",
  },

  tapHint: {
    marginTop: 12,
    fontSize: 11,
    color: C.muted,
    fontWeight: "700",
  },

  memoryCount: {
    fontSize: 11,
    color: C.deepTeal,
    fontWeight: "700",
    marginTop: 5,
  },

  card: {
    backgroundColor: C.white,
    borderRadius: 28,
    padding: 21,
    shadowColor: C.dark,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },

  cardLabel: {
    fontSize: 9,
    letterSpacing: 1.8,
    color: C.deepTeal,
    fontWeight: "900",
    marginBottom: 6,
  },

  cardTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: C.dark,
  },

  input: {
    minHeight: 90,
    marginTop: 15,
    fontSize: 15,
    color: C.dark,
    backgroundColor: C.cream,
    borderRadius: 17,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E6EFEB",
  },

  characterCount: {
    fontSize: 10,
    color: C.muted,
    textAlign: "right",
    marginTop: 5,
  },

  button: {
    minHeight: 52,
    backgroundColor: C.deepTeal,
    borderRadius: 28,
    paddingLeft: 20,
    paddingRight: 7,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    marginTop: 15,
    shadowColor: C.deepTeal,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },

  buttonText: {
    color: C.white,
    fontWeight: "800",
    fontSize: 14,
  },

  buttonHeart: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: C.yellow,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonHeartText: {
    color: C.deepTeal,
    fontSize: 20,
    fontWeight: "900",
  },

  savingRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },

  disabled: {
    opacity: 0.45,
  },

  buttonPressed: {
    transform: [{ scale: 0.97 }],
  },

  momentsSection: {
    marginTop: 32,
  },

  sectionLabel: {
    fontSize: 9,
    letterSpacing: 1.8,
    color: C.deepTeal,
    fontWeight: "900",
  },

  sectionTitle: {
    fontSize: 23,
    fontWeight: "900",
    color: C.dark,
    marginTop: 5,
    marginBottom: 15,
  },

  momentCard: {
    backgroundColor: C.paleTeal,
    borderRadius: 21,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
  },

  momentIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  momentHeart: {
    fontSize: 23,
    color: C.coral,
    fontWeight: "900",
  },

  momentText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: C.dark,
    fontWeight: "600",
  },

  deleteButton: {
    width: 30,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  deleteText: {
    fontSize: 25,
    color: C.coral,
    fontWeight: "500",
  },

  statusCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
  },

  statusText: {
    marginTop: 10,
    fontSize: 12,
    color: C.muted,
  },

  emptyContainer: {
    alignItems: "center",
    backgroundColor: C.paleTeal,
    borderRadius: 22,
    padding: 25,
  },

  emptyHeart: {
    fontSize: 31,
    color: C.yellow,
    marginBottom: 7,
  },

  emptyText: {
    textAlign: "center",
    color: C.muted,
    fontSize: 13,
    lineHeight: 20,
  },

  emptyHint: {
    textAlign: "center",
    color: C.deepTeal,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
  },
});
