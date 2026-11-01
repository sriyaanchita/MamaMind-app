import {
  useRouter,
  useLocalSearchParams,
} from "expo-router";
import { registerUser } from "../services/auth";
import { db } from "../services/firebase";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
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
};

export default function SignupScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{
  role: "mother" | "father";
  }>();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [babyName, setBabyName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  /* =======================================================
     PAGE ANIMATION
  ======================================================= */

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  /* =======================================================
     FLOATING OBJECTS
  ======================================================= */

  const createFloatItem = (): FloatItem => ({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    rotate: new Animated.Value(0),
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
     ANIMATION
  ======================================================= */

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 850,
        useNativeDriver: true,
      }),

      Animated.spring(scale, {
        toValue: 1,
        tension: 42,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const paths = [
      [-width * 0.4, -80, width * 0.35, 120, 6200],
      [width * 0.38, -120, -width * 0.38, 100, 7000],
      [-width * 0.3, 130, width * 0.4, -80, 5800],
      [width * 0.4, 140, -width * 0.35, -100, 7600],
      [-width * 0.4, 20, width * 0.38, 150, 6400],
      [width * 0.38, 150, -width * 0.4, -50, 6900],
      [-width * 0.35, -110, width * 0.4, 50, 6000],
      [width * 0.4, 90, -width * 0.38, -100, 7300],
    ];

    items.forEach((item, index) => {
      const [
        x1,
        y1,
        x2,
        y2,
        duration,
      ] = paths[index];

      const animate = () => {
        Animated.sequence([
          Animated.parallel([
            Animated.timing(item.x, {
              toValue: x1,
              duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),

            Animated.timing(item.y, {
              toValue: y1,
              duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),

            Animated.timing(item.rotate, {
              toValue: 1,
              duration,
              useNativeDriver: true,
            }),
          ]),

          Animated.parallel([
            Animated.timing(item.x, {
              toValue: x2,
              duration: duration * 1.2,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),

            Animated.timing(item.y, {
              toValue: y2,
              duration: duration * 1.2,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),

            Animated.timing(item.rotate, {
              toValue: 2,
              duration: duration * 1.2,
              useNativeDriver: true,
            }),
          ]),

          Animated.parallel([
            Animated.timing(item.x, {
              toValue: 0,
              duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),

            Animated.timing(item.y, {
              toValue: 0,
              duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),

            Animated.timing(item.rotate, {
              toValue: 3,
              duration,
              useNativeDriver: true,
            }),
          ]),
        ]).start(({ finished }) => {
          if (finished) animate();
        });
      };

      setTimeout(animate, index * 300);
    });
  }, []);

  /* =======================================================
     SIGN UP
  ======================================================= */

  const handleSignup = async () => {
  setError("");

  if (!name.trim()) {
    setError(
      "Tell us your name first. We'd love to know what to call you. 🌷"
    );
    return;
  }

  if (!email.trim() || !email.includes("@")) {
    setError("Let's check that email address once more. 💛");
    return;
  }

  if (password.length < 6) {
    setError("Your password needs at least 6 characters.");
    return;
  }

  try {
    const user = await registerUser(
      email.trim(),
      password
    );

    // Store the user's profile in Firestore
    await setDoc(doc(db, "users", user.uid), {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      babyName: babyName.trim(),
      role: role,
      createdAt: serverTimestamp(),
    });

    // Go to the correct dashboard
    if (role === "mother") {
      router.replace("/mother-dashboard");
    } else if (role === "father") {
      router.replace("/father-dashboard");
    }
  } catch (error: any) {
    console.log(
      "SIGNUP ERROR:",
      error?.code,
      error?.message
    );

    if (error?.code === "auth/email-already-in-use") {
      setError(
        "An account with this email already exists. Please log in."
      );
    } else if (error?.code === "auth/invalid-email") {
      setError("Please enter a valid email address.");
    } else if (error?.code === "auth/weak-password") {
      setError("Your password needs at least 6 characters.");
    } else if (
      error?.code === "auth/network-request-failed"
    ) {
      setError(
        "Please check your internet connection and try again."
      );
    } else if (error?.code === "permission-denied") {
      setError(
        "Account created, but your profile could not be saved."
      );
    } else {
      setError(
        "Unable to create your account. Please try again."
      );
    }
  }
};

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
          outputRange: ["0deg", "7deg", "-7deg", "0deg"],
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
                opacity,
                transform: [{ scale }],
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
              <Animated.View
                style={[
                  styles.bigBubble,
                  floatingStyle(items[0]),
                ]}
              >
                <View style={styles.bubbleHighlight} />
              </Animated.View>

              <Animated.View
                style={[
                  styles.flower,
                  floatingStyle(items[1]),
                ]}
              >
                <Text style={styles.flowerText}>
                  ✿
                </Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.heart,
                  floatingStyle(items[2]),
                ]}
              >
                <Text style={styles.heartText}>
                  ♡
                </Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.star,
                  floatingStyle(items[3]),
                ]}
              >
                <Text style={styles.starText}>
                  ✦
                </Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.yellowDot,
                  floatingStyle(items[4]),
                ]}
              />

              <Animated.View
                style={[
                  styles.tealDot,
                  floatingStyle(items[5]),
                ]}
              />

              <Animated.View
                style={[
                  styles.ring,
                  floatingStyle(items[6]),
                ]}
              />

              <Animated.View
                style={[
                  styles.sparkle,
                  floatingStyle(items[7]),
                ]}
              >
                <Text style={styles.sparkleText}>
                  ✧
                </Text>
              </Animated.View>
            </View>

            {/* =================================================
                HEADER
            ================================================= */}

            <View style={styles.topBar}>
              <Pressable
                onPress={() => router.push("/")}
                style={styles.brand}
              >
                <View style={styles.brandMark}>
                  <Text style={styles.brandMarkText}>
                    ✿
                  </Text>
                </View>

                <Text style={styles.brandText}>
                  MamaMind
                </Text>
              </Pressable>

              <View style={styles.loginPrompt}>
                <Text style={styles.promptText}>
                  Already here?
                </Text>

                <Pressable
                  onPress={() => router.push("/login")}
                >
                  <Text style={styles.promptLink}>
                    Log in
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* =================================================
                CONTENT
            ================================================= */}

            <View style={styles.content}>
              <View style={styles.welcomePill}>
                <View style={styles.pillDot} />

                <Text style={styles.pillText}>
                  A GENTLE BEGINNING
                </Text>
              </View>

              <Text style={styles.title}>
                Welcome, mama.
              </Text>

              <Text style={styles.titleAccent}>
                We've been waiting for you 💛
              </Text>

              <Text style={styles.subtitle}>
                This is a little space for you —
                {"\n"}
                your wellbeing, your baby, and your people.
              </Text>

              {/* =================================================
                  FORM
              ================================================= */}

              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  Let's make this space yours.
                </Text>

                <Text style={styles.cardSubtitle}>
                  You can change anything later.
                </Text>

                {/* NAME */}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    YOUR NAME
                  </Text>

                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>
                      ✿
                    </Text>

                    <TextInput
                      value={name}
                      onChangeText={(value) => {
                        setName(value);
                        setError("");
                      }}
                      placeholder="What should we call you?"
                      placeholderTextColor="#9BAFAE"
                      style={styles.input}
                    />
                  </View>
                </View>

                {/* BABY NAME */}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    BABY'S NAME
                    <Text style={styles.optional}>
                      {" "}OPTIONAL
                    </Text>
                  </Text>

                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>
                      ♡
                    </Text>

                    <TextInput
                      value={babyName}
                      onChangeText={setBabyName}
                      placeholder="Your little one's name"
                      placeholderTextColor="#9BAFAE"
                      style={styles.input}
                    />
                  </View>
                </View>

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
                      placeholder="At least 6 characters"
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

                {/* ERROR */}

                {error ? (
                  <View style={styles.messageBox}>
                    <Text style={styles.messageText}>
                      {error}
                    </Text>
                  </View>
                ) : null}

                {/* CREATE ACCOUNT */}

                <Pressable
                  onPress={handleSignup}
                  style={({ pressed }) => [
                    styles.signupButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text style={styles.signupButtonText}>
                    Create my space
                  </Text>

                  <View style={styles.arrowCircle}>
                    <Text style={styles.arrow}>
                      →
                    </Text>
                  </View>
                </Pressable>

                {/* GOOGLE */}

                <View style={styles.dividerRow}>
                  <View style={styles.divider} />

                  <Text style={styles.orText}>
                    OR
                  </Text>

                  <View style={styles.divider} />
                </View>

                <Pressable
                  onPress={() => {
                    setError(
                      "Google sign-up can be connected when authentication is enabled. 🌷"
                    );
                  }}
                  style={({ pressed }) => [
                    styles.googleButton,
                    pressed && {
                      transform: [{ scale: 0.98 }],
                    },
                  ]}
                >
                  <View style={styles.googleCircle}>
                    <Text style={styles.googleG}>
                      G
                    </Text>
                  </View>

                  <Text style={styles.googleText}>
                    Sign up with Google
                  </Text>
                </Pressable>
              </View>

              {/* =================================================
                  PRIVACY NOTE
              ================================================= */}

              <View style={styles.privacyCard}>
                <View style={styles.privacyIcon}>
                  <Text>🔒</Text>
                </View>

                <View style={styles.privacyTextWrap}>
                  <Text style={styles.privacyTitle}>
                    Your space stays yours.
                  </Text>

                  <Text style={styles.privacyText}>
                    MamaMind is designed with privacy in mind.
                    We only ask for what helps make your
                    experience more personal.
                  </Text>
                </View>
              </View>

              {/* =================================================
                  FOOTER
              ================================================= */}

              <View style={styles.bottom}>
                <Text style={styles.bottomText}>
                  Already have an account?
                </Text>

                <Pressable
                  onPress={() => router.push("/login")}
                >
                  <Text style={styles.bottomLink}>
                    Log in →
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
    top: height * 0.19,
    width: 50,
    height: 50,
    borderRadius: 25,
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
    left: 9,
    top: 8,
  },

  flower: {
    position: "absolute",
    right: width * 0.10,
    top: height * 0.18,
  },

  flowerText: {
    color: C.coral,
    fontSize: 48,
  },

  heart: {
    position: "absolute",
    left: width * 0.09,
    top: height * 0.48,
  },

  heartText: {
    color: C.coral,
    fontSize: 60,
  },

  star: {
    position: "absolute",
    right: width * 0.11,
    top: height * 0.48,
  },

  starText: {
    color: C.deepTeal,
    fontSize: 38,
  },

  yellowDot: {
    position: "absolute",
    left: width * 0.34,
    top: height * 0.15,
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: C.yellow,
  },

  tealDot: {
    position: "absolute",
    right: width * 0.25,
    top: height * 0.34,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: C.teal,
  },

  ring: {
    position: "absolute",
    left: width * 0.16,
    top: height * 0.75,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: C.yellow,
  },

  sparkle: {
    position: "absolute",
    right: width * 0.18,
    top: height * 0.75,
  },

  sparkleText: {
    color: C.coral,
    fontSize: 34,
  },

  /* =======================================================
     HEADER
  ======================================================= */

  topBar: {
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

  loginPrompt: {
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
    paddingTop: 30,
    zIndex: 5,
  },

  welcomePill: {
    alignSelf: "center",
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
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  title: {
    color: C.dark,
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "900",
    letterSpacing: -1.5,
    textAlign: "center",
    marginTop: 21,
  },

  titleAccent: {
    color: C.deepTeal,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 2,
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
     FORM CARD
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
    marginBottom: 21,
  },

  inputGroup: {
    marginBottom: 14,
  },

  label: {
    color: C.deepTeal,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.3,
    marginBottom: 7,
  },

  optional: {
    color: C.muted,
    fontSize: 8,
    fontWeight: "700",
  },

  inputWrapper: {
    minHeight: 53,
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
    fontSize: 18,
    width: 30,
  },

  input: {
    flex: 1,
    color: C.dark,
    fontSize: 14,
    paddingVertical: 13,
  },

  eyeButton: {
    minHeight: 48,
    justifyContent: "center",
    paddingLeft: 8,
  },

  eyeText: {
    color: C.deepTeal,
    fontSize: 10,
    fontWeight: "900",
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

  signupButton: {
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

  signupButtonText: {
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
    marginVertical: 18,
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
     PRIVACY
  ======================================================= */

  privacyCard: {
    marginTop: 20,
    backgroundColor: C.paleTeal,
    borderRadius: 22,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D7EFEC",
  },

  privacyIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: C.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  privacyTextWrap: {
    flex: 1,
  },

  privacyTitle: {
    color: C.deepTeal,
    fontSize: 12,
    fontWeight: "900",
  },

  privacyText: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },

  bottom: {
    alignItems: "center",
    marginTop: 22,
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