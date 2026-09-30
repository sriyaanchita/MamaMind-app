import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

/* =====================================================
   MAMAMIND COLOUR PALETTE
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
   FLOATING ELEMENT TYPES
===================================================== */

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

  // Physics values
  vx: number;
  vy: number;
  radius: number;
};


/* =====================================================
   FLOATING ELEMENT DEFINITIONS

   Initial positions are spread around the page.
===================================================== */

const floatingDefinitions: FloatDefinition[] = [
  {
    type: "bubble",
    left: 0.04,
    top: 0.06,
    size: 44,
    color: C.yellow,
  },

  {
    type: "dot",
    left: 0.88,
    top: 0.04,
    size: 17,
    color: C.coral,
  },

  {
    type: "heart",
    left: 0.07,
    top: 0.16,
    size: 34,
    color: C.teal,
  },

  {
    type: "ring",
    left: 0.90,
    top: 0.15,
    size: 34,
    color: C.yellow,
  },

  {
    type: "star",
    left: 0.03,
    top: 0.28,
    size: 31,
    color: C.coral,
  },

  {
    type: "bubble",
    left: 0.90,
    top: 0.30,
    size: 48,
    color: C.teal,
  },

  {
    type: "dot",
    left: 0.14,
    top: 0.40,
    size: 14,
    color: C.yellow,
  },

  {
    type: "ring",
    left: 0.83,
    top: 0.43,
    size: 27,
    color: C.coral,
  },

  {
    type: "heart",
    left: 0.06,
    top: 0.54,
    size: 29,
    color: C.yellow,
  },

  {
    type: "star",
    left: 0.90,
    top: 0.58,
    size: 27,
    color: C.deepTeal,
  },

  {
    type: "dot",
    left: 0.15,
    top: 0.70,
    size: 13,
    color: C.teal,
  },

  {
    type: "ring",
    left: 0.88,
    top: 0.76,
    size: 24,
    color: C.yellow,
  },
];


/* =====================================================
   GET APPROXIMATE RADIUS
===================================================== */

const getRadius = (definition: FloatDefinition) => {
  if (definition.type === "heart" || definition.type === "star") {
    return definition.size * 0.45;
  }

  return definition.size / 2;
};


/* =====================================================
   FLOATING SHAPE
===================================================== */

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
              opacity: 0.78,
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
          width: definition.size,
          height: definition.size,

          transform: [
            {
              translateX: item.x,
            },
            {
              translateY: item.y,
            },
            {
              scale: item.scale,
            },
            {
              rotate: item.rotate.interpolate({
                inputRange: [-1, 1],
                outputRange: ["-12deg", "12deg"],
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


/* =====================================================
   FATHER DASHBOARD
===================================================== */

export default function FatherDashboard() {
  const [contentHeight, setContentHeight] = useState(
    height * 2.5
  );

  /* ===================================================
     FLOATING ITEMS
  =================================================== */

  const floatingItems = useRef<FloatItem[]>(
    floatingDefinitions.map((definition) => ({
      x: new Animated.Value(
        width * definition.left
      ),

      y: new Animated.Value(
        height * definition.top
      ),

      scale: new Animated.Value(1),

      rotate: new Animated.Value(0),

      vx:
        (Math.random() > 0.5 ? 1 : -1) *
        (0.18 + Math.random() * 0.20),

      vy:
        (Math.random() > 0.5 ? 1 : -1) *
        (0.14 + Math.random() * 0.20),

      radius: getRadius(definition),
    }))
  ).current;


  /* ===================================================
     CURRENT PHYSICS POSITIONS

     These are kept separately from Animated.Value so
     collision calculations don't depend on the UI.
  =================================================== */

  const physicsPositions = useRef(
    floatingDefinitions.map((definition) => ({
      x: width * definition.left,
      y: height * definition.top,
    }))
  ).current;


  /* ===================================================
     ANIMATION FRAME
  =================================================== */

  const animationFrame = useRef<number | null>(null);

  const lastTime = useRef<number | null>(null);


  /* ===================================================
     FLOATING PHYSICS ENGINE
  =================================================== */

  useEffect(() => {
    let mounted = true;

    const animate = (timestamp: number) => {
      if (!mounted) return;

      if (lastTime.current === null) {
        lastTime.current = timestamp;
      }

      let delta =
        (timestamp - lastTime.current) / 16.67;

      /*
        Prevent a huge jump if the phone temporarily
        pauses the animation.
      */
      delta = Math.min(delta, 2);

      lastTime.current = timestamp;

      const maxX = width;
      const maxY = Math.max(
        contentHeight,
        height
      );

      /* =============================================
         MOVE EACH ELEMENT
      ============================================= */

      floatingItems.forEach((item, index) => {
        const definition =
          floatingDefinitions[index];

        const position =
          physicsPositions[index];

        const radius = item.radius;

        /*
          Move
        */

        position.x += item.vx * delta * 2.5;
        position.y += item.vy * delta * 2.5;


        /* =========================================
           WALL COLLISION - LEFT
        ========================================= */

        if (position.x - radius <= 0) {
          position.x = radius;

          item.vx =
            Math.abs(item.vx) *
            (0.96 + Math.random() * 0.08);
        }


        /* =========================================
           WALL COLLISION - RIGHT
        ========================================= */

        if (position.x + radius >= maxX) {
          position.x = maxX - radius;

          item.vx =
            -Math.abs(item.vx) *
            (0.96 + Math.random() * 0.08);
        }


        /* =========================================
           WALL COLLISION - TOP
        ========================================= */

        if (position.y - radius <= 0) {
          position.y = radius;

          item.vy =
            Math.abs(item.vy) *
            (0.96 + Math.random() * 0.08);
        }


        /* =========================================
           WALL COLLISION - BOTTOM
        ========================================= */

        if (position.y + radius >= maxY) {
          position.y = maxY - radius;

          item.vy =
            -Math.abs(item.vy) *
            (0.96 + Math.random() * 0.08);
        }


        /* =========================================
           KEEP A LITTLE RANDOMNESS IN THE MOTION

           This prevents the objects from becoming
           perfectly predictable.
        ========================================= */

        if (Math.random() < 0.003) {
          item.vx +=
            (Math.random() - 0.5) * 0.08;

          item.vy +=
            (Math.random() - 0.5) * 0.08;
        }


        /* =========================================
           SPEED LIMIT
        ========================================= */

        const speed = Math.sqrt(
          item.vx * item.vx +
            item.vy * item.vy
        );

        const minSpeed = 0.18;
        const maxSpeed = 0.48;

        if (speed < minSpeed) {
          const angle =
            Math.atan2(item.vy, item.vx) +
            (Math.random() - 0.5) * 0.5;

          item.vx =
            Math.cos(angle) * minSpeed;

          item.vy =
            Math.sin(angle) * minSpeed;
        }

        if (speed > maxSpeed) {
          item.vx =
            (item.vx / speed) * maxSpeed;

          item.vy =
            (item.vy / speed) * maxSpeed;
        }
      });


      /* =============================================
         ELEMENT ↔ ELEMENT COLLISIONS
      ============================================= */

      for (
        let i = 0;
        i < floatingItems.length;
        i++
      ) {
        for (
          let j = i + 1;
          j < floatingItems.length;
          j++
        ) {
          const a =
            floatingItems[i];

          const b =
            floatingItems[j];

          const posA =
            physicsPositions[i];

          const posB =
            physicsPositions[j];

          const dx =
            posB.x - posA.x;

          const dy =
            posB.y - posA.y;

          const distance =
            Math.sqrt(dx * dx + dy * dy);

          const minimumDistance =
            a.radius +
            b.radius +
            3;


          if (
            distance > 0 &&
            distance < minimumDistance
          ) {
            /*
              Normalized collision direction
            */

            const nx = dx / distance;
            const ny = dy / distance;

            /*
              Push the two elements apart
            */

            const overlap =
              minimumDistance - distance;

            posA.x -=
              nx * overlap * 0.5;

            posA.y -=
              ny * overlap * 0.5;

            posB.x +=
              nx * overlap * 0.5;

            posB.y +=
              ny * overlap * 0.5;


            /*
              Exchange velocity along the
              collision direction.
            */

            const relativeVelocity =
              (b.vx - a.vx) * nx +
              (b.vy - a.vy) * ny;


            /*
              Only bounce if they are moving
              toward each other.
            */

            if (relativeVelocity < 0) {
              const bounceStrength = 1.05;

              a.vx +=
                nx *
                relativeVelocity *
                bounceStrength;

              a.vy +=
                ny *
                relativeVelocity *
                bounceStrength;

              b.vx -=
                nx *
                relativeVelocity *
                bounceStrength;

              b.vy -=
                ny *
                relativeVelocity *
                bounceStrength;
            }
          }
        }
      }


      /* =============================================
         UPDATE NATIVE ANIMATED VALUES
      ============================================= */

      floatingItems.forEach(
        (item, index) => {
          const position =
            physicsPositions[index];

          /*
            Animated.Value contains the absolute
            position of the object.
          */

          item.x.setValue(position.x);
          item.y.setValue(position.y);

          /*
            Very subtle breathing effect.
          */

          const breathing =
            1 +
            Math.sin(
              timestamp / 900 +
                index
            ) *
              0.025;

          item.scale.setValue(
            breathing
          );

          /*
            Gentle rotation based on direction.
          */

          const rotation =
            Math.max(
              -1,
              Math.min(
                1,
                item.vx * 3
              )
            );

          item.rotate.setValue(
            rotation
          );
        }
      );


      animationFrame.current =
        requestAnimationFrame(animate);
    };


    animationFrame.current =
      requestAnimationFrame(animate);


    return () => {
      mounted = false;

      if (
        animationFrame.current !== null
      ) {
        cancelAnimationFrame(
          animationFrame.current
        );
      }

      lastTime.current = null;
    };
  }, [contentHeight]);


  /* ===================================================
     RESET PHYSICS WHEN CONTENT SIZE CHANGES
  =================================================== */

  const handleContentSizeChange = (
    _contentWidth: number,
    newHeight: number
  ) => {
    const usableHeight =
      Math.max(
        newHeight,
        height
      );

    setContentHeight(
      usableHeight
    );
  };


  /* ===================================================
     MAIN UI
  =================================================== */

  return (
    <View style={styles.screen}>

      {/* =================================================
          MAIN SCROLL VIEW
      ================================================= */}

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={
          handleContentSizeChange
        }
        contentContainerStyle={
          styles.content
        }
      >

        {/* =================================================
            FLOATING BACKGROUND

            IMPORTANT:
            It is INSIDE the ScrollView content so
            the floating elements can travel through
            the entire dashboard.
        ================================================= */}

        <View
          pointerEvents="none"
          style={[
            styles.floatingLayer,
            {
              width,
              height: contentHeight,
            },
          ]}
        >
          {floatingDefinitions.map(
            (
              definition,
              index
            ) => (
              <FloatingShape
                key={index}
                definition={
                  definition
                }
                item={
                  floatingItems[index]
                }
              />
            )
          )}
        </View>


        {/* =================================================
            HEADER
        ================================================= */}

        <View style={styles.header}>

          <View style={styles.headerText}>
            <Text style={styles.greeting}>
              GOOD MORNING, DAD
            </Text>

            <Text style={styles.heading}>
              You’re part of her{"\n"}
              <Text style={styles.headingAccent}>
                support system.
              </Text>
            </Text>

            <Text style={styles.subtitle}>
              A little help, a little care,{"\n"}
              can make a big difference.
            </Text>
          </View>

          <View style={styles.profileCircle}>
            <Text style={styles.profileEmoji}>
              👨🏻
            </Text>
          </View>

        </View>


        {/* =================================================
            SUPPORT STREAK
        ================================================= */}

        <View style={styles.streakCard}>

          <View style={styles.streakLeft}>

            <View style={styles.streakIcon}>
              <Text style={styles.streakEmoji}>
                ⭐
              </Text>
            </View>

            <View>
              <Text style={styles.streakLabel}>
                YOUR SUPPORT STREAK
              </Text>

              <Text style={styles.streakTitle}>
                3 days of showing up
              </Text>
            </View>

          </View>

          <View style={styles.streakNumber}>
            <Text style={styles.streakNumberText}>
              3
            </Text>

            <Text style={styles.streakDays}>
              DAYS
            </Text>
          </View>

        </View>


        {/* =================================================
            TODAY'S SUPPORT
        ================================================= */}

        <View style={styles.supportCard}>

          <View style={styles.supportTop}>

            <View>
              <Text style={styles.cardEyebrow}>
                TODAY'S SUPPORT
              </Text>

              <Text style={styles.supportTitle}>
                How can you help today?
              </Text>
            </View>

            <View style={styles.sunCircle}>
              <Text style={styles.sunEmoji}>
                ☀️
              </Text>
            </View>

          </View>

          <Text style={styles.supportText}>
            Small things count. Pick something you
            can take off Mama's plate today.
          </Text>

          <Pressable
            style={styles.checkButton}
            onPress={() =>
              router.push("/support")
            }
          >
            <Text style={styles.checkButtonText}>
              I'm here to help  →
            </Text>
          </Pressable>

        </View>


        {/* =================================================
            MAMA CHECK-IN
        ================================================= */}

        <View style={styles.sectionHeader}>

          <Text style={styles.sectionTitle}>
            MAMA CHECK-IN
          </Text>

          <Text style={styles.sectionHint}>
            Be there for her
          </Text>

        </View>


        <Pressable
          style={styles.mamaCard}
          onPress={() =>
            router.push("/support")
          }
        >

          <View style={styles.mamaIcon}>
            <Text style={styles.mamaEmoji}>
              💚
            </Text>
          </View>

          <View style={styles.mamaInfo}>

            <Text style={styles.mamaTitle}>
              How is Mama feeling?
            </Text>

            <Text style={styles.mamaText}>
              A simple check-in can mean more
              than you think.
            </Text>

          </View>

          <View style={styles.mamaButton}>
            <Text style={styles.mamaButtonText}>
              Check
            </Text>
          </View>

        </Pressable>


        {/* =================================================
            QUICK SUPPORT
        ================================================= */}

        <View style={styles.sectionHeader}>

          <Text style={styles.sectionTitle}>
            QUICK SUPPORT
          </Text>

          <Text style={styles.sectionHint}>
            Little things matter
          </Text>

        </View>


        <View style={styles.actionGrid}>

          {/* CHECK MAMA */}

          <Pressable
            style={styles.actionCard}
            onPress={() =>
              router.push("/support")
            }
          >

            <View
              style={[
                styles.actionIcon,
                {
                  backgroundColor:
                    C.paleTeal,
                },
              ]}
            >
              <Text style={styles.actionEmoji}>
                💚
              </Text>
            </View>

            <Text style={styles.actionTitle}>
              Check on Mama
            </Text>

            <Text style={styles.actionText}>
              See how she is feeling
            </Text>

          </Pressable>


          {/* BABY */}

          <Pressable
            style={styles.actionCard}
            onPress={() =>
              router.push("/baby-dashboard")
            }
          >

            <View
              style={[
                styles.actionIcon,
                {
                  backgroundColor:
                    C.yellow,
                },
              ]}
            >
              <Text style={styles.actionEmoji}>
                👶
              </Text>
            </View>

            <Text style={styles.actionTitle}>
              Baby Space
            </Text>

            <Text style={styles.actionText}>
              Feeding, sleep & milestones
            </Text>

          </Pressable>


          {/* TASKS */}

          <Pressable
            style={styles.actionCard}
            onPress={() =>
              router.push("/daily-care")
            }
          >

            <View
              style={[
                styles.actionIcon,
                {
                  backgroundColor:
                    C.coral,
                },
              ]}
            >
              <Text style={styles.actionEmoji}>
                🤝
              </Text>
            </View>

            <Text style={styles.actionTitle}>
              Shared Tasks
            </Text>

            <Text style={styles.actionText}>
              See what needs doing
            </Text>

          </Pressable>


          {/* ENCOURAGEMENT */}

          <Pressable
            style={styles.actionCard}
            onPress={() =>
              router.push("/support")
            }
          >

            <View
              style={[
                styles.actionIcon,
                {
                  backgroundColor:
                    C.paleTeal,
                },
              ]}
            >
              <Text style={styles.actionEmoji}>
                💌
              </Text>
            </View>

            <Text style={styles.actionTitle}>
              Encourage Mama
            </Text>

            <Text style={styles.actionText}>
              Send a little love
            </Text>

          </Pressable>

        </View>


        {/* =================================================
            ONE THING FOR MAMA
        ================================================= */}

        <View style={styles.oneThingCard}>

          <View style={styles.oneThingTop}>

            <View>
              <Text style={styles.oneThingEyebrow}>
                ONE THING FOR MAMA
              </Text>

              <Text style={styles.oneThingTitle}>
                Give her 20 minutes today.
              </Text>
            </View>

            <View style={styles.coralCircle}>
              <Text style={styles.coralEmoji}>
                🌷
              </Text>
            </View>

          </View>

          <Text style={styles.oneThingText}>
            Take the baby for a little while so
            Mama can shower, rest, eat or simply
            breathe.
          </Text>

          <Pressable
            style={styles.doneButton}
            onPress={() =>
              router.push("/daily-care")
            }
          >
            <Text style={styles.doneButtonText}>
              I'll take this one  →
            </Text>
          </Pressable>

        </View>


        {/* =================================================
            BABY TODAY
        ================================================= */}

        <View style={styles.sectionHeader}>

          <Text style={styles.sectionTitle}>
            BABY TODAY
          </Text>

          <Text style={styles.sectionHint}>
            Your little one
          </Text>

        </View>


        <View style={styles.babyCard}>

          <View style={styles.babyIllustration}>
            <Text style={styles.babyEmoji}>
              👶🏻
            </Text>
          </View>

          <View style={styles.babyInfo}>

            <Text style={styles.babyTitle}>
              Keep up with the little things.
            </Text>

            <Text style={styles.babyText}>
              Feeding, sleep, growth and those
              tiny everyday moments.
            </Text>

            <Pressable
              onPress={() =>
                router.push(
                  "/baby-dashboard"
                )
              }
            >
              <Text style={styles.linkText}>
                Open Baby Space  →
              </Text>
            </Pressable>

          </View>

        </View>


        {/* =================================================
            DAD + BABY BONDING
        ================================================= */}

        <View style={styles.bondingCard}>

          <View style={styles.bondingHeader}>

            <View>
              <Text style={styles.bondingEyebrow}>
                DAD + BABY
              </Text>

              <Text style={styles.bondingTitle}>
                A little bonding idea
              </Text>
            </View>

            <View style={styles.bondingIcon}>
              <Text style={styles.bondingEmoji}>
                👨‍👦
              </Text>
            </View>

          </View>

          <Text style={styles.bondingText}>
            Hold your little one close, talk to
            them, sing a silly song or simply spend
            five quiet minutes together.
          </Text>

          <View style={styles.bondingTip}>
            <Text style={styles.bondingTipText}>
              ✦ Your baby doesn't need perfect.
              They just need you.
            </Text>
          </View>

        </View>


        {/* =================================================
            SUPPORT REMINDER
        ================================================= */}

        <View style={styles.reminderCard}>

          <View style={styles.reminderIcon}>
            <Text style={styles.heart}>
              ♥
            </Text>
          </View>

          <View style={styles.reminderContent}>

            <Text style={styles.reminderLabel}>
              A LITTLE REMINDER
            </Text>

            <Text style={styles.reminderText}>
              You don't have to fix everything.
              Sometimes being there is enough.
            </Text>

          </View>

        </View>


        {/* =================================================
            FOOTER
        ================================================= */}

        <Text style={styles.footer}>
          MamaMind • Together, one little step at a time.
        </Text>

      </ScrollView>
    </View>
  );
}


/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({

  screen: {
    flex: 1,
    backgroundColor: C.cream,
  },

  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 55,

    /*
      Important:
      This lets the floating layer occupy the
      complete ScrollView content.
    */
    position: "relative",
  },


  /* =================================================
     FLOATING BACKGROUND
  ================================================= */

  floatingLayer: {
    position: "absolute",
    top: 0,
    left: 0,

    zIndex: 0,

    overflow: "hidden",

    /*
      Prevent the floating objects from affecting
      touch interaction.
    */
    pointerEvents: "none",
  },

  floatingElement: {
    position: "absolute",

    alignItems: "center",
    justifyContent: "center",

    zIndex: 0,
  },

  floatHeart: {
    fontWeight: "800",
  },

  floatStar: {
    fontWeight: "800",
  },


  /* =================================================
     HEADER
  ================================================= */

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",

    marginTop: 35,
    marginBottom: 22,

    zIndex: 2,
  },

  headerText: {
    flex: 1,
  },

  greeting: {
    color: C.deepTeal,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.8,
    marginBottom: 8,
  },

  heading: {
    color: C.dark,
    fontSize: 31,
    lineHeight: 36,
    fontWeight: "900",
    letterSpacing: -1,
  },

  headingAccent: {
    color: C.deepTeal,
  },

  subtitle: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },

  profileCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,

    backgroundColor: C.yellow,

    justifyContent: "center",
    alignItems: "center",

    marginLeft: 10,
  },

  profileEmoji: {
    fontSize: 30,
  },


  /* =================================================
     STREAK
  ================================================= */

  streakCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 14,
    marginBottom: 18,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    borderWidth: 1,
    borderColor: "#E5ECE9",

    zIndex: 2,
  },

  streakLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  streakIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,

    backgroundColor: C.yellow,

    justifyContent: "center",
    alignItems: "center",

    marginRight: 12,
  },

  streakEmoji: {
    fontSize: 20,
  },

  streakLabel: {
    color: C.muted,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.1,
  },

  streakTitle: {
    color: C.dark,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 4,
  },

  streakNumber: {
    width: 48,
    height: 48,
    borderRadius: 18,

    backgroundColor: C.paleTeal,

    justifyContent: "center",
    alignItems: "center",
  },

  streakNumberText: {
    color: C.deepTeal,
    fontSize: 18,
    fontWeight: "900",
  },

  streakDays: {
    color: C.muted,
    fontSize: 6,
    fontWeight: "900",
  },


  /* =================================================
     SUPPORT CARD
  ================================================= */

  supportCard: {
    backgroundColor: C.deepTeal,
    borderRadius: 30,
    padding: 22,
    marginBottom: 27,

    zIndex: 2,
  },

  supportTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardEyebrow: {
    color: C.yellow,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 5,
  },

  supportTitle: {
    color: C.white,
    fontSize: 20,
    fontWeight: "900",
  },

  sunCircle: {
    width: 45,
    height: 45,
    borderRadius: 23,

    backgroundColor: C.yellow,

    justifyContent: "center",
    alignItems: "center",
  },

  sunEmoji: {
    fontSize: 22,
  },

  supportText: {
    color: "#C9E8E5",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 13,
  },

  checkButton: {
    height: 47,
    borderRadius: 24,

    backgroundColor: C.yellow,

    justifyContent: "center",
    alignItems: "center",

    marginTop: 18,
  },

  checkButtonText: {
    color: C.dark,
    fontSize: 13,
    fontWeight: "900",
  },


  /* =================================================
     SECTION
  ================================================= */

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    marginBottom: 13,

    zIndex: 2,
  },

  sectionTitle: {
    color: C.dark,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  sectionHint: {
    color: C.muted,
    fontSize: 10,
  },


  /* =================================================
     MAMA CHECK
  ================================================= */

  mamaCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 15,
    marginBottom: 26,

    flexDirection: "row",
    alignItems: "center",

    borderWidth: 1,
    borderColor: "#E5ECE9",

    zIndex: 2,
  },

  mamaIcon: {
    width: 49,
    height: 49,
    borderRadius: 17,

    backgroundColor: C.paleTeal,

    justifyContent: "center",
    alignItems: "center",

    marginRight: 12,
  },

  mamaEmoji: {
    fontSize: 22,
  },

  mamaInfo: {
    flex: 1,
  },

  mamaTitle: {
    color: C.dark,
    fontSize: 13,
    fontWeight: "900",
  },

  mamaText: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  mamaButton: {
    backgroundColor: C.yellow,

    paddingHorizontal: 14,

    height: 37,
    borderRadius: 19,

    justifyContent: "center",
    alignItems: "center",
  },

  mamaButtonText: {
    color: C.dark,
    fontSize: 10,
    fontWeight: "900",
  },


  /* =================================================
     QUICK ACTIONS
  ================================================= */

  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",

    marginBottom: 15,

    zIndex: 2,
  },

  actionCard: {
    width: "48%",

    backgroundColor: C.white,

    borderRadius: 22,

    padding: 15,

    marginBottom: 12,

    borderWidth: 1,
    borderColor: "#E5ECE9",
  },

  actionIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,

    justifyContent: "center",
    alignItems: "center",

    marginBottom: 12,
  },

  actionEmoji: {
    fontSize: 21,
  },

  actionTitle: {
    color: C.dark,
    fontSize: 13,
    fontWeight: "900",
  },

  actionText: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },


  /* =================================================
     ONE THING
  ================================================= */

  oneThingCard: {
    backgroundColor: C.yellow,

    borderRadius: 27,

    padding: 20,

    marginBottom: 25,

    zIndex: 2,
  },

  oneThingTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  oneThingEyebrow: {
    color: C.deepTeal,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 5,
  },

  oneThingTitle: {
    color: C.dark,
    fontSize: 18,
    fontWeight: "900",
    maxWidth: 245,
  },

  coralCircle: {
    width: 47,
    height: 47,
    borderRadius: 24,

    backgroundColor: C.white,

    justifyContent: "center",
    alignItems: "center",
  },

  coralEmoji: {
    fontSize: 22,
  },

  oneThingText: {
    color: C.dark,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 13,
  },

  doneButton: {
    height: 43,
    borderRadius: 22,

    backgroundColor: C.white,

    justifyContent: "center",
    alignItems: "center",

    marginTop: 16,
  },

  doneButtonText: {
    color: C.deepTeal,
    fontSize: 11,
    fontWeight: "900",
  },


  /* =================================================
     BABY
  ================================================= */

  babyCard: {
    backgroundColor: C.white,

    borderRadius: 27,

    padding: 18,

    flexDirection: "row",
    alignItems: "center",

    borderWidth: 1,
    borderColor: "#E5ECE9",

    marginBottom: 20,

    zIndex: 2,
  },

  babyIllustration: {
    width: 80,
    height: 80,
    borderRadius: 24,

    backgroundColor: C.yellow,

    justifyContent: "center",
    alignItems: "center",

    marginRight: 16,
  },

  babyEmoji: {
    fontSize: 42,
  },

  babyInfo: {
    flex: 1,
  },

  babyTitle: {
    color: C.dark,
    fontSize: 16,
    fontWeight: "900",
  },

  babyText: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 5,
  },

  linkText: {
    color: C.deepTeal,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 9,
  },


  /* =================================================
     DAD + BABY BONDING
  ================================================= */

  bondingCard: {
    backgroundColor: C.paleTeal,

    borderRadius: 27,

    padding: 20,

    marginBottom: 20,

    zIndex: 2,
  },

  bondingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  bondingEyebrow: {
    color: C.deepTeal,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 5,
  },

  bondingTitle: {
    color: C.dark,
    fontSize: 18,
    fontWeight: "900",
  },

  bondingIcon: {
    width: 49,
    height: 49,
    borderRadius: 17,

    backgroundColor: C.white,

    justifyContent: "center",
    alignItems: "center",
  },

  bondingEmoji: {
    fontSize: 24,
  },

  bondingText: {
    color: C.dark,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 14,
  },

  bondingTip: {
    backgroundColor: C.white,

    borderRadius: 15,

    padding: 11,

    marginTop: 14,
  },

  bondingTipText: {
    color: C.deepTeal,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "800",
  },


  /* =================================================
     REMINDER
  ================================================= */

  reminderCard: {
    backgroundColor: "#FFE5E1",

    borderRadius: 25,

    padding: 17,

    flexDirection: "row",
    alignItems: "center",

    zIndex: 2,
  },

  reminderIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,

    backgroundColor: C.coral,

    justifyContent: "center",
    alignItems: "center",

    marginRight: 13,
  },

  heart: {
    color: C.white,
    fontSize: 20,
  },

  reminderContent: {
    flex: 1,
  },

  reminderLabel: {
    color: C.coral,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.3,
    marginBottom: 4,
  },

  reminderText: {
    color: C.dark,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },


  /* =================================================
     FOOTER
  ================================================= */

  footer: {
    color: C.muted,
    textAlign: "center",
    fontSize: 9,
    marginTop: 28,
    zIndex: 2,
  },
});