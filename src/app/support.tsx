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

/* =====================================================
   FLOATING ELEMENTS
   ===================================================== */

type FloatType =
  | "bubble"
  | "dot"
  | "ring"
  | "heart"
  | "star";

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

/* =====================================================
   FLOATING SHAPE
   ===================================================== */

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
              {
                color: definition.color,
                fontSize: definition.size,
              },
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
              {
                color: definition.color,
                fontSize: definition.size,
              },
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
              opacity: 0.78,
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

export default function Support() {
  const [requested, setRequested] = useState(false);
  const [selectedOption, setSelectedOption] =
    useState<number | null>(null);

  /* =====================================================
     FLOATING ANIMATION
     ===================================================== */

  const floatingItems = useRef<FloatItem[]>(
    floatingDefinitions.map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      scale: new Animated.Value(1),
      rotate: new Animated.Value(0),
    }))
  ).current;

  const floatingAnimations =
    useRef<Animated.CompositeAnimation[]>([]).current;

  /* =====================================================
     INTERACTION ANIMATIONS
     ===================================================== */

  const heartPulse = useRef(
    new Animated.Value(1)
  ).current;

  const supportButtonScale = useRef(
    new Animated.Value(1)
  ).current;

  const sentAnimation = useRef(
    new Animated.Value(0)
  ).current;

  const optionScales = useRef(
    Array.from(
      { length: 3 },
      () => new Animated.Value(1)
    )
  ).current;

  /* =====================================================
     FLOATING BACKGROUND
     ===================================================== */

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

      timers.forEach((timer) => {
        clearTimeout(timer);
      });

      floatingAnimations.forEach((animation) => {
        animation?.stop();
      });
    };
  }, []);

  /* =====================================================
     HEART PULSE
     ===================================================== */

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(heartPulse, {
          toValue: 1.06,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),

        Animated.timing(heartPulse, {
          toValue: 1,
          duration: 1600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, []);

  /* =====================================================
     SUPPORT BUTTON
     ===================================================== */

  const handleSupportPress = () => {
    setRequested(true);

    sentAnimation.setValue(0);

    Animated.spring(sentAnimation, {
      toValue: 1,
      tension: 55,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handleButtonPressIn = () => {
    Animated.spring(supportButtonScale, {
      toValue: 0.96,
      tension: 120,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  const handleButtonPressOut = () => {
    Animated.spring(supportButtonScale, {
      toValue: 1,
      tension: 120,
      friction: 7,
      useNativeDriver: true,
    }).start();
  };

  /* =====================================================
     SUPPORT OPTIONS
     ===================================================== */

  const handleOptionPress = (index: number) => {
    setSelectedOption(
      selectedOption === index ? null : index
    );

    Animated.sequence([
      Animated.spring(optionScales[index], {
        toValue: 0.97,
        tension: 150,
        friction: 7,
        useNativeDriver: true,
      }),

      Animated.spring(optionScales[index], {
        toValue: 1,
        tension: 120,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.screen}>

      {/* =====================================================
          FLOATING BACKGROUND
          ===================================================== */}

      <View
        pointerEvents="none"
        style={styles.floatingLayer}
      >
        {floatingDefinitions.map(
          (definition, index) => (
            <FloatingShape
              key={index}
              definition={definition}
              item={floatingItems[index]}
            />
          )
        )}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>
            ← Back
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>
          YOU DON'T HAVE TO DO IT ALONE
        </Text>

        <Text style={styles.title}>
          I'm Not Okay.
        </Text>

        <Text style={styles.subtitle}>
          You don't need to explain everything.
          Sometimes asking for a little help is enough.
        </Text>

        {/* Main support card */}

        <View style={styles.mainCard}>

          <Animated.View
            style={[
              styles.heartCircle,
              {
                transform: [
                  {
                    scale: heartPulse,
                  },
                ],
              },
            ]}
          >
            <Text style={styles.heart}>
              ♡
            </Text>
          </Animated.View>

          <Text style={styles.mainTitle}>
            Let someone know.
          </Text>

          <Text style={styles.mainText}>
            Send a gentle signal to your support person.
            They can check in, take over a task, or simply
            sit beside you.
          </Text>

          {!requested ? (
            <Animated.View
              style={{
                transform: [
                  {
                    scale: supportButtonScale,
                  },
                ],
              }}
            >
              <TouchableOpacity
                style={styles.supportButton}
                onPress={handleSupportPress}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                activeOpacity={0.85}
              >
                <Text style={styles.supportButtonText}>
                  I Need Some Support
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <Animated.View
              style={[
                styles.sentBox,
                {
                  opacity: sentAnimation,

                  transform: [
                    {
                      scale: sentAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.94, 1],
                      }),
                    },

                    {
                      translateY: sentAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [12, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.sentHeart}>
                ♡
              </Text>

              <Text style={styles.sentTitle}>
                Support request sent.
              </Text>

              <Text style={styles.sentText}>
                Someone who cares about you has been
                notified to check in.
              </Text>
            </Animated.View>
          )}
        </View>

        {/* Quick support options */}

        <Text style={styles.sectionTitle}>
          What would help right now?
        </Text>

        <Animated.View
          style={{
            transform: [
              { scale: optionScales[0] },
            ],
          }}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => handleOptionPress(0)}
            style={[
              styles.option,

              selectedOption === 0 &&
                styles.optionSelected,
            ]}
          >
            <View
              style={[
                styles.optionNumberCircle,
                selectedOption === 0 &&
                  styles.optionNumberCircleSelected,
              ]}
            >
              <Text
                style={[
                  styles.optionNumber,
                  selectedOption === 0 &&
                    styles.optionNumberSelected,
                ]}
              >
                01
              </Text>
            </View>

            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>
                I need some quiet
              </Text>

              <Text style={styles.optionText}>
                Create a little uninterrupted time for me.
              </Text>
            </View>

            {selectedOption === 0 && (
              <Text style={styles.selectedCheck}>
                ✓
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={{
            transform: [
              { scale: optionScales[1] },
            ],
          }}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => handleOptionPress(1)}
            style={[
              styles.option,

              selectedOption === 1 &&
                styles.optionSelected,
            ]}
          >
            <View
              style={[
                styles.optionNumberCircle,
                selectedOption === 1 &&
                  styles.optionNumberCircleSelected,
              ]}
            >
              <Text
                style={[
                  styles.optionNumber,
                  selectedOption === 1 &&
                    styles.optionNumberSelected,
                ]}
              >
                02
              </Text>
            </View>

            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>
                I need help with baby
              </Text>

              <Text style={styles.optionText}>
                Ask my partner to take the next baby-care turn.
              </Text>
            </View>

            {selectedOption === 1 && (
              <Text style={styles.selectedCheck}>
                ✓
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={{
            transform: [
              { scale: optionScales[2] },
            ],
          }}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => handleOptionPress(2)}
            style={[
              styles.option,

              selectedOption === 2 &&
                styles.optionSelected,
            ]}
          >
            <View
              style={[
                styles.optionNumberCircle,
                selectedOption === 2 &&
                  styles.optionNumberCircleSelected,
              ]}
            >
              <Text
                style={[
                  styles.optionNumber,
                  selectedOption === 2 &&
                    styles.optionNumberSelected,
                ]}
              >
                03
              </Text>
            </View>

            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>
                I just need company
              </Text>

              <Text style={styles.optionText}>
                Ask someone I trust to spend some time with me.
              </Text>
            </View>

            {selectedOption === 2 && (
              <Text style={styles.selectedCheck}>
                ✓
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.note}>
          <Text style={styles.noteText}>
            MamaMind is here to support everyday wellbeing.
            If you feel unsafe or need urgent help, contact
            a trusted person or local emergency service.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({

  /* =====================================================
     SCREEN
     ===================================================== */

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

  /* =====================================================
     FLOATING
     ===================================================== */

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

  /* =====================================================
     BACK
     ===================================================== */

  backButton: {
    marginTop: 45,
    marginBottom: 28,
  },

  backText: {
    fontSize: 15,
    color: C.deepTeal,
    fontWeight: "600",
  },

  /* =====================================================
     HEADER
     ===================================================== */

  label: {
    fontSize: 10,
    letterSpacing: 1.8,
    color: C.deepTeal,
    fontWeight: "700",
  },

  title: {
    fontSize: 38,
    fontWeight: "700",
    color: C.dark,
    marginTop: 10,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: C.muted,
    marginTop: 12,
  },

  /* =====================================================
     MAIN SUPPORT CARD
     ===================================================== */

  mainCard: {
    backgroundColor: C.paleTeal,
    borderRadius: 28,
    padding: 25,
    marginTop: 25,
    alignItems: "center",
  },

  heartCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },

  heart: {
    fontSize: 42,
    color: C.coral,
  },

  mainTitle: {
    fontSize: 25,
    fontWeight: "700",
    color: C.dark,
    marginTop: 15,
  },

  mainText: {
    fontSize: 14,
    lineHeight: 21,
    color: C.muted,
    textAlign: "center",
    marginTop: 10,
  },

  supportButton: {
    backgroundColor: C.deepTeal,
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 25,
    marginTop: 20,
  },

  supportButtonText: {
    color: C.white,
    fontSize: 14,
    fontWeight: "600",
  },

  sentBox: {
    width: "100%",
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 18,
    alignItems: "center",
    marginTop: 20,
  },

  sentHeart: {
    fontSize: 30,
    color: C.teal,
  },

  sentTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: C.dark,
    marginTop: 5,
  },

  sentText: {
    fontSize: 13,
    lineHeight: 19,
    color: C.muted,
    textAlign: "center",
    marginTop: 5,
  },

  /* =====================================================
     OPTIONS
     ===================================================== */

  sectionTitle: {
    fontSize: 23,
    fontWeight: "700",
    color: C.dark,
    marginTop: 30,
    marginBottom: 15,
  },

  option: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },

  optionSelected: {
    backgroundColor: C.paleTeal,
    borderColor: C.teal,
  },

  optionNumberCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.cream,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  optionNumberCircleSelected: {
    backgroundColor: C.teal,
  },

  optionNumber: {
    fontSize: 11,
    fontWeight: "700",
    color: C.deepTeal,
  },

  optionNumberSelected: {
    color: C.white,
  },

  optionContent: {
    flex: 1,
  },

  optionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.dark,
  },

  optionText: {
    fontSize: 13,
    lineHeight: 19,
    color: C.muted,
    marginTop: 5,
  },

  selectedCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.deepTeal,
    color: C.white,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 15,
    fontWeight: "900",
    marginLeft: 8,
  },

  /* =====================================================
     NOTE
     ===================================================== */

  note: {
    backgroundColor: C.paleTeal,
    borderRadius: 18,
    padding: 16,
    marginTop: 15,
  },

  noteText: {
    fontSize: 11,
    lineHeight: 17,
    color: C.muted,
    textAlign: "center",
  },
});