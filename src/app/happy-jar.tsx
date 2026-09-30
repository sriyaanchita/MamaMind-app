import React, { useEffect, useRef, useState } from "react";
import {
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

/* -------------------------------------------------------
   HAPPY JAR
------------------------------------------------------- */

export default function HappyJar() {
  const [moment, setMoment] = useState("");
  const [moments, setMoments] = useState<string[]>([]);

  /* -------------------------------------------------------
     JAR ANIMATIONS
  ------------------------------------------------------- */

  const jarFloat = useRef(
    new Animated.Value(0)
  ).current;

  const jarScale = useRef(
    new Animated.Value(1)
  ).current;

  const jarGlow = useRef(
    new Animated.Value(0)
  ).current;

  const heartFloatOne = useRef(
    new Animated.Value(0)
  ).current;

  const heartFloatTwo = useRef(
    new Animated.Value(0)
  ).current;

  const heartFloatThree = useRef(
    new Animated.Value(0)
  ).current;

  const heartFloatFour = useRef(
    new Animated.Value(0)
  ).current;

  const newHeartScale = useRef(
    new Animated.Value(1)
  ).current;

  /* -------------------------------------------------------
     JAR FLOATING ANIMATION
  ------------------------------------------------------- */

  useEffect(() => {
    Animated.loop(
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
    ).start();
  }, []);

  /* -------------------------------------------------------
     HEART FLOATING ANIMATIONS
  ------------------------------------------------------- */

  useEffect(() => {
    const createHeartAnimation = (
      value: Animated.Value,
      distance: number,
      duration: number,
      delay: number
    ) => {
      setTimeout(() => {
        Animated.loop(
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
        ).start();
      }, delay);
    };

    createHeartAnimation(
      heartFloatOne,
      7,
      2200,
      0
    );

    createHeartAnimation(
      heartFloatTwo,
      -6,
      2500,
      400
    );

    createHeartAnimation(
      heartFloatThree,
      8,
      2300,
      700
    );

    createHeartAnimation(
      heartFloatFour,
      -7,
      2700,
      1000
    );
  }, []);

  /* -------------------------------------------------------
     SOFT JAR GLOW
  ------------------------------------------------------- */

  useEffect(() => {
    Animated.loop(
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
    ).start();
  }, []);

  /* -------------------------------------------------------
     ADD HAPPY MOMENT
  ------------------------------------------------------- */

  const addMoment = () => {
    if (!moment.trim()) return;

    setMoments((previous) => [
      moment.trim(),
      ...previous,
    ]);

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

  const getHeartAnimation = (
    index: number
  ) => {
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

  const getHeartPosition = (
    index: number
  ) => {
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

    return positions[
      index % positions.length
    ];
  };

  /* -------------------------------------------------------
     GET HEART COLOUR
  ------------------------------------------------------- */

  const getHeartColor = (
    index: number
  ) => {
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
      {/* --------------------------------------------------
          BACK
      -------------------------------------------------- */}

      <Pressable
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backText}>
          ← Back
        </Text>
      </Pressable>

      {/* --------------------------------------------------
          HEADER
      -------------------------------------------------- */}

      <Text style={styles.label}>
        A LITTLE HAPPINESS
      </Text>

      <Text style={styles.title}>
        Your Happy Jar
      </Text>

      <Text style={styles.subtitle}>
        Save the tiny moments that made you smile.
        Come back to them whenever you need a
        little light.
      </Text>

      {/* --------------------------------------------------
          JAR
      -------------------------------------------------- */}

      <View style={styles.jarArea}>

        {/* Decorative sparkle */}

        <Animated.Text
          style={[
            styles.sparkleOne,
            {
              transform: [
                {
                  translateY:
                    heartFloatOne,
                },
              ],
            },
          ]}
        >
          ✦
        </Animated.Text>

        <Animated.Text
          style={[
            styles.sparkleTwo,
            {
              transform: [
                {
                  translateY:
                    heartFloatTwo,
                },
              ],
            },
          ]}
        >
          ·
        </Animated.Text>

        <Animated.Text
          style={[
            styles.sparkleThree,
            {
              transform: [
                {
                  translateY:
                    heartFloatThree,
                },
              ],
            },
          ]}
        >
          ✦
        </Animated.Text>

        {/* Jar */}

        <Pressable
          onPress={handleJarPress}
        >
          <Animated.View
            style={[
              styles.jarWrapper,
              {
                transform: [
                  {
                    translateY: jarFloat,
                  },
                  {
                    scale: jarScale,
                  },
                ],
              },
            ]}
          >
            {/* Lid */}

            <View style={styles.jarLid} />

            {/* Jar body */}

            <View style={styles.jar}>
              <Animated.View
                style={[
                  styles.jarGlass,
                  {
                    borderColor:
                      jarGlow.interpolate({
                        inputRange: [0, 1],
                        outputRange: [
                          "#D7E9E5",
                          "#FFDA57",
                        ],
                      }),
                  },
                ]}
              >

                {/* ------------------------------------
                    ONE HEART = ONE MEMORY
                ------------------------------------ */}

                {moments.map(
                  (_, index) => {
                    const position =
                      getHeartPosition(index);

                    const animation =
                      getHeartAnimation(index);

                    return (
                      <Animated.Text
                        key={index}
                        style={[
                          styles.jarHeart,
                          {
                            left:
                              position.left,
                            top:
                              position.top,
                            color:
                              getHeartColor(
                                index
                              ),

                            transform: [
                              {
                                translateY:
                                  animation,
                              },
                              {
                                rotate:
                                  index % 2 ===
                                  0
                                    ? "-8deg"
                                    : "8deg",
                              },
                              {
                                scale:
                                  index === 0
                                    ? newHeartScale
                                    : 1,
                              },
                            ],
                          },
                        ]}
                      >
                        ♥
                      </Animated.Text>
                    );
                  }
                )}

                {/* Empty jar message */}

                {moments.length === 0 && (
                  <View
                    style={
                      styles.emptyJarContent
                    }
                  >
                    <Text
                      style={
                        styles.emptyJarHeart
                      }
                    >
                      ♡
                    </Text>

                    <Text
                      style={
                        styles.emptyJarText
                      }
                    >
                      Your first little{"\n"}
                      happiness goes here
                    </Text>
                  </View>
                )}
              </Animated.View>
            </View>
          </Animated.View>
        </Pressable>

        <Text style={styles.tapHint}>
          Tap your jar ♡
        </Text>
      </View>

      {/* --------------------------------------------------
          ADD MOMENT
      -------------------------------------------------- */}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>
          KEEP A LITTLE MEMORY
        </Text>

        <Text style={styles.cardTitle}>
          What made you smile today?
        </Text>

        <TextInput
          value={moment}
          onChangeText={setMoment}
          placeholder="My happy moment was..."
          placeholderTextColor="#9AAFAE"
          multiline
          style={styles.input}
        />

        <Pressable
          style={({ pressed }) => [
            styles.button,
            !moment.trim() &&
              styles.disabled,
            pressed &&
              moment.trim() &&
              styles.buttonPressed,
          ]}
          onPress={addMoment}
          disabled={!moment.trim()}
        >
          <Text style={styles.buttonText}>
            Add to My Jar
          </Text>

          <View style={styles.buttonHeart}>
            <Text
              style={
                styles.buttonHeartText
              }
            >
              ♡
            </Text>
          </View>
        </Pressable>
      </View>

      {/* --------------------------------------------------
          SAVED MOMENTS
      -------------------------------------------------- */}

      {moments.length > 0 && (
        <View
          style={styles.momentsSection}
        >
          <Text style={styles.sectionLabel}>
            YOUR LITTLE HAPPINESS
          </Text>

          <Text style={styles.sectionTitle}>
            Moments worth keeping.
          </Text>

          {moments.map(
            (item, index) => (
              <View
                key={index}
                style={styles.momentCard}
              >
                <View
                  style={
                    styles.momentIcon
                  }
                >
                  <Text
                    style={
                      styles.momentHeart
                    }
                  >
                    ♥
                  </Text>
                </View>

                <Text
                  style={
                    styles.momentText
                  }
                >
                  {item}
                </Text>
              </View>
            )
          )}
        </View>
      )}

      {/* --------------------------------------------------
          EMPTY STATE
      -------------------------------------------------- */}

      {moments.length === 0 && (
        <View
          style={styles.emptyContainer}
        >
          <Text style={styles.emptyHeart}>
            ♡
          </Text>

          <Text style={styles.emptyText}>
            Your jar is waiting for its first
            little happy moment.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

/* -------------------------------------------------------
   STYLES
------------------------------------------------------- */

const styles = StyleSheet.create({
  /* -------------------------------------------------------
     PAGE
  ------------------------------------------------------- */

  container: {
    flex: 1,
    backgroundColor: C.cream,
  },

  content: {
    paddingHorizontal: 22,
    paddingBottom: 60,
  },

  /* -------------------------------------------------------
     BACK
  ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     HEADER
  ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     JAR AREA
  ------------------------------------------------------- */

  jarArea: {
    height: 330,
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
    shadowOffset: {
      width: 0,
      height: 3,
    },

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
    shadowOffset: {
      width: 0,
      height: 10,
    },

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

  /* -------------------------------------------------------
     ACTUAL MEMORY HEARTS
  ------------------------------------------------------- */

  jarHeart: {
    position: "absolute",
    fontSize: 25,
    fontWeight: "900",
  },

  /* -------------------------------------------------------
     EMPTY JAR
  ------------------------------------------------------- */

  emptyJarContent: {
    alignItems: "center",
    justifyContent: "center",
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
  },

  /* -------------------------------------------------------
     SPARKLES
  ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     INPUT CARD
  ------------------------------------------------------- */

  card: {
    backgroundColor: C.white,
    borderRadius: 28,
    padding: 21,

    shadowColor: C.dark,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },

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
    textAlignVertical: "top",
    backgroundColor: C.cream,
    borderRadius: 17,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E6EFEB",
  },

  /* -------------------------------------------------------
     BUTTON
  ------------------------------------------------------- */

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
    shadowOffset: {
      width: 0,
      height: 5,
    },

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

  disabled: {
    opacity: 0.35,
  },

  buttonPressed: {
    transform: [{ scale: 0.97 }],
  },

  /* -------------------------------------------------------
     SAVED MOMENTS
  ------------------------------------------------------- */

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
    paddingRight: 17,
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

  /* -------------------------------------------------------
     EMPTY STATE
  ------------------------------------------------------- */

  emptyContainer: {
    alignItems: "center",
    marginTop: 27,
    paddingHorizontal: 25,
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
});