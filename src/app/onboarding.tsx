
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/* =========================================================
   MAMAMIND PALETTE
========================================================= */

const C = {
  cream: "#FFF9F0",
  white: "#FFFFFF",
  dark: "#183B3A",
  deepTeal: "#145E5A",
  teal: "#69B9B0",
  paleTeal: "#E5F4F1",
  yellow: "#F5C84B",
  softYellow: "#FFF0B8",
  coral: "#F47C68",
  softCoral: "#FFF0ED",
  muted: "#647C7A",
  border: "#DCEAE7",
};

/* =========================================================
   FLOATING OBJECT TYPES
========================================================= */

type FloatingType =
  | "yellow"
  | "teal"
  | "coral"
  | "ring"
  | "heart"
  | "sparkle"
  | "bubble";

type FloatingObject = {
  id: number;
  type: FloatingType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  radius: number;
};

/* =========================================================
   RANDOM FLOATING OBJECTS
========================================================= */

const createFloatingObjects = (): FloatingObject[] => {
  const types: FloatingType[] = [
    "yellow",
    "teal",
    "coral",
    "ring",
    "heart",
    "sparkle",
    "bubble",
    "yellow",
    "teal",
    "coral",
    "sparkle",
  ];

  return types.map((type, index) => {
    const size =
      type === "heart"
        ? 42
        : type === "sparkle"
        ? 30
        : type === "bubble"
        ? 45
        : type === "ring"
        ? 38
        : 18 + Math.random() * 14;

    return {
      id: index,
      type,
      x: 20 + Math.random() * Math.max(100, SCREEN_WIDTH - 60),
      y: 30 + Math.random() * 780,
      vx:
        (Math.random() > 0.5 ? 1 : -1) *
        (0.35 + Math.random() * 0.75),
      vy:
        (Math.random() > 0.5 ? 1 : -1) *
        (0.35 + Math.random() * 0.75),
      size,
      radius: size * 0.45,
    };
  });
};

/* =========================================================
   FLOATING ELEMENT RENDERER
========================================================= */

function FloatingElement({
  item,
}: {
  item: FloatingObject;
}) {
  const baseStyle = {
    position: "absolute" as const,
    left: item.x,
    top: item.y,
    width: item.size,
    height: item.size,
    zIndex: 0,
  };

  switch (item.type) {
    case "yellow":
      return (
        <View
          style={[
            baseStyle,
            {
              borderRadius: item.size / 2,
              backgroundColor: C.yellow,
              opacity: 0.7,
            },
          ]}
        />
      );

    case "teal":
      return (
        <View
          style={[
            baseStyle,
            {
              borderRadius: item.size / 2,
              backgroundColor: C.teal,
              opacity: 0.42,
            },
          ]}
        />
      );

    case "coral":
      return (
        <View
          style={[
            baseStyle,
            {
              borderRadius: item.size / 2,
              backgroundColor: C.coral,
              opacity: 0.35,
            },
          ]}
        />
      );

    case "ring":
      return (
        <View
          style={[
            baseStyle,
            {
              borderRadius: item.size / 2,
              borderWidth: 3,
              borderColor: C.teal,
              opacity: 0.55,
            },
          ]}
        />
      );

    case "bubble":
      return (
        <View
          style={[
            baseStyle,
            {
              borderRadius: item.size / 2,
              borderWidth: 2,
              borderColor: C.teal,
              backgroundColor: "#FFFFFF55",
              opacity: 0.55,
            },
          ]}
        >
          <View style={styles.bubbleHighlight} />
        </View>
      );

    case "heart":
      return (
        <Text
          style={[
            baseStyle,
            styles.heart,
          ]}
        >
          ♡
        </Text>
      );

    case "sparkle":
      return (
        <Text
          style={[
            baseStyle,
            styles.sparkle,
          ]}
        >
          ✦
        </Text>
      );

    default:
      return null;
  }
}

/* =========================================================
   ONBOARDING SCREEN
========================================================= */

export default function OnboardingScreen() {
  const [name, setName] = useState("");
  const [support, setSupport] = useState("");
  const [relax, setRelax] = useState("");
  const [personalTime, setPersonalTime] = useState("");

  const [floatingObjects, setFloatingObjects] =
    useState<FloatingObject[]>(createFloatingObjects);

  const objectsRef = useRef<FloatingObject[]>(
    floatingObjects
  );

  const fieldHeightRef = useRef(900);

  const finishOnboarding = () => {
    (router.replace as (href: string) => void)(
      "/mother-dashboard"
    );
  };

  /* =======================================================
     FLOATING PHYSICS
  ======================================================= */

  useEffect(() => {
    let animationFrame: number;

    const animate = () => {
      const objects = objectsRef.current;

      const width = SCREEN_WIDTH;
      const height = fieldHeightRef.current;

      /* -----------------------------------------------
         MOVE OBJECTS
      ------------------------------------------------ */

      for (const object of objects) {
        object.x += object.vx;
        object.y += object.vy;

        /* ---------------------------------------------
           WALL COLLISION — LEFT / RIGHT
        --------------------------------------------- */

        if (
          object.x <= 8 ||
          object.x + object.size >= width - 8
        ) {
          object.vx *= -1;

          object.x = Math.max(
            8,
            Math.min(
              object.x,
              width - object.size - 8
            )
          );
        }

        /* ---------------------------------------------
           WALL COLLISION — TOP / BOTTOM
        --------------------------------------------- */

        if (
          object.y <= 8 ||
          object.y + object.size >= height - 8
        ) {
          object.vy *= -1;

          object.y = Math.max(
            8,
            Math.min(
              object.y,
              height - object.size - 8
            )
          );
        }
      }

      /* -----------------------------------------------
         OBJECT VS OBJECT COLLISION
      ------------------------------------------------ */

      for (let i = 0; i < objects.length; i++) {
        for (
          let j = i + 1;
          j < objects.length;
          j++
        ) {
          const a = objects[i];
          const b = objects[j];

          const ax =
            a.x + a.size / 2;
          const ay =
            a.y + a.size / 2;

          const bx =
            b.x + b.size / 2;
          const by =
            b.y + b.size / 2;

          const dx = bx - ax;
          const dy = by - ay;

          const distance = Math.sqrt(
            dx * dx + dy * dy
          );

          const minimumDistance =
            a.radius + b.radius;

          if (
            distance > 0 &&
            distance < minimumDistance
          ) {
            /* -----------------------------------------
               NORMALIZED COLLISION VECTOR
            ----------------------------------------- */

            const nx = dx / distance;
            const ny = dy / distance;

            /* -----------------------------------------
               PUSH OBJECTS APART
            ----------------------------------------- */

            const overlap =
              minimumDistance - distance;

            a.x -= nx * overlap * 0.5;
            a.y -= ny * overlap * 0.5;

            b.x += nx * overlap * 0.5;
            b.y += ny * overlap * 0.5;

            /* -----------------------------------------
               RELATIVE VELOCITY
            ----------------------------------------- */

            const relativeVelocityX =
              a.vx - b.vx;

            const relativeVelocityY =
              a.vy - b.vy;

            const velocityAlongNormal =
              relativeVelocityX * nx +
              relativeVelocityY * ny;

            /* -----------------------------------------
               ONLY BOUNCE IF MOVING TOWARD EACH OTHER
            ----------------------------------------- */

            if (velocityAlongNormal > 0) {
              const bounceStrength = 1.05;

              a.vx -=
                velocityAlongNormal *
                nx *
                bounceStrength;

              a.vy -=
                velocityAlongNormal *
                ny *
                bounceStrength;

              b.vx +=
                velocityAlongNormal *
                nx *
                bounceStrength;

              b.vy +=
                velocityAlongNormal *
                ny *
                bounceStrength;
            }
          }
        }
      }

      /* -----------------------------------------------
         KEEP SPEED NATURAL
      ------------------------------------------------ */

      for (const object of objects) {
        const speed = Math.sqrt(
          object.vx * object.vx +
            object.vy * object.vy
        );

        const minSpeed = 0.35;
        const maxSpeed = 1.25;

        if (speed < minSpeed) {
          const angle =
            Math.random() * Math.PI * 2;

          object.vx =
            Math.cos(angle) * minSpeed;

          object.vy =
            Math.sin(angle) * minSpeed;
        }

        if (speed > maxSpeed) {
          object.vx =
            (object.vx / speed) *
            maxSpeed;

          object.vy =
            (object.vy / speed) *
            maxSpeed;
        }
      }

      setFloatingObjects([
        ...objects,
      ]);

      animationFrame =
        requestAnimationFrame(animate);
    };

    animationFrame =
      requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(
        animationFrame
      );
    };
  }, []);

  /* =======================================================
     LAYOUT
  ======================================================= */

  const handleFloatingFieldLayout = (
    event: any
  ) => {
    const height =
      event.nativeEvent.layout.height;

    fieldHeightRef.current =
      Math.max(height, 900);
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={
        styles.scrollContent
      }
    >
      <View
        style={styles.page}
        onLayout={handleFloatingFieldLayout}
      >
        {/* =================================================
            FLOATING WORLD
        ================================================= */}

        <View
          pointerEvents="none"
          style={styles.floatingLayer}
        >
          {floatingObjects.map(
            (item) => (
              <FloatingElement
                key={item.id}
                item={item}
              />
            )
          )}
        </View>

        {/* =================================================
            CONTENT
        ================================================= */}

        <View style={styles.content}>
          {/* BRAND */}

          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Text
                style={
                  styles.brandMarkText
                }
              >
                ✿
              </Text>
            </View>

            <Text style={styles.brandText}>
              MamaMind
            </Text>
          </View>

          {/* HEADER */}

          <View style={styles.header}>
            <View style={styles.headerPill}>
              <View
                style={styles.pillDot}
              />

              <Text
                style={styles.pillText}
              >
                YOUR LITTLE SPACE
              </Text>
            </View>

            <Text style={styles.title}>
              Let's get to know you
              <Text style={styles.heartTitle}>
                {" "}♥
              </Text>
            </Text>

            <Text
              style={styles.subtitle}
            >
              A few gentle questions to
              personalize your MamaMind
              experience.
            </Text>
          </View>

          {/* FORM CARD */}

          <View style={styles.formCard}>
            {/* NAME */}

            <View style={styles.question}>
              <Text style={styles.label}>
                What should we call you?
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor="#9AAEAB"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* SUPPORT */}

            <View style={styles.question}>
              <Text style={styles.label}>
                What kind of support helps
                you most?
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Example: Help with the baby, encouragement..."
                placeholderTextColor="#9AAEAB"
                value={support}
                onChangeText={setSupport}
              />
            </View>

            {/* RELAX */}

            <View style={styles.question}>
              <Text style={styles.label}>
                What helps you relax?
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Example: Music, meditation, walking..."
                placeholderTextColor="#9AAEAB"
                value={relax}
                onChangeText={setRelax}
              />
            </View>

            {/* PERSONAL TIME */}

            <View style={styles.question}>
              <Text style={styles.label}>
                When do you usually like
                some personal time?
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Example: Morning, afternoon, night..."
                placeholderTextColor="#9AAEAB"
                value={personalTime}
                onChangeText={
                  setPersonalTime
                }
              />
            </View>

            {/* BUTTON */}

            <Pressable
              onPress={finishOnboarding}
              style={({ pressed }) => [
                styles.button,
                pressed &&
                  styles.buttonPressed,
              ]}
            >
              <Text
                style={
                  styles.buttonText
                }
              >
                Finish Setup
              </Text>

              <View
                style={styles.buttonArrow}
              >
                <Text
                  style={
                    styles.buttonArrowText
                  }
                >
                  →
                </Text>
              </View>
            </Pressable>

            {/* SMALL REASSURANCE */}

            <View
              style={styles.reassurance}
            >
              <Text
                style={
                  styles.reassuranceIcon
                }
              >
                🌷
              </Text>

              <Text
                style={
                  styles.reassuranceText
                }
              >
                No pressure. Just helping
                MamaMind understand you a
                little better.
              </Text>
            </View>
          </View>

          {/* BOTTOM MESSAGE */}

          <View
            style={styles.bottomMessage}
          >
            <Text
              style={styles.bottomFlower}
            >
              ✿
            </Text>

            <Text
              style={styles.bottomText}
            >
              This is your space too.
            </Text>

            <Text
              style={styles.bottomFlower}
            >
              ✿
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },

  page: {
    flex: 1,
    minHeight: 1050,
    backgroundColor: C.cream,
    position: "relative",
    overflow: "hidden",
  },

  /* =======================================================
     FLOATING WORLD
  ======================================================= */

  floatingLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },

  bubbleHighlight: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.white,
    left: 9,
    top: 8,
    opacity: 0.8,
  },

  heart: {
    color: C.coral,
    fontSize: 38,
    fontWeight: "300",
    opacity: 0.6,
    textAlign: "center",
  },

  sparkle: {
    color: C.deepTeal,
    fontSize: 28,
    textAlign: "center",
    opacity: 0.5,
  },

  /* =======================================================
     CONTENT
  ======================================================= */

  content: {
    position: "relative",
    zIndex: 5,
    paddingHorizontal: 22,
    paddingTop: 42,
    paddingBottom: 35,
  },

  /* =======================================================
     BRAND
  ======================================================= */

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
  },

  brandMark: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: C.teal,
    justifyContent: "center",
    alignItems: "center",
    transform: [
      {
        rotate: "-7deg",
      },
    ],
  },

  brandMarkText: {
    color: C.white,
    fontSize: 24,
  },

  brandText: {
    color: C.dark,
    fontSize: 22,
    fontWeight: "900",
    marginLeft: 10,
    letterSpacing: -0.7,
  },

  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    alignItems: "center",
    marginTop: 42,
  },

  headerPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.paleTeal,
    borderWidth: 1,
    borderColor: "#D1EBE7",
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },

  pillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.coral,
    marginRight: 8,
  },

  pillText: {
    color: C.deepTeal,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
  },

  title: {
    color: C.dark,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "900",
    letterSpacing: -1.2,
    textAlign: "center",
    marginTop: 18,
  },

  heartTitle: {
    color: C.coral,
  },

  subtitle: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 360,
    marginTop: 11,
  },

  /* =======================================================
     FORM CARD
  ======================================================= */

  formCard: {
    width: "100%",
    maxWidth: 620,
    alignSelf: "center",
    backgroundColor: C.white,
    borderRadius: 32,
    paddingHorizontal: 22,
    paddingVertical: 25,
    marginTop: 30,

    shadowColor: C.deepTeal,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 4,
  },

  question: {
    marginBottom: 19,
  },

  label: {
    color: C.dark,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },

  input: {
    width: "100%",
    minHeight: 52,
    backgroundColor: "#F8FCFB",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 13,
    color: C.dark,
  },

  /* =======================================================
     BUTTON
  ======================================================= */

  button: {
    minHeight: 56,
    backgroundColor: C.deepTeal,
    borderRadius: 29,
    paddingLeft: 21,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 5,

    shadowColor: C.deepTeal,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.2,
    shadowRadius: 13,
    elevation: 5,
  },

  buttonPressed: {
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  buttonText: {
    color: C.white,
    fontSize: 14,
    fontWeight: "900",
  },

  buttonArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.yellow,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonArrowText: {
    color: C.deepTeal,
    fontSize: 20,
    fontWeight: "900",
  },

  /* =======================================================
     REASSURANCE
  ======================================================= */

  reassurance: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    paddingHorizontal: 10,
  },

  reassuranceIcon: {
    fontSize: 17,
    marginRight: 7,
  },

  reassuranceText: {
    flex: 1,
    color: "#78908D",
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
  },

  /* =======================================================
     BOTTOM MESSAGE
  ======================================================= */

  bottomMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },

  bottomFlower: {
    color: C.coral,
    fontSize: 17,
    marginHorizontal: 8,
  },

  bottomText: {
    color: C.deepTeal,
    fontSize: 11,
    fontWeight: "800",
  },
});


