
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
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

import { auth, db } from "../services/firebase";

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

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      // Sign in with Firebase Authentication
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // Retrieve the role saved for this specific user
      const userRef = doc(db, "users", credential.user.uid);
      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        setError(
          "Your profile was not found. Please complete your account setup."
        );
        return;
      }

      const userData = userSnapshot.data();
      const role = userData.role;

      // Navigate according to the saved role
      if (role === "father") {
        router.replace("/father-dashboard");
      } else if (role === "mother") {
        router.replace("/mother-dashboard");
      } else {
        setError(
          "Your account role is missing or invalid. Please complete your profile setup."
        );
      }
    } catch (error: any) {
      console.log("LOGIN ERROR:", error?.code, error?.message);

      if (
        error?.code === "auth/user-not-found" ||
        error?.code === "auth/invalid-credential"
      ) {
        setError("Email or password is incorrect.");
      } else if (error?.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (error?.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (error?.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else if (
        error?.code === "permission-denied" ||
        error?.code === "firestore/permission-denied"
      ) {
        setError("Unable to access your profile. Please check Firebase permissions.");
      } else {
        setError("Unable to log in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

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
          <View style={styles.page}>
            {/* TOP BRAND */}
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

            {/* LOGIN CONTENT */}
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

              {/* FORM CARD */}
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
                      autoCapitalize="none"
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

                {/* FORGOT PASSWORD */}
                <Pressable
                  onPress={() => {
                    setError(
                      "Password reset can be connected here."
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
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.loginButton,
                    pressed && styles.buttonPressed,
                    loading && styles.buttonDisabled,
                  ]}
                >
                  <Text style={styles.loginButtonText}>
                    {loading ? "Logging in..." : "Log me in"}
                  </Text>

                  {!loading && (
                    <View style={styles.arrowCircle}>
                      <Text style={styles.arrow}>
                        →
                      </Text>
                    </View>
                  )}
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
                      "Google sign-in is not connected yet."
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
                    Continue with Google
                  </Text>
                </Pressable>
              </View>

              {/* REMINDER */}
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
    minHeight: "100%",
    backgroundColor: C.cream,
    overflow: "hidden",
  },

  topBar: {
    width: "100%",
    minHeight: 82,
    paddingHorizontal: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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

  content: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 35,
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

  buttonDisabled: {
    opacity: 0.7,
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

