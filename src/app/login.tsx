import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

/* =========================================================
   SAME PALETTE AS INDEX PAGE
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
  rotate: Animated.Value;
  scale: Animated.Value;
};

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  /* =======================================================
     PAGE ANIMATION
  ======================================================= */

  const pageOpacity = useRef(new Animated.Value(0)).current;
  const pageScale = useRef(new Animated.Value(0.97)).current;

  /* =======================================================
     FLOATING OBJECTS
  ======================================================= */

  const createFloatItem = (): FloatItem => ({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    rotate: new Animated.Value(0),
    scale: new Animated.Value(1),
  });

  const items = useRef([
    createFloatItem(),
    createFloatItem(),
    createFloatItem(),
    createFloatItem(),
    createFloatItem(),
    createFloatItem(),
    createFloatItem(),
    createFloatItem(),
  ]).current;

  /* =======================================================
     PAGE + FLOATING ANIMATION
  ======================================================= */

  useEffect(() => {
    Animated.parallel([
      Animated.timing(pageOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),

      Animated.spring(pageScale, {
        toValue: 1,
        tension: 45,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const paths = [
      {
        duration: 6000,
        x1: -width * 0.35,
        y1: -80,
        x2: width * 0.35,
        y2: 120,
      },
      {
        duration: 7200,
        x1: width * 0.38,
        y1: -120,
        x2: -width * 0.38,
        y2: 100,
      },
      {
        duration: 6500,
        x1: -width * 0.3,
        y1: 130,
        x2: width * 0.35,
        y2: -100,
      },
      {
        duration: 7600,
        x1: width * 0.4,
        y1: 130,
        x2: -width * 0.35,
        y2: -120,
      },
      {
        duration: 5800,
        x1: -width * 0.4,
        y1: 20,
        x2: width * 0.4,
        y2: 150,
      },
      {
        duration: 6800,
        x1: width * 0.35,
        y1: 160,
        x2: -width * 0.4,
        y2: -50,
      },
      {
        duration: 6200,
        x1: -width * 0.35,
        y1: -120,
        x2: width * 0.4,
        y2: 40,
      },
      {
        duration: 7400,
        x1: width * 0.4,
        y1: 80,
        x2: -width * 0.35,
        y2: -100,
      },
    ];

    items.forEach((item, index) => {
      const p = paths[index];

      const animate = () => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(item.x, {
              toValue: p.x1,
              duration: p.duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),

            Animated.timing(item.y, {
              toValue: p.y1,
              duration: p.duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),

            Animated.timing(item.rotate, {
              toValue: 1,
              duration: p.duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),

          Animated.parallel([
            Animated.timing(item.x, {
              toValue: p.x2,
              duration: p.duration * 1.2,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),

            Animated.timing(item.y, {
              toValue: p.y2,
              duration: p.duration * 1.2,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),

            Animated.timing(item.rotate, {
              toValue: 2,
              duration: p.duration * 1.2,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),

          Animated.parallel([
            Animated.timing(item.x, {
              toValue: 0,
              duration: p.duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),

            Animated.timing(item.y, {
              toValue: 0,
              duration: p.duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),

            Animated.timing(item.rotate, {
              toValue: 3,
              duration: p.duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        ]).start(({ finished }) => {
          if (finished) {
            animate();
          }
        });
      };

      const timer = setTimeout(animate, index * 280);

      return () => clearTimeout(timer);
    });
  }, []);

  /* =======================================================
     LOGIN
  ======================================================= */

  const handleLogin = () => {
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Just a little more — enter your email and password. 💛");
      return;
    }

    if (!email.includes("@")) {
      setError("That email looks a little unusual. Check it once more. 🌷");
      return;
    }

    // Connect your Supabase authentication here later.
    router.replace("/mother-dashboard");
  };

  /* =======================================================
     FLOATING ELEMENT STYLE
  ======================================================= */

  const floatingStyle = (item: FloatItem) => ({
    transform: [
      {
        translateX: item.x,
      },
      {
        translateY: item.y,
      },
      {
        rotate: item.rotate.interpolate({
          inputRange: [0, 1, 2, 3],
          outputRange: ["0deg", "8deg", "-8deg", "0deg"],
        }),
      },
    ],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={C.cream}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          <Animated.View
            style={[
              styles.page,
              {
                opacity: pageOpacity,
                transform: [{ scale: pageScale }],
              },
            ]}
          >
            {/* =================================================
                FLOATING WORLD
            ================================================= */}

            <View
              pointerEvents="none"
              style={styles.floatingWorld}
            >
              {/* Bubble */}
              <Animated.View
                style={[
                  styles.bigBubble,
                  floatingStyle(items[0]),
                ]}
              >
                <View style={styles.bubbleHighlight} />
              </Animated.View>

              {/* Coral flower */}
              <Animated.View
                style={[
                  styles.flower,
                  floatingStyle(items[1]),
                ]}
              >
                <Text style={styles.flowerText}>✿</Text>
              </Animated.View>

              {/* Heart */}
              <Animated.View
                style={[
                  styles.heart,
                  floatingStyle(items[2]),
                ]}
              >
                <Text style={styles.heartText}>♡</Text>
              </Animated.View>

              {/* Star */}
              <Animated.View
                style={[
                  styles.star,
                  floatingStyle(items[3]),
                ]}
              >
                <Text style={styles.starText}>✦</Text>
              </Animated.View>

              {/* Yellow dot */}
              <Animated.View
                style={[
                  styles.yellowDot,
                  floatingStyle(items[4]),
                ]}
              />

              {/* Teal dot */}
              <Animated.View
                style={[
                  styles.tealDot,
                  floatingStyle(items[5]),
                ]}
              />

              {/* Ring */}
              <Animated.View
                style={[
                  styles.ring,
                  floatingStyle(items[6]),
                ]}
              />

              {/* Sparkle */}
              <Animated.View
                style={[
                  styles.sparkle,
                  floatingStyle(items[7]),
                ]}
              >
                <Text style={styles.sparkleText}>✧</Text>
              </Animated.View>
            </View>

            {/* =================================================
                TOP BRAND
            ================================================= */}

            <View style={styles.topBar}>
              <Pressable
                onPress={() => router.push("/")}
                style={({ pressed }) => [
                  styles.brand,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.brandMark}>
                  <Text style={styles.brandMarkText}>✿</Text>
                </View>

                <Text style={styles.brandText}>
                  MamaMind
                </Text>
              </Pressable>

              <View style={styles.signupPrompt}>
                <Text style={styles.promptText}>
                  New here?
                </Text>

                <Pressable
                  onPress={() => router.push("/signup")}
                >
                  <Text style={styles.promptLink}>
                    Create account
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* =================================================
                LOGIN CONTENT
            ================================================= */}

            <View style={styles.content}>
              <View style={styles.welcomePill}>
                <View style={styles.pillDot} />

                <Text style={styles.pillText}>
                  YOUR LITTLE SPACE
                </Text>
              </View>

              <Text style={styles.title}>
                Welcome back,
              </Text>

              <Text style={styles.titleAccent}>
                mama. 💛
              </Text>

              <Text style={styles.subtitle}>
                Come exactly as you are.
                {"\n"}
                There is nothing you need to have figured out.
              </Text>

              {/* =================================================
                  FORM CARD
              ================================================= */}

              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  Let's pick up where we left off.
                </Text>

                <Text style={styles.cardSubtitle}>
                  Your little corner of calm is waiting.
                </Text>

                {/* EMAIL */}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    EMAIL
                  </Text>

                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>
                      ✉
                    </Text>

                    <TextInput
                      value={email}
                      onChangeText={(value) => {
                        setEmail(value);
                        setError("");
                      }}
                      placeholder="you@example.com"
                      placeholderTextColor="#9BAFAE"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.input}
                    />
                  </View>
                </View>

                {/* PASSWORD */}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    PASSWORD
                  </Text>

                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>
                      ♡
                    </Text>

                    <TextInput
                      value={password}
                      onChangeText={(value) => {
                        setPassword(value);
                        setError("");
                      }}
                      placeholder="Your password"
                      placeholderTextColor="#9BAFAE"
                      secureTextEntry={!showPassword}
                      style={styles.input}
                    />

                    <Pressable
                      onPress={() =>
                        setShowPassword(!showPassword)
                      }
                      style={styles.eyeButton}
                    >
                      <Text style={styles.eyeText}>
                        {showPassword ? "Hide" : "Show"}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* FORGOT */}

                <Pressable
                  onPress={() => {
                    setError(
                      "We'll help you get back in. Password reset can be connected to Supabase here. 💛"
                    );
                  }}
                  style={styles.forgotButton}
                >
                  <Text style={styles.forgotText}>
                    Forgot your password?
                  </Text>
                </Pressable>

                {/* ERROR */}

                {error ? (
                  <View style={styles.messageBox}>
                    <Text style={styles.messageText}>
                      {error}
                    </Text>
                  </View>
                ) : null}

                {/* LOGIN BUTTON */}

                <Pressable
                  onPress={handleLogin}
                  style={({ pressed }) => [
                    styles.loginButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.loginButtonText}>
                    Log me in
                  </Text>

                  <View style={styles.arrowCircle}>
                    <Text style={styles.arrow}>
                      →
                    </Text>
                  </View>
                </Pressable>

                {/* DIVIDER */}

                <View style={styles.dividerRow}>
                  <View style={styles.divider} />

                  <Text style={styles.orText}>
                    OR
                  </Text>

                  <View style={styles.divider} />
                </View>

                {/* GOOGLE */}

                <Pressable
                  onPress={() => {
                    setError(
                      "Google sign-in can be connected here when authentication is enabled. 🌷"
                    );
                  }}
                  style={({ pressed }) => [
                    styles.googleButton,
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <View style={styles.googleCircle}>
                    <Text style={styles.googleG}>
                      G
                    </Text>
                  </View>

                  <Text style={styles.googleText}>
                    Continue with Google
                  </Text>
                </Pressable>
              </View>

              {/* =================================================
                  KIND REMINDER
              ================================================= */}

              <View style={styles.reminder}>
                <View style={styles.reminderIcon}>
                  <Text>🌷</Text>
                </View>

                <View style={styles.reminderTextWrap}>
                  <Text style={styles.reminderSmall}>
                    A tiny reminder
                  </Text>

                  <Text style={styles.reminderMain}>
                    You deserve care too.
                  </Text>
                </View>
              </View>

              {/* SIGNUP */}

              <View style={styles.bottomSignup}>
                <Text style={styles.bottomText}>
                  Don't have a MamaMind account?
                </Text>

                <Pressable
                  onPress={() => router.push("/signup")}
                >
                  <Text style={styles.bottomLink}>
                    Start your journey →
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    flexGrow: 1,
    paddingBottom: 40,
  },

  page: {
    flex: 1,
    minHeight: height,
    backgroundColor: C.cream,
    overflow: "hidden",
    position: "relative",
  },

  /* =======================================================
     FLOATING WORLD
  ======================================================= */

  floatingWorld: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },

  bigBubble: {
    position: "absolute",
    left: width * 0.08,
    top: height * 0.20,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: C.teal,
    backgroundColor: "#FFFFFF55",
  },

  bubbleHighlight: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.white,
    left: 10,
    top: 9,
  },

  flower: {
    position: "absolute",
    left: width * 0.08,
    top: height * 0.62,
  },

  flowerText: {
    fontSize: 48,
    color: C.coral,
  },

  heart: {
    position: "absolute",
    right: width * 0.10,
    top: height * 0.20,
  },

  heartText: {
    color: C.coral,
    fontSize: 62,
    fontWeight: "300",
  },

  star: {
    position: "absolute",
    right: width * 0.12,
    top: height * 0.45,
  },

  starText: {
    color: C.deepTeal,
    fontSize: 40,
  },

  yellowDot: {
    position: "absolute",
    right: width * 0.30,
    top: height * 0.13,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: C.yellow,
  },

  tealDot: {
    position: "absolute",
    left: width * 0.25,
    top: height * 0.38,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: C.teal,
  },

  ring: {
    position: "absolute",
    right: width * 0.20,
    top: height * 0.70,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 4,
    borderColor: C.yellow,
  },

  sparkle: {
    position: "absolute",
    left: width * 0.20,
    top: height * 0.78,
  },

  sparkleText: {
    color: C.coral,
    fontSize: 36,
  },

  /* =======================================================
     TOP BAR
  ======================================================= */

  topBar: {
    width: "100%",
    minHeight: 82,
    paddingHorizontal: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
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

  signupPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  promptText: {
    color: C.muted,
    fontSize: 12,
  },

  promptLink: {
    color: C.deepTeal,
    fontSize: 12,
    fontWeight: "900",
  },

  /* =======================================================
     CONTENT
  ======================================================= */

  content: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 35,
    zIndex: 5,
  },

  welcomePill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.paleTeal,
    borderWidth: 1,
    borderColor: "#D0EFEB",
    borderRadius: 30,
    paddingHorizontal: 15,
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
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.3,
  },

  title: {
    color: C.dark,
    fontSize: 42,
    lineHeight: 46,
    fontWeight: "900",
    letterSpacing: -1.5,
    textAlign: "center",
    marginTop: 22,
  },

  titleAccent: {
    color: C.deepTeal,
    fontSize: 42,
    lineHeight: 46,
    fontWeight: "900",
    letterSpacing: -1.5,
    textAlign: "center",
  },

  subtitle: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 13,
    marginBottom: 25,
  },

  /* =======================================================
     CARD
  ======================================================= */

  card: {
    backgroundColor: C.white,
    borderRadius: 30,
    padding: 24,

    shadowColor: C.dark,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.09,
    shadowRadius: 24,
    elevation: 4,
  },

  cardTitle: {
    color: C.dark,
    fontSize: 19,
    fontWeight: "900",
  },

  cardSubtitle: {
    color: C.muted,
    fontSize: 12,
    marginTop: 5,
    marginBottom: 23,
  },

  inputGroup: {
    marginBottom: 16,
  },

  label: {
    color: C.deepTeal,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginBottom: 7,
  },

  inputWrapper: {
    minHeight: 54,
    borderRadius: 17,
    backgroundColor: C.paleTeal,
    borderWidth: 1,
    borderColor: "#D3EFEC",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },

  inputIcon: {
    color: C.teal,
    fontSize: 19,
    width: 30,
  },

  input: {
    flex: 1,
    color: C.dark,
    fontSize: 14,
    paddingVertical: 14,
  },

  eyeButton: {
    paddingLeft: 8,
    minHeight: 48,
    justifyContent: "center",
  },

  eyeText: {
    color: C.deepTeal,
    fontSize: 10,
    fontWeight: "900",
  },

  forgotButton: {
    alignSelf: "flex-end",
    paddingVertical: 5,
    marginTop: -3,
    marginBottom: 13,
  },

  forgotText: {
    color: C.deepTeal,
    fontSize: 11,
    fontWeight: "800",
  },

  messageBox: {
    backgroundColor: "#FFF4D6",
    borderRadius: 14,
    padding: 12,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#FFE5A0",
  },

  messageText: {
    color: C.dark,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    fontWeight: "700",
  },

  loginButton: {
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: C.deepTeal,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 22,
    paddingRight: 8,

    shadowColor: C.deepTeal,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.20,
    shadowRadius: 14,
    elevation: 5,
  },

  buttonPressed: {
    transform: [{ scale: 0.97 }],
  },

  loginButtonText: {
    color: C.white,
    fontSize: 14,
    fontWeight: "900",
  },

  arrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.yellow,
    justifyContent: "center",
    alignItems: "center",
  },

  arrow: {
    color: C.deepTeal,
    fontSize: 21,
    fontWeight: "900",
  },

  /* =======================================================
     DIVIDER
  ======================================================= */

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 19,
  },

  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E4ECEA",
  },

  orText: {
    color: C.muted,
    fontSize: 9,
    fontWeight: "800",
    marginHorizontal: 12,
  },

  /* =======================================================
     GOOGLE
  ======================================================= */

  googleButton: {
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: C.cream,
    borderWidth: 1,
    borderColor: "#E4E8E3",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  googleCircle: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: C.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },

  googleG: {
    color: C.deepTeal,
    fontSize: 14,
    fontWeight: "900",
  },

  googleText: {
    color: C.dark,
    fontSize: 12,
    fontWeight: "800",
  },

  /* =======================================================
     REMINDER
  ======================================================= */

  reminder: {
    marginTop: 22,
    backgroundColor: C.white,
    borderRadius: 22,
    minHeight: 70,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",

    shadowColor: C.dark,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.06,
    shadowRadius: 15,
    elevation: 2,
  },

  reminderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFF0EF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  reminderTextWrap: {
    flex: 1,
  },

  reminderSmall: {
    color: C.coral,
    fontSize: 8,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },

  reminderMain: {
    color: C.dark,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 3,
  },

  bottomSignup: {
    alignItems: "center",
    marginTop: 23,
    marginBottom: 20,
  },

  bottomText: {
    color: C.muted,
    fontSize: 11,
  },

  bottomLink: {
    color: C.deepTeal,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 5,
  },
});