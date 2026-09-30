import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

// SVGs
import JournalIllustration from "../../assets/Notebook-bro.svg";
import BabyIllustration from "../../assets/undraw_baby_uoep.svg";
import MeditationIllustration from "../../assets/undraw_meditation_k4oa.svg";
import CommunityIllustration from "../../assets/Women talking-pana.svg";

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

/* -------------------------------------------------------
   FLOATING ELEMENTS
------------------------------------------------------- */

type FloatType =
  | "circle"
  | "dot"
  | "ring"
  | "heart"
  | "star"
  | "bubble";

type FloatDefinition = {
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

const floatingDefinitions: FloatDefinition[] = [
  {
    type: "bubble",
    left: 0.04,
    top: 0.12,
    size: 45,
    color: C.yellow,
  },
  {
    type: "dot",
    left: 0.88,
    top: 0.08,
    size: 17,
    color: C.coral,
  },
  {
    type: "heart",
    left: 0.08,
    top: 0.30,
    size: 35,
    color: C.teal,
  },
  {
    type: "ring",
    left: 0.91,
    top: 0.29,
    size: 34,
    color: C.yellow,
  },
  {
    type: "star",
    left: 0.03,
    top: 0.53,
    size: 31,
    color: C.coral,
  },
  {
    type: "bubble",
    left: 0.91,
    top: 0.52,
    size: 48,
    color: C.teal,
  },
  {
    type: "dot",
    left: 0.18,
    top: 0.70,
    size: 14,
    color: C.yellow,
  },
  {
    type: "ring",
    left: 0.82,
    top: 0.73,
    size: 26,
    color: C.coral,
  },
  {
    type: "heart",
    left: 0.08,
    top: 0.86,
    size: 29,
    color: C.yellow,
  },
  {
    type: "dot",
    left: 0.94,
    top: 0.90,
    size: 13,
    color: C.teal,
  },
];

/* -------------------------------------------------------
   FLOATING SHAPE
------------------------------------------------------- */

const FloatingShape = ({
  definition,
  item,
}: {
  definition: FloatDefinition;
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
              opacity: 0.9,
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
                outputRange: ["-10deg", "10deg"],
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

/* -------------------------------------------------------
   DASHBOARD
------------------------------------------------------- */

const MotherDashboard = () => {
  const [completedGoals] = useState(2);

  /* -------------------------------------------------------
     JOURNEY FEATURE STATE
  ------------------------------------------------------- */

  const [selectedJourneyPoint, setSelectedJourneyPoint] =
    useState<number | null>(null);

  const journeyProgress = useRef(
    new Animated.Value(0)
  ).current;

  const journeyMarkerScale = useRef(
    new Animated.Value(1)
  ).current;

  const journeyPointScales = useRef(
    Array.from({ length: 10 }, () => new Animated.Value(1))
  ).current;

  const journeyPoints = [
    {
      title: "Beginning",
      message: "Every journey starts with one small step. ♡",
    },
    {
      title: "First Steps",
      message: "You started showing up for yourself. 🌿",
    },
    {
      title: "Finding Rhythm",
      message: "Small routines are beginning to feel natural.",
    },
    {
      title: "Making Space",
      message: "You are making more room for yourself.",
    },
    {
      title: "Growing Stronger",
      message: "Your little efforts are adding up. ✨",
    },
    {
      title: "Finding Balance",
      message: "You are learning what your mind and body need.",
    },
    {
      title: "Moving Forward",
      message: "You keep choosing yourself, one moment at a time.",
    },
    {
      title: "Beautiful Progress",
      message: "Look how far your little steps have taken you. 🌸",
    },
    {
      title: "Almost There",
      message: "Your journey is nearly complete.",
    },
    {
      title: "Your Day",
      message: "You cared for yourself in so many little ways today. ♡",
    },
  ];

  const getEncouragement = () => {
    if (completedGoals === 0) {
      return "No pressure. You can start with just one little thing. ♡";
    }

    if (completedGoals <= 2) {
      return "Small steps count. You showed up for yourself today. ♡";
    }

    if (completedGoals <= 4) {
      return "You're making space for yourself. Keep going gently. 🌿";
    }

    if (completedGoals <= 6) {
      return "Look at you taking care of yourself too. ✨";
    }

    if (completedGoals <= 8) {
      return "You're doing beautifully. Your little efforts matter. ♡";
    }

    if (completedGoals < 10) {
      return "Almost there! Every little moment counts. 🌸";
    }

    return "You cared for yourself in so many little ways today. ✨";
  };

  /* -------------------------------------------------------
     JOURNEY ANIMATION
  ------------------------------------------------------- */

  useEffect(() => {
    Animated.timing(journeyProgress, {
      toValue: completedGoals,
      duration: 1200,
      delay: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    Animated.sequence([
      Animated.spring(journeyMarkerScale, {
        toValue: 1.15,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(journeyMarkerScale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [
    completedGoals,
    journeyProgress,
    journeyMarkerScale,
  ]);

  /* -------------------------------------------------------
     JOURNEY POINT INTERACTION
  ------------------------------------------------------- */

  const handleJourneyPointPress = (index: number) => {
    if (index >= completedGoals) {
      return;
    }

    Animated.sequence([
      Animated.spring(journeyPointScales[index], {
        toValue: 0.88,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(journeyPointScales[index], {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();

    setSelectedJourneyPoint(
      selectedJourneyPoint === index ? null : index
    );
  };

  /* -------------------------------------------------------
     FLOATING ELEMENTS
  ------------------------------------------------------- */

  const floatingItems = useRef<FloatItem[]>(
    floatingDefinitions.map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      scale: new Animated.Value(1),
      rotate: new Animated.Value(0),
    }))
  ).current;

  const animations = useRef<Animated.CompositeAnimation[]>(
    []
  ).current;

  /* -------------------------------------------------------
     FLOATING ANIMATION
  ------------------------------------------------------- */

  useEffect(() => {
    floatingItems.forEach((item, index) => {
      const move = () => {
        const xDistance = 18 + Math.random() * 35;
        const yDistance = 15 + Math.random() * 35;

        const xDirection = Math.random() > 0.5 ? 1 : -1;
        const yDirection = Math.random() > 0.5 ? 1 : -1;

        const duration = 5000 + Math.random() * 3500;

        const animation = Animated.parallel([
          Animated.timing(item.x, {
            toValue: xDistance * xDirection,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),

          Animated.timing(item.y, {
            toValue: yDistance * yDirection,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),

          Animated.sequence([
            Animated.timing(item.scale, {
              toValue: 1.06,
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

          Animated.timing(item.rotate, {
            toValue: Math.random() > 0.5 ? 1 : -1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]);

        animations[index] = animation;

        animation.start(({ finished }) => {
          if (finished) {
            item.x.setValue(0);
            item.y.setValue(0);
            item.rotate.setValue(0);
            move();
          }
        });
      };

      const timeout = setTimeout(() => {
        move();
      }, index * 250);

      return () => clearTimeout(timeout);
    });

    return () => {
      animations.forEach((animation) => animation?.stop());
    };
  }, []);

  /* -------------------------------------------------------
     TOUCH / MOUSE INTERACTION
  ------------------------------------------------------- */

  const repelFloatingElements = (x: number, y: number) => {
    floatingDefinitions.forEach((definition, index) => {
      const item = floatingItems[index];

      const elementX = width * definition.left;
      const elementY = height * definition.top;

      const distanceX = elementX - x;
      const distanceY = elementY - y;

      const distance = Math.sqrt(
        distanceX * distanceX + distanceY * distanceY
      );

      const interactionRadius = 150;

      if (distance < interactionRadius) {
        const strength =
          (interactionRadius - distance) /
          interactionRadius;

        const pushX =
          (distanceX / (distance || 1)) *
          45 *
          strength;

        const pushY =
          (distanceY / (distance || 1)) *
          45 *
          strength;

        Animated.parallel([
          Animated.spring(item.x, {
            toValue: pushX,
            tension: 45,
            friction: 7,
            useNativeDriver: true,
          }),

          Animated.spring(item.y, {
            toValue: pushY,
            tension: 45,
            friction: 7,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,

        onMoveShouldSetPanResponder: () => true,

        onPanResponderMove: (_, gesture) => {
          repelFloatingElements(
            gesture.moveX,
            gesture.moveY
          );
        },

        onPanResponderRelease: () => {
          floatingItems.forEach((item) => {
            Animated.spring(item.x, {
              toValue: 0,
              tension: 35,
              friction: 8,
              useNativeDriver: true,
            }).start();

            Animated.spring(item.y, {
              toValue: 0,
              tension: 35,
              friction: 8,
              useNativeDriver: true,
            }).start();
          });
        },
      }),
    []
  );

  return (
    <View
      style={styles.screen}
      {...panResponder.panHandlers}
    >
      {/* FLOATING BACKGROUND */}

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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <Text style={styles.greeting}>
            GOOD MORNING, MAMA
          </Text>

          <Text style={styles.heading}>
            This little{"\n"}
            <Text style={styles.headingAccent}>
              space is yours.
            </Text>
          </Text>

          <Text style={styles.subtitle}>
            Take a deep breath, slow down and care
            for yourself.
          </Text>
        </View>

        {/* -------------------------------------------------------
           NEW FEATURE — YOUR JOURNEY
        ------------------------------------------------------- */}

        <View style={styles.journeyCard}>
          <View style={styles.journeyHeader}>
            <View style={styles.journeyHeaderText}>
              <Text style={styles.journeyLabel}>
                YOUR JOURNEY
              </Text>

              <Text style={styles.journeyTitle}>
                Look how far you've come.
              </Text>

              <Text style={styles.journeySubtitle}>
                Every little step moves you forward.
              </Text>
            </View>

            <View style={styles.journeyCount}>
              <Text style={styles.journeyCountNumber}>
                {completedGoals}
              </Text>

              <Text style={styles.journeyCountSmall}>
                /10
              </Text>
            </View>
          </View>

          {/* JOURNEY MAP */}

          <View style={styles.journeyMap}>
            <View style={styles.journeyPath} />

            <Animated.View
              style={[
                styles.journeyProgressLine,
                {
                  width: journeyProgress.interpolate({
                    inputRange: [0, 10],
                    outputRange: [
                      "0%",
                      "100%",
                    ],
                    extrapolate: "clamp",
                  }),
                },
              ]}
            />

            {journeyPoints.map((point, index) => {
              const reached =
                index < completedGoals;

              const current =
                index === completedGoals - 1;

              return (
                <Animated.View
                  key={index}
                  style={[
                    styles.journeyPointWrapper,
                    {
                      left: `${index * 11.1}%`,
                      transform: [
                        {
                          scale:
                            journeyPointScales[index],
                        },
                      ],
                    },
                  ]}
                >
                  <Pressable
                    disabled={!reached}
                    onPress={() =>
                      handleJourneyPointPress(index)
                    }
                    style={[
                      styles.journeyPoint,
                      reached &&
                        styles.journeyPointReached,
                      current &&
                        styles.journeyPointCurrent,
                      !reached &&
                        styles.journeyPointLocked,
                    ]}
                  >
                    <Text
                      style={[
                        styles.journeyPointText,
                        reached &&
                          styles.journeyPointTextReached,
                      ]}
                    >
                      {reached
                        ? "✓"
                        : index + 1}
                    </Text>
                  </Pressable>

                  {current && (
                    <Animated.View
                      style={[
                        styles.journeyTraveler,
                        {
                          transform: [
                            {
                              scale:
                                journeyMarkerScale,
                            },
                          ],
                        },
                      ]}
                    >
                      <Text
                        style={
                          styles.journeyTravelerText
                        }
                      >
                        ♡
                      </Text>
                    </Animated.View>
                  )}
                </Animated.View>
              );
            })}
          </View>

          {/* JOURNEY LABELS */}

          <View style={styles.journeyStartEnd}>
            <Text style={styles.journeyStartText}>
              START
            </Text>

            <Text style={styles.journeyEndText}>
              YOUR DAY
            </Text>
          </View>

          {/* SELECTED MILESTONE */}

          {selectedJourneyPoint !== null && (
            <Animated.View
              style={styles.journeyMessage}
            >
              <View
                style={
                  styles.journeyMessageIcon
                }
              >
                <Text
                  style={
                    styles.journeyMessageIconText
                  }
                >
                  ✦
                </Text>
              </View>

              <View
                style={
                  styles.journeyMessageContent
                }
              >
                <Text
                  style={
                    styles.journeyMessageTitle
                  }
                >
                  {
                    journeyPoints[
                      selectedJourneyPoint
                    ].title
                  }
                </Text>

                <Text
                  style={
                    styles.journeyMessageText
                  }
                >
                  {
                    journeyPoints[
                      selectedJourneyPoint
                    ].message
                  }
                </Text>
              </View>
            </Animated.View>
          )}

          <Text style={styles.journeyHint}>
            Tap a reached checkpoint to revisit your progress.
          </Text>
        </View>

        {/* HERO */}

        <View style={styles.heroCard}>
          <View style={styles.heroIllustration}>
            <BabyIllustration
              width="100%"
              height={220}
            />
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>
              YOUR SPACE
            </Text>

            <Text style={styles.heroTitle}>
              Take a little pause.
            </Text>

            <Text style={styles.heroDescription}>
              You spend so much time caring for everyone.
              This moment belongs to you.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() =>
                router.push("/meditation")
              }
            >
              <Text style={styles.primaryButtonText}>
                Take a Moment
              </Text>

              <View style={styles.buttonArrow}>
                <Text style={styles.arrow}>
                  →
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* DAILY CARE */}

        <Text style={styles.sectionTitle}>
          Your Little Things
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.dailyCard,
            pressed && styles.cardPressed,
          ]}
          onPress={() =>
            router.push("/daily-care")
          }
        >
          <View style={styles.dailyTop}>
            <View>
              <Text style={styles.dailyLabel}>
                TODAY'S CARE
              </Text>

              <Text style={styles.dailyTitle}>
                {completedGoals} / 10
              </Text>

              <Text style={styles.dailySubtitle}>
                little things completed
              </Text>
            </View>

            <Text style={styles.heart}>
              ♡
            </Text>
          </View>

          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${completedGoals * 10}%`,
                },
              ]}
            />
          </View>

          <Text style={styles.encouragement}>
            {getEncouragement()}
          </Text>

          <View style={styles.viewGoalsButton}>
            <Text style={styles.viewGoalsText}>
              View Today's Care →
            </Text>
          </View>
        </Pressable>

        {/* SELF CARE */}

        <Text style={styles.sectionTitle}>
          For You
        </Text>

        <View style={styles.row}>
          {/* MEDITATION */}

          <Pressable
            style={({ pressed }) => [
              styles.selfCareCard,
              pressed && styles.cardPressed,
            ]}
            onPress={() =>
              router.push("/meditation")
            }
          >
            <View style={styles.illustrationBoxTeal}>
              <MeditationIllustration
                width="100%"
                height={110}
              />
            </View>

            <Text style={styles.cardTitle}>
              Meditation
            </Text>

            <Text style={styles.cardSubtitle}>
              Find calm in five minutes.
            </Text>
          </Pressable>

          {/* JOURNAL */}

          <Pressable
            style={({ pressed }) => [
              styles.selfCareCard,
              pressed && styles.cardPressed,
            ]}
            onPress={() =>
              router.push("/journal")
            }
          >
            <View style={styles.illustrationBoxYellow}>
              <JournalIllustration
                width="100%"
                height={110}
              />
            </View>

            <Text style={styles.cardTitle}>
              Journal
            </Text>

            <Text style={styles.cardSubtitle}>
              Write your thoughts freely.
            </Text>
          </Pressable>
        </View>

        <View style={styles.row}>
          {/* HAPPY JAR */}

          <Pressable
            style={({ pressed }) => [
              styles.selfCareCard,
              pressed && styles.cardPressed,
            ]}
            onPress={() =>
              router.push("/happy-jar")
            }
          >
            <View style={styles.jarIllustration}>
              <Text style={styles.jarEmoji}>
                ♡
              </Text>
            </View>

            <Text style={styles.cardTitle}>
              Happy Jar
            </Text>

            <Text style={styles.cardSubtitle}>
              Save a little happy moment.
            </Text>
          </Pressable>

          {/* SUPPORT */}

          <Pressable
            style={({ pressed }) => [
              styles.selfCareCard,
              pressed && styles.cardPressed,
            ]}
            onPress={() =>
              router.push("/support")
            }
          >
            <View style={styles.supportIllustration}>
              <Text style={styles.supportSymbol}>
                ♡
              </Text>
            </View>

            <Text style={styles.cardTitle}>
              Support
            </Text>

            <Text style={styles.cardSubtitle}>
              You don't have to handle it alone.
            </Text>
          </Pressable>
        </View>

        {/* COMMUNITY */}

        <Text style={styles.sectionTitle}>
          Your Village
        </Text>

        <View style={styles.communityCard}>
          <View style={styles.communityIllustration}>
            <CommunityIllustration
              width="100%"
              height={180}
            />
          </View>

          <Text style={styles.communityTitle}>
            You don't have to do it alone.
          </Text>

          <Text style={styles.communitySubtitle}>
            Share stories, ask questions and connect
            with mothers walking the same journey.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() =>
              router.push("/community")
            }
          >
            <Text style={styles.primaryButtonText}>
              Visit Community
            </Text>

            <View style={styles.buttonArrow}>
              <Text style={styles.arrow}>
                →
              </Text>
            </View>
          </Pressable>
        </View>

        {/* BABY */}

        <Text style={styles.sectionTitle}>
          Baby Space
        </Text>

        <View style={styles.babyCard}>
          <View style={styles.babyIllustration}>
            <BabyIllustration
              width="100%"
              height={170}
            />
          </View>

          <Text style={styles.communityTitle}>
            Little moments, big memories.
          </Text>

          <Text style={styles.communitySubtitle}>
            Feeding • Sleep • Milestones • Memories
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.outlineButton,
              pressed && styles.outlinePressed,
            ]}
            onPress={() =>
              router.push("/baby-dashboard")
            }
          >
            <Text style={styles.outlineButtonText}>
              Open Baby Space
            </Text>

            <Text style={styles.outlineArrow}>
              →
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

export default MotherDashboard;

/* -------------------------------------------------------
   STYLES
------------------------------------------------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.cream,
  },

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 22,
    paddingBottom: 55,
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

  /* HEADER */

  header: {
    marginTop: 60,
    marginBottom: 24,
    zIndex: 2,
  },

  greeting: {
    fontSize: 10,
    letterSpacing: 2,
    color: C.deepTeal,
    fontWeight: "900",
    marginBottom: 12,
  },

  heading: {
    fontSize: 34,
    lineHeight: 40,
    color: C.dark,
    fontWeight: "900",
    letterSpacing: -1,
  },

  headingAccent: {
    color: C.deepTeal,
  },

  subtitle: {
    marginTop: 10,
    fontSize: 14,
    color: C.muted,
    lineHeight: 22,
    maxWidth: 340,
  },

  /* -------------------------------------------------------
     NEW JOURNEY FEATURE
  ------------------------------------------------------- */

  journeyCard: {
    backgroundColor: C.white,
    borderRadius: 30,
    padding: 20,
    marginBottom: 30,
    zIndex: 2,

    shadowColor: C.dark,
    shadowOpacity: 0.07,
    shadowRadius: 15,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 4,
  },

  journeyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  journeyHeaderText: {
    flex: 1,
    paddingRight: 12,
  },

  journeyLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: C.teal,
    fontWeight: "900",
  },

  journeyTitle: {
    fontSize: 21,
    lineHeight: 27,
    color: C.dark,
    fontWeight: "900",
    marginTop: 6,
  },

  journeySubtitle: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 18,
    marginTop: 4,
  },

  journeyCount: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: C.yellow,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  journeyCountNumber: {
    fontSize: 20,
    color: C.dark,
    fontWeight: "900",
  },

  journeyCountSmall: {
    fontSize: 10,
    color: C.dark,
    fontWeight: "800",
    marginTop: 8,
  },

  journeyMap: {
    height: 95,
    marginTop: 17,
    position: "relative",
    justifyContent: "center",
  },

  journeyPath: {
    position: "absolute",
    left: 7,
    right: 7,
    top: 43,
    height: 5,
    borderRadius: 5,
    backgroundColor: "#DDECEA",
  },

  journeyProgressLine: {
    position: "absolute",
    left: 7,
    top: 43,
    height: 5,
    borderRadius: 5,
    backgroundColor: C.teal,
  },

  journeyPointWrapper: {
    position: "absolute",
    top: 29,
    width: 28,
    height: 30,
    alignItems: "center",
  },

  journeyPoint: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: C.cream,
    borderWidth: 2,
    borderColor: "#D5E5E2",
    alignItems: "center",
    justifyContent: "center",
  },

  journeyPointReached: {
    backgroundColor: C.teal,
    borderColor: C.teal,
  },

  journeyPointCurrent: {
    backgroundColor: C.yellow,
    borderColor: C.deepTeal,
    borderWidth: 3,
  },

  journeyPointLocked: {
    backgroundColor: "#F4F8F7",
    borderColor: "#DCE7E5",
  },

  journeyPointText: {
    fontSize: 9,
    color: "#93A6A4",
    fontWeight: "900",
  },

  journeyPointTextReached: {
    color: C.white,
  },

  journeyTraveler: {
    position: "absolute",
    top: -23,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.coral,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: C.coral,
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 3,
  },

  journeyTravelerText: {
    color: C.white,
    fontSize: 17,
    fontWeight: "900",
  },

  journeyStartEnd: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -4,
  },

  journeyStartText: {
    fontSize: 9,
    color: C.muted,
    fontWeight: "900",
    letterSpacing: 1,
  },

  journeyEndText: {
    fontSize: 9,
    color: C.muted,
    fontWeight: "900",
    letterSpacing: 1,
  },

  journeyMessage: {
    marginTop: 15,
    backgroundColor: C.paleTeal,
    borderRadius: 18,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  journeyMessageIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  journeyMessageIconText: {
    fontSize: 18,
    color: C.deepTeal,
  },

  journeyMessageContent: {
    flex: 1,
  },

  journeyMessageTitle: {
    fontSize: 13,
    color: C.dark,
    fontWeight: "900",
  },

  journeyMessageText: {
    fontSize: 11,
    color: C.muted,
    lineHeight: 17,
    marginTop: 2,
  },

  journeyHint: {
    textAlign: "center",
    fontSize: 9,
    color: "#86A09E",
    marginTop: 11,
  },

  /* HERO */

  heroCard: {
    backgroundColor: C.paleTeal,
    borderRadius: 32,
    overflow: "hidden",
    marginBottom: 30,
    zIndex: 2,

    shadowColor: C.deepTeal,
    shadowOpacity: 0.09,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },

    elevation: 5,
  },

  heroIllustration: {
    backgroundColor: "#DDF5F1",
    paddingTop: 4,
  },

  heroContent: {
    padding: 23,
  },

  heroLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: C.deepTeal,
    fontWeight: "900",
  },

  heroTitle: {
    fontSize: 28,
    marginTop: 7,
    color: C.dark,
    fontWeight: "900",
    letterSpacing: -0.5,
  },

  heroDescription: {
    marginTop: 9,
    fontSize: 14,
    color: C.muted,
    lineHeight: 21,
  },

  /* BUTTON */

  primaryButton: {
    height: 52,
    backgroundColor: C.deepTeal,
    borderRadius: 27,
    paddingLeft: 20,
    paddingRight: 6,
    marginTop: 20,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    alignSelf: "flex-start",

    shadowColor: C.deepTeal,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 4,
  },

  primaryButtonText: {
    color: C.white,
    fontWeight: "800",
    fontSize: 13,
  },

  buttonArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },

  arrow: {
    color: C.deepTeal,
    fontSize: 19,
    fontWeight: "900",
  },

  buttonPressed: {
    transform: [{ scale: 0.97 }],
  },

  /* SECTION */

  sectionTitle: {
    fontSize: 23,
    fontWeight: "900",
    color: C.dark,
    marginBottom: 14,
    marginTop: 10,
    letterSpacing: -0.4,
    zIndex: 2,
  },

  /* DAILY CARE */

  dailyCard: {
    backgroundColor: C.yellow,
    borderRadius: 28,
    padding: 22,
    marginBottom: 29,
    zIndex: 2,

    shadowColor: C.dark,
    shadowOpacity: 0.07,
    shadowRadius: 13,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 3,
  },

  dailyTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dailyLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: C.dark,
    fontWeight: "900",
  },

  dailyTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: C.dark,
    marginTop: 5,
  },

  dailySubtitle: {
    fontSize: 13,
    color: "#536B68",
  },

  heart: {
    fontSize: 52,
    color: C.deepTeal,
    fontWeight: "300",
  },

  progressBackground: {
    height: 9,
    backgroundColor: "#F0C947",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 20,
  },

  progressFill: {
    height: "100%",
    backgroundColor: C.deepTeal,
    borderRadius: 10,
  },

  encouragement: {
    fontSize: 14,
    lineHeight: 21,
    color: C.dark,
    marginTop: 15,
    fontWeight: "600",
  },

  viewGoalsButton: {
    marginTop: 17,
    alignSelf: "flex-start",
  },

  viewGoalsText: {
    fontSize: 13,
    fontWeight: "900",
    color: C.deepTeal,
  },

  /* SELF CARE */

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    zIndex: 2,
  },

  selfCareCard: {
    width: "48%",
    backgroundColor: C.white,
    borderRadius: 25,
    padding: 14,

    shadowColor: C.dark,
    shadowOpacity: 0.06,
    shadowRadius: 11,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 3,
  },

  cardPressed: {
    transform: [{ scale: 0.98 }],
  },

  illustrationBoxTeal: {
    height: 110,
    borderRadius: 19,
    backgroundColor: C.paleTeal,
    overflow: "hidden",
    justifyContent: "center",
  },

  illustrationBoxYellow: {
    height: 110,
    borderRadius: 19,
    backgroundColor: "#FFF4C7",
    overflow: "hidden",
    justifyContent: "center",
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: C.dark,
    marginTop: 11,
  },

  cardSubtitle: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: C.muted,
  },

  jarIllustration: {
    height: 110,
    borderRadius: 19,
    backgroundColor: "#FFF1D8",
    alignItems: "center",
    justifyContent: "center",
  },

  jarEmoji: {
    fontSize: 58,
    color: C.coral,
  },

  supportIllustration: {
    height: 110,
    borderRadius: 19,
    backgroundColor: "#FFE5E1",
    alignItems: "center",
    justifyContent: "center",
  },

  supportSymbol: {
    fontSize: 58,
    color: C.coral,
  },

  /* COMMUNITY */

  communityCard: {
    backgroundColor: C.yellow,
    borderRadius: 30,
    padding: 20,
    marginBottom: 30,
    zIndex: 2,

    shadowColor: C.muted,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 4,
  },

  communityIllustration: {
    backgroundColor: C.white,
    borderRadius: 22,
    overflow: "hidden",
  },

  communityTitle: {
    fontSize: 23,
    fontWeight: "900",
    color: C.dark,
    marginTop: 15,
    letterSpacing: -0.3,
  },

  communitySubtitle: {
    fontSize: 14,
    color: "#5E6460",
    marginTop: 9,
    lineHeight: 21,
  },

  /* BABY */

  babyCard: {
    backgroundColor: C.white,
    borderRadius: 30,
    padding: 20,
    marginBottom: 50,
    zIndex: 2,

    shadowColor: C.dark,
    shadowOpacity: 0.06,
    shadowRadius: 13,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 3,
  },

  babyIllustration: {
    backgroundColor: C.paleTeal,
    borderRadius: 22,
    overflow: "hidden",
  },

  outlineButton: {
    borderWidth: 1.5,
    borderColor: C.deepTeal,
    borderRadius: 28,
    alignSelf: "flex-start",
    paddingLeft: 20,
    paddingRight: 7,
    height: 48,
    marginTop: 18,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  outlineButtonText: {
    color: C.deepTeal,
    fontSize: 13,
    fontWeight: "800",
  },

  outlineArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.yellow,
    color: C.deepTeal,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    textAlignVertical: "center",
    marginLeft: 12,
  },

  outlinePressed: {
    transform: [{ scale: 0.97 }],
  },
});