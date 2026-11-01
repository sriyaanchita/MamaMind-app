
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  createFamily,
  joinFamilyWithCode,
  type FamilyRole,
} from "../utils/familyService";

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

export default function ConnectFamilyScreen() {
  const router = useRouter();

  const [role, setRole] = useState<FamilyRole>("mother");
  const [inviteCode, setInviteCode] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateFamily = async () => {
    try {
      setLoading(true);

      const family = await createFamily(role);

      if (family.inviteCode) {
        setCreatedCode(family.inviteCode);
      }
    } catch (error) {
      Alert.alert(
        "Couldn't create family",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async () => {
    if (inviteCode.trim().length !== 6) {
      Alert.alert("Enter invite code", "The code must contain 6 characters.");
      return;
    }

    try {
      setLoading(true);

      await joinFamilyWithCode(inviteCode, role);

      Alert.alert(
        "Family connected!",
        "You and your partner are now connected.",
        [
          {
            text: "Continue",
            onPress: () => router.replace(
              role === "mother"
                ? "/mother-dashboard"
                : "/father-dashboard"
            ),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Couldn't join family",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <Text style={styles.familyIcon}>♡</Text>
          </View>

          <Text style={styles.eyebrow}>MAMAMIND FAMILY</Text>
          <Text style={styles.title}>Care feels better{"\n"}together.</Text>
          <Text style={styles.subtitle}>
            Connect your accounts to share baby care, tasks and precious
            little moments.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>I am signing in as</Text>

          <View style={styles.roleRow}>
            <Pressable
              onPress={() => setRole("mother")}
              style={[
                styles.roleButton,
                role === "mother" && styles.roleSelected,
              ]}
            >
              <Text style={styles.roleSymbol}>M</Text>
              <Text style={styles.roleText}>Mama</Text>
              {role === "mother" && <Text style={styles.check}>✓</Text>}
            </Pressable>

            <Pressable
              onPress={() => setRole("father")}
              style={[
                styles.roleButton,
                role === "father" && styles.roleSelected,
              ]}
            >
              <Text style={styles.roleSymbol}>D</Text>
              <Text style={styles.roleText}>Dad / Partner</Text>
              {role === "father" && <Text style={styles.check}>✓</Text>}
            </Pressable>
          </View>

          <View style={styles.separator} />

          <Text style={styles.sectionTitle}>Create a family space</Text>
          <Text style={styles.description}>
            One parent creates the space and shares the code with the other.
          </Text>

          <Pressable
            disabled={loading}
            onPress={handleCreateFamily}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
              loading && styles.disabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={C.dark} />
            ) : (
              <Text style={styles.primaryText}>Create family & get code</Text>
            )}
          </Pressable>

          {createdCode ? (
            <View style={styles.codeBox}>
              <Text style={styles.codeLabel}>YOUR INVITE CODE</Text>
              <Text style={styles.code}>{createdCode}</Text>
              <Text style={styles.codeHint}>
                Share this code privately with your partner. It expires in 24
                hours and can be used once.
              </Text>
              <Pressable
                onPress={() => {
                  Alert.alert(
                    "Your invite code",
                    `Share this code with your partner: ${createdCode}`
                  );
                }}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryText}>Show sharing code</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.separator} />

          <Text style={styles.sectionTitle}>Already have a code?</Text>
          <Text style={styles.description}>
            Enter the code shared by the other parent.
          </Text>

          <TextInput
            value={inviteCode}
            onChangeText={(value) =>
              setInviteCode(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))
            }
            placeholder="E.g. ABC234"
            placeholderTextColor="#91A9A8"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            style={styles.input}
          />

          <Pressable
            disabled={loading}
            onPress={handleJoinFamily}
            style={({ pressed }) => [
              styles.joinButton,
              pressed && styles.pressed,
              loading && styles.disabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={styles.joinText}>Join family</Text>
            )}
          </Pressable>
        </View>

        <Text style={styles.footer}>
          Your accounts stay separate. Your family shares only connected care
          information.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.cream,
  },
  container: {
    flexGrow: 1,
    padding: 22,
    paddingBottom: 36,
  },
  back: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingRight: 14,
  },
  backText: {
    color: C.deepTeal,
    fontSize: 15,
    fontWeight: "600",
  },
  hero: {
    alignItems: "center",
    paddingTop: 18,
    paddingBottom: 24,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: C.paleTeal,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  familyIcon: {
    color: C.deepTeal,
    fontSize: 46,
    fontWeight: "400",
  },
  eyebrow: {
    color: C.deepTeal,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 9,
  },
  title: {
    color: C.dark,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: C.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 12,
    maxWidth: 310,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F1E9D8",
  },
  sectionTitle: {
    color: C.dark,
    fontSize: 17,
    fontWeight: "800",
  },
  description: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 13,
  },
  roleRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  roleButton: {
    flex: 1,
    minHeight: 90,
    borderRadius: 16,
    padding: 12,
    backgroundColor: "#FAFCFB",
    borderWidth: 1,
    borderColor: "#DFEAE7",
    alignItems: "center",
    justifyContent: "center",
  },
  roleSelected: {
    backgroundColor: C.paleTeal,
    borderColor: C.teal,
    borderWidth: 2,
  },
  roleSymbol: {
    color: C.deepTeal,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 6,
  },
  roleText: {
    color: C.dark,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  check: {
    position: "absolute",
    right: 8,
    top: 7,
    color: C.deepTeal,
    fontWeight: "800",
  },
  separator: {
    height: 1,
    backgroundColor: "#EAF0EC",
    marginVertical: 22,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: C.yellow,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  primaryText: {
    color: C.dark,
    fontSize: 14,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.82,
  },
  disabled: {
    opacity: 0.65,
  },
  codeBox: {
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    backgroundColor: C.paleTeal,
    alignItems: "center",
  },
  codeLabel: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  code: {
    color: C.deepTeal,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 5,
    marginVertical: 10,
  },
  codeHint: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  secondaryButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: C.white,
  },
  secondaryText: {
    color: C.deepTeal,
    fontWeight: "800",
    fontSize: 13,
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#DCE9E5",
    backgroundColor: "#FAFCFB",
    borderRadius: 14,
    paddingHorizontal: 16,
    color: C.dark,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 3,
    marginBottom: 12,
  },
  joinButton: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: C.deepTeal,
    alignItems: "center",
    justifyContent: "center",
  },
  joinText: {
    color: C.white,
    fontSize: 15,
    fontWeight: "800",
  },
  footer: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 18,
    paddingHorizontal: 12,
  },
});