import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

import Svg, { Circle, Path } from "react-native-svg";

/* =========================================================
   MAMAMIND PALETTE
========================================================= */

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

/* =========================================================
   FLOATING ELEMENT
========================================================= */

type FloatItem = {
  x: Animated.Value;
  y: Animated.Value;
  rx: Animated.Value;
  ry: Animated.Value;
};

type FloatingDefinition = {
  left: number;
  top: number;
  size: number;
  type: string;
};

/* =========================================================
   HAND-DRAWN MAMA + BABY
   SVG illustration instead of emoji.

   The slightly doubled / imperfect paths are intentional.
   They create a hand-drawn / After Effects illustration feel.
========================================================= */

function HandDrawnMamaBaby() {
  return (
    <Svg
      width="340"
      height="340"
      viewBox="0 0 340 340"
      fill="none"
    >
      {/* Soft organic background */}
      <Path
        d="M76 82C112 45 174 37 225 61C276 85 299 135 287 190C274 250 222 287 158 285C96 283 48 245 43 187C39 145 52 107 76 82Z"
        fill="#FFF3C4"
      />

      {/* Decorative leaf */}
      <Path
        d="M72 105C60 91 64 74 81 67C88 83 85 97 72 105Z"
        fill="#8CCFC8"
      />

      <Path
        d="M72 105C76 92 81 82 90 75"
        stroke="#277A76"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* =========================
          MOTHER
      ========================= */}

      {/* Hair silhouette */}
      <Path
        d="M91 154C83 117 95 83 128 67C159 52 198 67 214 96C229 124 222 159 202 180C190 193 169 199 145 194L108 180C99 173 94 164 91 154Z"
        fill="#463632"
      />

      {/* Face */}
      <Path
        d="M108 119C108 92 125 79 149 81C175 83 190 101 189 128C188 155 172 174 149 174C126 174 108 155 108 119Z"
        fill="#F7CBAA"
      />

      {/* Hair framing face */}
      <Path
        d="M108 117C111 90 130 76 153 81C172 84 185 97 190 115C176 105 158 101 141 106C128 109 117 114 108 117Z"
        fill="#463632"
      />

      {/* Ear */}
      <Circle
        cx="188"
        cy="130"
        r="9"
        fill="#F7CBAA"
      />

      {/* Eye */}
      <Path
        d="M128 126C132 122 137 122 141 126"
        stroke="#403330"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      <Path
        d="M158 126C162 122 167 122 171 126"
        stroke="#403330"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Nose */}
      <Path
        d="M150 130C148 136 149 139 153 140"
        stroke="#C98F78"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Gentle smile */}
      <Path
        d="M143 149C148 153 155 153 160 149"
        stroke="#403330"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Neck */}
      <Path
        d="M139 168V187"
        stroke="#F7CBAA"
        strokeWidth="14"
        strokeLinecap="round"
      />

      {/* Mother clothing */}
      <Path
        d="M96 188C111 177 128 176 149 190C169 177 188 179 204 191C222 205 231 231 235 263H68C72 232 80 204 96 188Z"
        fill="#277A76"
      />

      {/* Clothing accent */}
      <Path
        d="M125 183C132 195 141 203 150 208C159 202 168 193 175 182"
        stroke="#FFF5DF"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* =========================
    BABY
========================= */}

{/* Baby blanket/body */}
<Path
  d="M148 218C149 194 166 178 190 178C214 178 231 197 232 222C233 248 215 266 191 268C167 268 149 250 148 227V218Z"
  fill="#8CCFC8"
/>

{/* Baby head */}
<Circle
  cx="187"
  cy="181"
  r="33"
  fill="#F7CBAA"
/>

{/* Soft baby hair */}
<Path
  d="M157 174C159 153 173 142 189 144C204 146 213 158 215 174C206 168 198 165 188 166C177 167 167 171 157 174Z"
  fill="#463632"
/>

{/* Tiny baby ears */}
<Circle
  cx="157"
  cy="184"
  r="6"
  fill="#F7CBAA"
/>

<Circle
  cx="217"
  cy="184"
  r="6"
  fill="#F7CBAA"
/>

{/* Soft closed eyes */}
<Path
  d="M173 183C176 186 180 186 183 183"
  stroke="#403330"
  strokeWidth="2.5"
  strokeLinecap="round"
/>

<Path
  d="M192 183C195 186 199 186 202 183"
  stroke="#403330"
  strokeWidth="2.5"
  strokeLinecap="round"
/>

{/* Tiny nose */}
<Path
  d="M187 187C185 190 187 192 190 192"
  stroke="#C98F78"
  strokeWidth="1.8"
  strokeLinecap="round"
/>

{/* Gentle baby smile */}
<Path
  d="M181 198C185 202 190 202 194 198"
  stroke="#403330"
  strokeWidth="2.2"
  strokeLinecap="round"
/>

{/* Soft rosy cheeks */}
<Circle
  cx="170"
  cy="194"
  r="5"
  fill="#E9A49A"
  opacity={0.4}
/>

<Circle
  cx="204"
  cy="194"
  r="5"
  fill="#E9A49A"
  opacity={0.4}
/>

{/* Baby hand */}
<Circle
  cx="211"
  cy="213"
  r="8"
  fill="#F7CBAA"
/>

{/* Baby foot */}
<Path
  d="M209 251C216 248 223 251 225 256C220 261 212 261 207 257C205 255 206 252 209 251Z"
  fill="#F7CBAA"
/>

      {/* =========================
          MOTHER'S ARMS
      ========================= */}

      {/* Left arm */}
      <Path
        d="M116 195C129 204 139 219 151 229"
        stroke="#F7CBAA"
        strokeWidth="17"
        strokeLinecap="round"
      />

      {/* Right arm embracing baby */}
      <Path
        d="M204 195C196 207 193 220 201 232"
        stroke="#F7CBAA"
        strokeWidth="17"
        strokeLinecap="round"
      />

      {/* Mother's hand */}
      <Circle
        cx="151"
        cy="229"
        r="9"
        fill="#F7CBAA"
      />

      {/* Baby hand */}
      <Circle
        cx="211"
        cy="214"
        r="8"
        fill="#F7CBAA"
      />

      {/* Baby foot */}
      <Path
        d="M211 251C218 248 225 251 226 257C220 262 211 262 206 257C205 254 207 252 211 251Z"
        fill="#F7CBAA"
      />

      {/* =========================
          MINIMAL DECORATION
      ========================= */}

      {/* Small heart */}
      <Path
        d="M244 93C244 85 254 82 259 89C264 82 274 85 274 93C274 103 259 113 259 113C259 113 244 103 244 93Z"
        fill="#F47C68"
      />

      {/* Small leaf */}
      <Path
        d="M77 224C66 216 67 204 78 199C84 209 84 218 77 224Z"
        fill="#F5C84B"
      />

      <Path
        d="M77 224C78 215 80 208 85 202"
        stroke="#277A76"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}
/* =========================================================
   HOME
========================================================= */

export default function HomeScreen() {
  const router = useRouter();

  const { width, height } = useWindowDimensions();

  const isPhone = width < 700;
  const isSmallPhone = width < 390;

  const [mood, setMood] = useState<string | null>(null);

  /* =======================================================
     PAGE ENTRANCE
  ======================================================= */

  const pageOpacity = useRef(
    new Animated.Value(0)
  ).current;

  const pageScale = useRef(
    new Animated.Value(0.97)
  ).current;

  /* =======================================================
     FLOATING ELEMENTS
  ======================================================= */

  const createFloatItem = (): FloatItem => ({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    rx: new Animated.Value(0),
    ry: new Animated.Value(0),
  });

  const items = useRef(
    Array.from({ length: 12 }, createFloatItem)
  ).current;

  /* =======================================================
     RANDOMIZED START POSITIONS

     Notice how these are deliberately spread out.
     This prevents the previous "all objects travelling
     together" feeling.
  ======================================================= */

  const floatingDefinitions = useMemo<
    FloatingDefinition[]
  >(
    () => [
      {
        left: 0.08,
        top: 0.19,
        size: 46,
        type: "bubble",
      },
      {
        left: 0.84,
        top: 0.14,
        size: 22,
        type: "dot",
      },
      {
        left: 0.18,
        top: 0.39,
        size: 48,
        type: "flower",
      },
      {
        left: 0.89,
        top: 0.40,
        size: 55,
        type: "plant",
      },
      {
        left: 0.08,
        top: 0.67,
        size: 38,
        type: "heart",
      },
      {
        left: 0.91,
        top: 0.70,
        size: 35,
        type: "star",
      },
      {
        left: 0.38,
        top: 0.16,
        size: 16,
        type: "yellow",
      },
      {
        left: 0.64,
        top: 0.27,
        size: 14,
        type: "teal",
      },
      {
        left: 0.27,
        top: 0.79,
        size: 34,
        type: "ring",
      },
      {
        left: 0.72,
        top: 0.82,
        size: 28,
        type: "sparkle",
      },
      {
        left: 0.49,
        top: 0.12,
        size: 14,
        type: "dot",
      },
      {
        left: 0.52,
        top: 0.88,
        size: 18,
        type: "yellow",
      },
    ],
    []
  );

  /* =======================================================
     CURRENT PARTICLE POSITIONS

     Used only for collision calculations.
  ======================================================= */

  const particlePositions = useRef(
    floatingDefinitions.map((item) => ({
      x: width * item.left,
      y: height * item.top,
    }))
  ).current;

  const lastCollision = useRef(
    new Map<string, number>()
  );

  /* =======================================================
     PAGE ENTRANCE + RANDOM MOVEMENT
  ======================================================= */

  useEffect(() => {
    Animated.parallel([
      Animated.timing(pageOpacity, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),

      Animated.spring(pageScale, {
        toValue: 1,
        tension: 45,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    /* -------------------------------------------------------
       RANDOM MOTION

       Each particle receives different destinations,
       duration and delay.

       It never follows the same path twice.
    ------------------------------------------------------- */

    const timers: ReturnType<typeof setTimeout>[] = [];

    items.forEach((item, index) => {
      const startDelay =
        Math.random() * 1600 + index * 90;

      const animate = () => {
        const x =
          (Math.random() - 0.5) *
          width *
          (isPhone ? 0.35 : 0.55);

        const y =
          (Math.random() - 0.5) *
          height *
          (isPhone ? 0.20 : 0.32);

        const duration =
          4200 + Math.random() * 5200;

        const nextX =
          (Math.random() - 0.5) *
          width *
          (isPhone ? 0.32 : 0.55);

        const nextY =
          (Math.random() - 0.5) *
          height *
          (isPhone ? 0.22 : 0.34);

        Animated.parallel([
          Animated.timing(item.x, {
            toValue: x,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),

          Animated.timing(item.y, {
            toValue: y,
            duration: duration * 0.9,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (!finished) return;

          Animated.parallel([
            Animated.timing(item.x, {
              toValue: nextX,
              duration: duration * 0.85,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),

            Animated.timing(item.y, {
              toValue: nextY,
              duration: duration * 0.95,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]).start(({ finished: secondFinished }) => {
            if (secondFinished) {
              animate();
            }
          });
        });
      };

      const timer = setTimeout(
        animate,
        startDelay
      );

      timers.push(timer);
    });

    return () => {
      timers.forEach(clearTimeout);

      items.forEach((item) => {
        item.x.stopAnimation();
        item.y.stopAnimation();
        item.rx.stopAnimation();
        item.ry.stopAnimation();
      });
    };
  }, [
    width,
    height,
    isPhone,
  ]);

  /* =======================================================
     COLLISION ENGINE

     When particles get too close:

             particle A
                 ↓
              ← PUSH →
                 ↑
             particle B

     The repulsion is gentle rather than explosive.
  ======================================================= */

  useEffect(() => {
    const listeners: string[] = [];

    items.forEach((item, index) => {
      const listener = item.x.addListener(
        ({ value }) => {
          particlePositions[index].x =
            width * floatingDefinitions[index].left +
            value;

          checkCollisions(index);
        }
      );

      listeners.push(listener);
    });

    items.forEach((item, index) => {
      const listener = item.y.addListener(
        ({ value }) => {
          particlePositions[index].y =
            height * floatingDefinitions[index].top +
            value;

          checkCollisions(index);
        }
      );

      listeners.push(listener);
    });

    function checkCollisions(index: number) {
      const current =
        particlePositions[index];

      for (
        let otherIndex = 0;
        otherIndex < particlePositions.length;
        otherIndex++
      ) {
        if (otherIndex === index) continue;

        const other =
          particlePositions[otherIndex];

        const dx = current.x - other.x;
        const dy = current.y - other.y;

        const distance = Math.sqrt(
          dx * dx + dy * dy
        );

        const minDistance =
          isPhone ? 54 : 72;

        if (
          distance < minDistance &&
          distance > 0
        ) {
          const key =
            index < otherIndex
              ? `${index}-${otherIndex}`
              : `${otherIndex}-${index}`;

          const now = Date.now();

          const previous =
            lastCollision.current.get(key) ??
            0;

          /* prevent constant jitter */

          if (now - previous < 450) {
            continue;
          }

          lastCollision.current.set(
            key,
            now
          );

          const strength =
            (minDistance - distance) /
            minDistance;

          const pushX =
            (dx / distance) *
            strength *
            42;

          const pushY =
            (dy / distance) *
            strength *
            42;

          /* object 1 moves away */

          Animated.spring(items[index].rx, {
            toValue: pushX,
            tension: 55,
            friction: 8,
            useNativeDriver: true,
          }).start();

          Animated.spring(items[index].ry, {
            toValue: pushY,
            tension: 55,
            friction: 8,
            useNativeDriver: true,
          }).start();

          /* object 2 moves away in opposite direction */

          Animated.spring(items[otherIndex].rx, {
            toValue: -pushX,
            tension: 55,
            friction: 8,
            useNativeDriver: true,
          }).start();

          Animated.spring(items[otherIndex].ry, {
            toValue: -pushY,
            tension: 55,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      }
    }

    return () => {
      items.forEach((item, index) => {
        item.x.removeAllListeners();
        item.y.removeAllListeners();
      });
    };
  }, [
    width,
    height,
    isPhone,
  ]);

  /* =======================================================
     TOUCH / POINTER INTERACTION

     Moving your finger/mouse close to an object makes it
     gently move away.
  ======================================================= */

  const interactWithFloatingWorld = (
    locationX: number,
    locationY: number
  ) => {
    floatingDefinitions.forEach(
      (definition, index) => {
        const objectX =
          width * definition.left +
          particlePositions[index].x -
          width * definition.left;

        const objectY =
          height * definition.top +
          particlePositions[index].y -
          height * definition.top;

        const dx =
          objectX - locationX;

        const dy =
          objectY - locationY;

        const distance = Math.sqrt(
          dx * dx + dy * dy
        );

        const radius =
          isPhone ? 120 : 180;

        if (
          distance < radius &&
          distance > 0
        ) {
          const strength =
            (radius - distance) / radius;

          Animated.spring(items[index].rx, {
            toValue:
              (dx / distance) *
              strength *
              80,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }).start();

          Animated.spring(items[index].ry, {
            toValue:
              (dy / distance) *
              strength *
              80,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      }
    );
  };

  /* =======================================================
     COMBINED MOVEMENT
  ======================================================= */

  const movement = (
    item: FloatItem
  ) => ({
    transform: [
      {
        translateX: Animated.add(
          item.x,
          item.rx
        ),
      },
      {
        translateY: Animated.add(
          item.y,
          item.ry
        ),
      },
    ],
  });

  /* =======================================================
     FLOATING ELEMENT RENDERER
  ======================================================= */

  const renderFloatingElement = (
    definition: FloatingDefinition,
    index: number
  ) => {
    const item = items[index];

    const baseStyle = {
      position: "absolute" as const,
      left: width * definition.left,
      top: height * definition.top,
      zIndex: 2,
    };

    switch (definition.type) {
      case "bubble":
        return (
          <Animated.View
            key={index}
            pointerEvents="none"
            style={[
              baseStyle,
              movement(item),
              styles.bubbleLarge,
            ]}
          >
            <View
              style={styles.bubbleHighlight}
            />
          </Animated.View>
        );

      case "dot":
        return (
          <Animated.View
            key={index}
            pointerEvents="none"
            style={[
              baseStyle,
              movement(item),
              styles.floatingDot,
            ]}
          />
        );

      case "flower":
        return (
          <Animated.View
            key={index}
            pointerEvents="none"
            style={[
              baseStyle,
              movement(item),
              styles.flowerFloat,
            ]}
          >
            <View
              style={styles.flowerCenter}
            />

            <View
              style={[
                styles.petal,
                styles.petalTop,
              ]}
            />

            <View
              style={[
                styles.petal,
                styles.petalRight,
              ]}
            />

            <View
              style={[
                styles.petal,
                styles.petalBottom,
              ]}
            />

            <View
              style={[
                styles.petal,
                styles.petalLeft,
              ]}
            />
          </Animated.View>
        );

      case "plant":
        return (
          <Animated.View
            key={index}
            pointerEvents="none"
            style={[
              baseStyle,
              movement(item),
              styles.coralPlant,
            ]}
          >
            <View
              style={styles.coralStem}
            />

            <View
              style={styles.coralLeaf1}
            />

            <View
              style={styles.coralLeaf2}
            />

            <View
              style={styles.coralLeaf3}
            />
          </Animated.View>
        );

      case "heart":
        return (
          <Animated.View
            key={index}
            pointerEvents="none"
            style={[
              baseStyle,
              movement(item),
            ]}
          >
            <Text style={styles.heartText}>
              ♡
            </Text>
          </Animated.View>
        );

      case "star":
        return (
          <Animated.View
            key={index}
            pointerEvents="none"
            style={[
              baseStyle,
              movement(item),
            ]}
          >
            <Text style={styles.starText}>
              ✦
            </Text>
          </Animated.View>
        );

      case "yellow":
        return (
          <Animated.View
            key={index}
            pointerEvents="none"
            style={[
              baseStyle,
              movement(item),
              styles.yellowDot,
            ]}
          />
        );

      case "teal":
        return (
          <Animated.View
            key={index}
            pointerEvents="none"
            style={[
              baseStyle,
              movement(item),
              styles.tealDot,
            ]}
          />
        );

      case "ring":
        return (
          <Animated.View
            key={index}
            pointerEvents="none"
            style={[
              baseStyle,
              movement(item),
              styles.ring,
            ]}
          />
        );

      case "sparkle":
        return (
          <Animated.View
            key={index}
            pointerEvents="none"
            style={[
              baseStyle,
              movement(item),
            ]}
          >
            <Text style={styles.sparkleText}>
              ✧
            </Text>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  /* =======================================================
     SCREEN
  ======================================================= */

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={C.cream}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scroll
        }
      >
        {/* =================================================
            HERO
        ================================================= */}

        <Animated.View
          style={[
            styles.hero,
            isPhone && styles.heroPhone,
            {
              opacity: pageOpacity,
              transform: [
                {
                  scale: pageScale,
                },
              ],
            },
          ]}
          onPointerMove={(event) => {
            const { locationX, locationY } =
              event.nativeEvent;

            interactWithFloatingWorld(
              locationX,
              locationY
            );
          }}
          onTouchMove={(event) => {
            const { locationX, locationY } =
              event.nativeEvent;

            interactWithFloatingWorld(
              locationX,
              locationY
            );
          }}
        >
          {/* =================================================
              RANDOM FLOATING WORLD
          ================================================= */}

          {floatingDefinitions.map(
            (definition, index) =>
              renderFloatingElement(
                definition,
                index
              )
          )}

          {/* =================================================
              NAVBAR
          ================================================= */}

          <View
            style={[
              styles.navbar,
              isPhone &&
                styles.navbarPhone,
            ]}
          >
            <View style={styles.brand}>
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

            {!isPhone && (
              <View style={styles.navLinks}>
                <TouchableOpacity>
                  <Text
                    style={styles.navText}
                  >
                    About
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity>
                  <Text
                    style={styles.navText}
                  >
                    How it helps
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.navLogin}
                  onPress={() =>
                    router.push("/login")
                  }
                >
                  <Text
                    style={
                      styles.navLoginText
                    }
                  >
                    Log in
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {isPhone && (
              <TouchableOpacity
                style={styles.mobileLogin}
                onPress={() =>
                  router.push("/login")
                }
              >
                <Text
                  style={
                    styles.navLoginText
                  }
                >
                  Log in
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* =================================================
              HERO CONTENT
          ================================================= */}

          <View
            style={[
              styles.heroContent,
              isPhone &&
                styles.heroContentPhone,
            ]}
          >
            <View style={styles.pill}>
              <View style={styles.pillDot} />

              <Text style={styles.pillText}>
                A gentle space for new mothers
              </Text>
            </View>

            <Text
              style={[
                styles.title,
                isPhone &&
                  styles.titlePhone,
                isSmallPhone &&
                  styles.titleSmallPhone,
              ]}
            >
              Motherhood is a lot.
            </Text>

            <Text
              style={[
                styles.titleAccent,
                isPhone &&
                  styles.titleAccentPhone,
                isSmallPhone &&
                  styles.titleAccentSmallPhone,
              ]}
            >
              You don't have to carry it all.
            </Text>

            <Text
              style={[
                styles.subtitle,
                isPhone &&
                  styles.subtitlePhone,
              ]}
            >
              MamaMind brings your wellbeing,
              your little one and your support
              system together — in one warm
              little space.
            </Text>

            {/* =================================================
                RESPONSIVE BUTTONS
            ================================================= */}

            <View
              style={[
                styles.ctaRow,
                isPhone &&
                  styles.ctaRowPhone,
              ]}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  isPhone &&
                    styles.primaryButtonPhone,
                  pressed &&
                    styles.buttonPressed,
                ]}
                onPress={() =>
                  router.push("/role-selection")
                }
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Create an account
                </Text>

                <View
                  style={
                    styles.primaryArrow
                  }
                >
                  <Text style={styles.arrow}>
                    →
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  isPhone &&
                    styles.secondaryButtonPhone,
                  pressed &&
                    styles.buttonPressed,
                ]}
                onPress={() =>
                  router.push("/login")
                }
              >
                <Text
                  style={styles.secondaryText}
                >
                  I already have an account
                </Text>
              </Pressable>
            </View>

            {/* =================================================
                HAND-DRAWN MOTHER + BABY
            ================================================= */}

            <HandDrawnMamaBaby
              compact={isPhone}
            />
          </View>

          {/* =================================================
              LOWER MESSAGE
          ================================================= */}

          <View style={styles.heroBottom}>
            <View
              style={[
                styles.bottomCard,
                isPhone &&
                  styles.bottomCardPhone,
              ]}
            >
              <View style={styles.bottomIcon}>
                <Text
                  style={
                    styles.bottomIconText
                  }
                >
                  🌷
                </Text>
              </View>

              <View
                style={
                  styles.bottomCardText
                }
              >
                <Text
                  style={styles.bottomSmall}
                >
                  A tiny reminder
                </Text>

                <Text
                  style={styles.bottomMain}
                >
                  You deserve care too.
                </Text>
              </View>

              <Text
                style={styles.bottomArrow}
              >
                →
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* =================================================
            MOOD SECTION
        ================================================= */}

        <View
          style={[
            styles.moodSection,
            isPhone &&
              styles.moodSectionPhone,
          ]}
        >
          <View
            style={[
              styles.moodHeader,
              isPhone &&
                styles.moodHeaderPhone,
            ]}
          >
            <View>
              <Text style={styles.eyebrow}>
                JUST CHECKING IN
              </Text>

              <Text style={styles.moodTitle}>
                How are you,
                <Text
                  style={
                    styles.moodTitleAccent
                  }
                >
                  {" "}really?
                </Text>
              </Text>

              <Text
                style={styles.moodSubtitle}
              >
                No long forms. No pressure.
                Just one little moment for
                yourself.
              </Text>
            </View>

            <View style={styles.moodDecor}>
</View>

<Text
  style={[
    styles.rainbowEmoji,
    {
      fontSize: 100,
      transform: [
        { rotate: "269deg" },
        { translateX: 190 },
        { translateY: 10 },
      ],
    },
  ]}
>
  
</Text>
          </View>

          <View
            style={[
              styles.moods,
              isPhone &&
                styles.moodsPhone,
            ]}
          >
            {[
              ["😌", "Feeling Peaceful"],
              ["🙂", "Feeling    Good"],
              ["😐", "Taking It Easy"],
              ["😔", "Need Some Care"],
              ["😣", "Taking A Breath"],
            ].map(([emoji, label]) => {
              const selected =
                mood === label;

              return (
                <TouchableOpacity
                  key={label}
                  activeOpacity={0.75}
                  onPress={() =>
                    setMood(label)
                  }
                  style={[
                    styles.moodBubble,
                    selected &&
                      styles.moodSelected,
                  ]}
                >
                  <Text
                    style={
                      styles.moodEmoji
                    }
                  >
                    {emoji}
                  </Text>

                  <Text
                    style={[
                      styles.moodLabel,
                      selected &&
                        styles.moodLabelSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {mood && (
            <View
              style={styles.moodResponse}
            >
              <Text
                style={
                  styles.moodResponseText
                }
              >
                {mood === "Overwhelmed"
                  ? "That's a lot to hold. Let's take one small thing at a time. 💛"
                  : mood === "Low"
                  ? "Be gentle with yourself today. You matter too. 🌷"
                  : mood === "Okay"
                  ? "Okay is completely okay. There is no perfect version of motherhood. 🌿"
                  : "Keep that little bit of sunshine with you today. ✨"}
              </Text>
            </View>
          )}
        </View>

        {/* =================================================
            FEATURES
        ================================================= */}

        <View
          style={[
            styles.features,
            isPhone &&
              styles.featuresPhone,
          ]}
        >
          <Text style={styles.featuresHeading}>
            Everything you need.
          </Text>

          <Text
            style={styles.featuresSubheading}
          >
            Nothing you don't.
          </Text>

          <View
            style={styles.featureGrid}
          >
            <View
              style={styles.featureYellow}
            >
              <Text
                style={styles.featureNumber}
              >
                01
              </Text>

              <Text
                style={
                  styles.featureEmojiBig
                }
              >
                🌿
              </Text>

              <Text
                style={styles.featureTitle}
              >
                Your wellbeing
              </Text>

              <Text
                style={
                  styles.featureDescription
                }
              >
                Tiny self-care moments, mood
                check-ins and gentle ways to
                feel a little lighter.
              </Text>
            </View>

            <View
              style={styles.featureTeal}
            >
              <Text
                style={
                  styles.featureNumberWhite
                }
              >
                02
              </Text>

              <Text
                style={
                  styles.featureEmojiBig
                }
              >
                👶
              </Text>

              <Text
                style={
                  styles.featureTitleWhite
                }
              >
                Your little one
              </Text>

              <Text
                style={
                  styles.featureDescriptionWhite
                }
              >
                Feeding, sleep, growth,
                vaccines and all those little
                milestones.
              </Text>
            </View>

            <View
              style={styles.featureCoral}
            >
              <Text
                style={
                  styles.featureNumberWhite
                }
              >
                03
              </Text>

              <Text
                style={
                  styles.featureEmojiBig
                }
              >
                🤝
              </Text>

              <Text
                style={
                  styles.featureTitleWhite
                }
              >
                Your people
              </Text>

              <Text
                style={
                  styles.featureDescriptionWhite
                }
              >
                Give trusted people a meaningful
                way to support you without taking
                over.
              </Text>
            </View>
          </View>
        </View>

        {/* =================================================
            FOOTER
        ================================================= */}

        <View style={styles.footer}>
          <Text
            style={styles.footerFlower}
          >
            ✿
          </Text>

          <Text style={styles.footerText}>
            You are doing better than you think.
          </Text>

          <Text
            style={styles.footerHeart}
          >
            ♡
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.cream,
  },

  scroll: {
    paddingBottom: 50,
  },

  /* =======================================================
     HERO
  ======================================================= */

  hero: {
    minHeight: 760,
    backgroundColor: C.cream,
    overflow: "hidden",
    position: "relative",
    paddingHorizontal: 34,
  },

  heroPhone: {
    minHeight: 760,
    paddingHorizontal: 18,
  },

  /* =======================================================
     NAV
  ======================================================= */

  navbar: {
    height: 82,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 30,
  },

  navbarPhone: {
    height: 68,
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
  },

  brandMark: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: C.teal,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "-7deg" }],
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

  navLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 25,
  },

  navText: {
    color: C.muted,
    fontSize: 12,
    fontWeight: "600",
  },

  navLogin: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: "#D9E9E6",
    borderRadius: 30,
    paddingHorizontal: 19,
    paddingVertical: 10,
  },

  mobileLogin: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: "#D9E9E6",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },

  navLoginText: {
    color: C.deepTeal,
    fontSize: 12,
    fontWeight: "800",
  },

  /* =======================================================
     HERO CONTENT
  ======================================================= */

  heroContent: {
    alignItems: "center",
    zIndex: 10,
    paddingTop: 20,
  },

  heroContentPhone: {
    paddingTop: 14,
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.paleTeal,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#D0EFEB",
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
    fontSize: 11,
    fontWeight: "700",
  },

  title: {
    color: C.dark,
    fontSize: 58,
    lineHeight: 62,
    fontWeight: "900",
    letterSpacing: -2,
    textAlign: "center",
    marginTop: 23,
  },

  titlePhone: {
    fontSize: 39,
    lineHeight: 43,
    letterSpacing: -1.2,
    marginTop: 19,
  },

  titleSmallPhone: {
    fontSize: 34,
    lineHeight: 38,
  },

  titleAccent: {
    color: C.deepTeal,
    fontSize: 58,
    lineHeight: 62,
    fontWeight: "900",
    letterSpacing: -2,
    textAlign: "center",
    maxWidth: 780,
  },

  titleAccentPhone: {
    fontSize: 30,
    lineHeight: 35,
    letterSpacing: -0.8,
    maxWidth: 350,
  },

  titleAccentSmallPhone: {
    fontSize: 27,
    lineHeight: 32,
  },

  subtitle: {
    color: C.muted,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 520,
    marginTop: 17,
  },

  subtitlePhone: {
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 350,
    paddingHorizontal: 8,
  },

  /* =======================================================
     CTA
  ======================================================= */

  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 23,
    gap: 12,
  },

  ctaRowPhone: {
   width: "100%",
   flexDirection: "row",
   alignItems: "center",
   justifyContent: "center",
   marginTop: 20,
   gap: 8,
  },

  primaryButton: {
    height: 54,
    backgroundColor: C.deepTeal,
    borderRadius: 27,
    paddingLeft: 22,
    paddingRight: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: C.deepTeal,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 5,
  },

  primaryButtonPhone: {
   flex: 2,
   maxWidth: 190,
  },

  primaryButtonText: {
  color: C.white,
  fontSize: 13,
  fontWeight: "800",
  transform: [
    { translateX: -6 },
    { translateY: -1 },
  ],
},

  primaryArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.yellow,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 1,
    transform: [
    { translateX: -3 },
    { translateY: -1 },
   ],
  },

  arrow: {
    color: C.deepTeal,
    fontSize: 20,
    fontWeight: "900",
  },

  secondaryButton: {
    height: 54,
    paddingHorizontal: 17,
    borderRadius: 27,
    backgroundColor: C.white,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E1E9E6",
  },

  secondaryButtonPhone: {
   flex: 2,
   maxWidth: 180,
   textAlign: "center",
   paddingHorizontal: 5,
  },

  secondaryText: {
    color: C.deepTeal,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: -8,
    fontWeight: "700",
    transform: [
    { translateX: -3 },
    { translateY: -1 },
   ],
  },

  buttonPressed: {
    transform: [{ scale: 0.90 }],
  },

  /* =======================================================
     HAND DRAWN ILLUSTRATION
  ======================================================= */

  handDrawnScene: {
    width: 420,
    height: 280,
    marginTop: 6,
    alignSelf: "center",
  },

  handDrawnScenePhone: {
    width: "100%",
    maxWidth: 390,
    height: 250,
    marginTop: 5,
  },

  /* =======================================================
     FLOATING OBJECTS
  ======================================================= */

  bubbleLarge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 3,
    borderColor: C.teal,
    backgroundColor: "#FFFFFF66",
  },

  bubbleHighlight: {
    position: "absolute",
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: C.white,
    left: 9,
    top: 8,
  },

  floatingDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.coral,
    opacity: 0.75,
  },

  flowerFloat: {
    width: 54,
    height: 54,
  },

  flowerCenter: {
    position: "absolute",
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: C.yellow,
    left: 19,
    top: 19,
    zIndex: 3,
  },

  petal: {
    position: "absolute",
    width: 27,
    height: 20,
    borderRadius: 15,
    backgroundColor: C.coral,
  },

  petalTop: {
    top: 0,
    left: 14,
  },

  petalRight: {
    right: 0,
    top: 16,
    transform: [{ rotate: "70deg" }],
  },

  petalBottom: {
    bottom: 0,
    left: 14,
  },

  petalLeft: {
    left: 0,
    top: 16,
    transform: [{ rotate: "-70deg" }],
  },

  coralPlant: {
    width: 60,
    height: 100,
  },

  coralStem: {
    position: "absolute",
    width: 8,
    height: 90,
    backgroundColor: C.teal,
    borderRadius: 8,
    left: 27,
    bottom: 0,
    transform: [{ rotate: "-5deg" }],
  },

  coralLeaf1: {
    position: "absolute",
    width: 35,
    height: 15,
    borderRadius: 20,
    backgroundColor: C.teal,
    left: 0,
    top: 42,
    transform: [{ rotate: "-35deg" }],
  },

  coralLeaf2: {
    position: "absolute",
    width: 35,
    height: 15,
    borderRadius: 20,
    backgroundColor: C.teal,
    right: 0,
    top: 24,
    transform: [{ rotate: "35deg" }],
  },

  coralLeaf3: {
    position: "absolute",
    width: 30,
    height: 14,
    borderRadius: 20,
    backgroundColor: C.deepTeal,
    right: 2,
    top: 58,
    transform: [{ rotate: "35deg" }],
  },

  heartText: {
    color: C.coral,
    fontSize: 53,
    fontWeight: "300",
  },

  starText: {
    color: C.coral,
    fontSize: 37,
  },

  yellowDot: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: C.yellow,
  },

  tealDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: C.teal,
  },

  ring: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 4,
    borderColor: C.yellow,
  },

  sparkleText: {
    color: C.deepTeal,
    fontSize: 32,
  },

  /* =======================================================
     BOTTOM CARD
  ======================================================= */

  heroBottom: {
    width: "100%",
    alignItems: "center",
    marginTop: -5,
    zIndex: 15,
  },

  bottomCard: {
    width: "92%",
    maxWidth: 500,
    minHeight: 75,
    backgroundColor: C.white,
    borderRadius: 25,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: C.dark,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 3,
  },

  bottomCardPhone: {
    width: "100%",
  },

  bottomIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF0EF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  bottomIconText: {
    fontSize: 23,
  },

  bottomCardText: {
    flex: 1,
  },

  bottomSmall: {
    color: C.coral,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  bottomMain: {
    color: C.dark,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 3,
  },

  bottomArrow: {
    color: C.deepTeal,
    fontSize: 24,
    fontWeight: "800",
    paddingRight: 7,
  },

  /* =======================================================
     MOOD
  ======================================================= */

  moodSection: {
    backgroundColor: C.deepTeal,
    marginHorizontal: 24,
    marginTop: 60,
    borderRadius: 38,
    padding: 30,
    overflow: "hidden",
  },

  moodSectionPhone: {
    marginHorizontal: 14,
    marginTop: 45,
    borderRadius: 37,
    padding: 21,
  },

  moodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  moodHeaderPhone: {
    flexDirection: "column",
  },

  eyebrow: {
    color: C.yellow,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.7,
    marginBottom: 6,
  },

  moodTitle: {
    color: C.white,
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: -1,
  },

  moodTitleAccent: {
    color: C.yellow,
  },

  moodSubtitle: {
    color: "#C9E8E5",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 8,
    maxWidth: 410,
  },

 

  moods: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 0,
  },

  moodsPhone: {
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
  },

  moodBubble: {
    width: 59,
    minHeight: 65,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 2,
  },

  moodSelected: {
    backgroundColor: C.yellow,
  },

  moodEmoji: {
    fontSize: 37,
  },

  moodLabel: {
    color: "#C7E6E4",
    fontSize: 8,
    textAlign: "center",
    marginTop: 4,
    fontWeight: "700",
  },

  moodLabelSelected: {
    color: C.dark,
  },

  moodResponse: {
    marginTop: 17,
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 13,
  },

  moodResponseText: {
    color: C.deepTeal,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    fontWeight: "700",
  },

  /* =======================================================
     FEATURES
  ======================================================= */

  features: {
    marginHorizontal: 24,
    marginTop: 65,
  },

  featuresPhone: {
    marginHorizontal: 18,
    marginTop: 48,
  },

  featuresHeading: {
    color: C.dark,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -1,
  },

  featuresSubheading: {
    color: C.teal,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -1,
    marginTop: -3,
  },

  featureGrid: {
    marginTop: 25,
    gap: 14,
  },

  featureYellow: {
    backgroundColor: C.yellow,
    minHeight: 230,
    borderRadius: 32,
    padding: 22,
  },

  featureTeal: {
    backgroundColor: C.teal,
    minHeight: 230,
    borderRadius: 32,
    padding: 22,
  },

  featureCoral: {
    backgroundColor: C.coral,
    minHeight: 230,
    borderRadius: 32,
    padding: 22,
  },

  featureNumber: {
    color: C.deepTeal,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  featureNumberWhite: {
    color: "#FFFFFFCC",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  featureEmojiBig: {
    fontSize: 43,
    marginTop: 17,
  },

  featureTitle: {
    color: C.dark,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 11,
  },

  featureTitleWhite: {
    color: C.white,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 11,
  },

  featureDescription: {
    color: "#526E6E",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },

  featureDescriptionWhite: {
    color: "#E7FAF8",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
  },

  /* =======================================================
     FOOTER
  ======================================================= */

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 55,
    marginBottom: 20,
  },

  footerFlower: {
    color: C.coral,
    fontSize: 22,
    marginRight: 9,
  },

  footerText: {
    color: C.deepTeal,
    fontSize: 12,
    fontWeight: "800",
  },

  footerHeart: {
    color: C.coral,
    fontSize: 24,
    marginLeft: 9,
  },
});