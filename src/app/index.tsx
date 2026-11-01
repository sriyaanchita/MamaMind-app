import React, { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

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

// Only hearts, dots and flowers float. No collisions or touch tracking.
type Decoration = {
  kind: "heart" | "dot" | "flower";
  top: number;
  left?: number;
  right?: number;
  size: number;
  color: string;
  delay: number;
};

const decorations: Decoration[] = [
  { kind: "heart", top: 45, left: 12, size: 26, color: C.coral, delay: 0 },
  { kind: "dot", top: 110, right: 27, size: 12, color: C.yellow, delay: 550 },
  { kind: "flower", top: 185, left: 7, size: 32, color: C.white, delay: 1100 },
  { kind: "heart", top: 295, right: 9, size: 23, color: C.yellow, delay: 900 },
  { kind: "dot", top: 380, left: 28, size: 10, color: C.teal, delay: 1600 },
  { kind: "flower", top: 455, right: 20, size: 27, color: C.white, delay: 300 },
];

function FloatingDecoration({ item }: { item: Decoration }) {
  const y = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, {
          toValue: -9,
          duration: 3200,
          delay: item.delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(y, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [item.delay, y]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.decoration,
        { top: item.top, left: item.left, right: item.right, transform: [{ translateY: y }] },
      ]}
    >
      {item.kind === "dot" ? (
        <View style={{ width: item.size, height: item.size, borderRadius: item.size / 2, backgroundColor: item.color, opacity: 0.7 }} />
      ) : item.kind === "heart" ? (
        <Text style={{ fontSize: item.size, color: item.color }}>♥</Text>
      ) : (
        <View style={{ width: item.size, height: item.size, alignItems: "center", justifyContent: "center" }}>
          {[0, 72, 144, 216, 288].map((angle) => (
            <View
              key={angle}
              style={{
                position: "absolute",
                width: item.size * 0.34,
                height: item.size * 0.55,
                borderRadius: item.size,
                backgroundColor: item.color,
                transform: [{ rotate: `${angle}deg` }, { translateY: -item.size * 0.23 }],
              }}
            />
          ))}
          <View style={{ width: item.size * 0.27, height: item.size * 0.27, borderRadius: item.size, backgroundColor: C.yellow }} />
        </View>
      )}
    </Animated.View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const phone = width < 700;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [fade]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cream} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          {decorations.map((item, index) => <FloatingDecoration key={index} item={item} />)}
          <View style={styles.navbar}>
            <View style={styles.brand}>
              <View style={styles.brandIcon}><Text style={styles.brandFlower}>✿</Text></View>
              <Text style={styles.brandText}>MamaMind</Text>
            </View>
            <Pressable onPress={() => router.push("/login")} style={styles.loginSmall}>
              <Text style={styles.loginSmallText}>Log in</Text>
            </Pressable>
          </View>

          <Animated.View style={[styles.heroContent, { opacity: fade }]}>
            <View style={styles.pill}>
              <View style={styles.pillDot} />
              <Text style={styles.pillText}>A gentle space for new mothers</Text>
            </View>
            <Text style={[styles.heading, phone && styles.headingPhone]}>Motherhood is a lot.</Text>
            <Text style={[styles.headingAccent, phone && styles.headingAccentPhone]}>You don't have to carry it all.</Text>
            <Text style={[styles.subtitle, phone && styles.subtitlePhone]}>
              MamaMind brings your wellbeing, your little one and your support system together — in one warm little space.
            </Text>

            {/* Save the supplied PNG at assets/images/mamamind-mother-baby.png */}
            <Image
              source={require("../../assets/mamamind-mother-baby.png")}
              resizeMode="contain"
              style={[styles.illustration, { width: Math.min(width - 36, 450), height: phone ? 275 : 330 }]}
              accessibilityLabel="Mother gently hugging her baby"
            />

            <View style={[styles.actions, phone && styles.actionsPhone]}>
              <Pressable
                onPress={() => router.push("/role-selection")}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.primaryText}>Create an account</Text>
                <Text style={styles.primaryArrow}>→</Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/login")}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryText}>I already have an account</Text>
              </Pressable>
            </View>
          </Animated.View>

          <View style={styles.reminder}>
            <Text style={styles.reminderFlower}>🌷</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.reminderLabel}>A TINY REMINDER</Text>
              <Text style={styles.reminderText}>You deserve care too.</Text>
            </View>
            <Text style={styles.reminderHeart}>♡</Text>
          </View>
        </View>

        {/* No mood check-in section */}
        <View style={styles.features}>
          <Text style={styles.featuresHeading}>Everything you need.</Text>
          <Text style={styles.featuresAccent}>Nothing you don't.</Text>
          <View style={[styles.featureGrid, phone && styles.featureGridPhone]}>
            <View style={[styles.featureCard, { backgroundColor: C.yellow }]}>
              <Text style={styles.featureNumber}>01</Text>
              <Text style={styles.featureEmoji}>🌿</Text>
              <Text style={styles.featureTitle}>Your wellbeing</Text>
              <Text style={styles.featureDescription}>Gentle self-care, meditation and little moments to recharge.</Text>
            </View>
            <View style={[styles.featureCard, { backgroundColor: C.teal }]}>
              <Text style={[styles.featureNumber, styles.onColor]}>02</Text>
              <Text style={styles.featureEmoji}>👶</Text>
              <Text style={[styles.featureTitle, styles.onColor]}>Your little one</Text>
              <Text style={[styles.featureDescription, styles.onColor]}>Baby care, milestones, routines and helpful reminders.</Text>
            </View>
            <View style={[styles.featureCard, { backgroundColor: C.coral }]}>
              <Text style={[styles.featureNumber, styles.onColor]}>03</Text>
              <Text style={styles.featureEmoji}>🤝</Text>
              <Text style={[styles.featureTitle, styles.onColor]}>Your people</Text>
              <Text style={[styles.featureDescription, styles.onColor]}>Share care and connect with the people supporting you.</Text>
            </View>
          </View>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>✿  You are doing better than you think.  ♡</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.cream },
  scroll: { paddingBottom: 28 },
  hero: { backgroundColor: C.cream, paddingHorizontal: 20, paddingBottom: 35, overflow: "hidden" },
  decoration: { position: "absolute", zIndex: 0, opacity: 0.75 },
  navbar: { minHeight: 75, flexDirection: "row", alignItems: "center", justifyContent: "space-between", zIndex: 2 },
  brand: { flexDirection: "row", alignItems: "center" },
  brandIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.teal, alignItems: "center", justifyContent: "center" },
  brandFlower: { color: C.white, fontSize: 25 },
  brandText: { fontSize: 22, fontWeight: "900", color: C.dark, marginLeft: 9 },
  loginSmall: { backgroundColor: C.white, borderRadius: 22, paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: "#D9E9E6" },
  loginSmallText: { color: C.deepTeal, fontWeight: "800" },
  heroContent: { alignItems: "center", zIndex: 1, paddingTop: 20 },
  pill: { flexDirection: "row", alignItems: "center", borderRadius: 25, backgroundColor: C.paleTeal, paddingHorizontal: 14, paddingVertical: 9 },
  pillDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.coral, marginRight: 8 },
  pillText: { fontSize: 11, fontWeight: "700", color: C.deepTeal },
  heading: { fontSize: 52, lineHeight: 58, fontWeight: "900", textAlign: "center", color: C.dark, marginTop: 22 },
  headingPhone: { fontSize: 34, lineHeight: 40 },
  headingAccent: { fontSize: 46, lineHeight: 52, fontWeight: "900", textAlign: "center", color: C.deepTeal, maxWidth: 720 },
  headingAccentPhone: { fontSize: 28, lineHeight: 34 },
  subtitle: { maxWidth: 530, textAlign: "center", color: C.muted, fontSize: 15, lineHeight: 23, marginTop: 15 },
  subtitlePhone: { fontSize: 13, lineHeight: 21 },
  illustration: { marginTop: 12, borderRadius: 24 },
  actions: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 12 },
  actionsPhone: { width: "100%", flexDirection: "column" },
  primaryButton: { minHeight: 52, backgroundColor: C.deepTeal, borderRadius: 28, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 23, gap: 16 },
  primaryText: { color: C.white, fontSize: 14, fontWeight: "800" },
  primaryArrow: { color: C.yellow, fontSize: 23, fontWeight: "800" },
  secondaryButton: { minHeight: 52, backgroundColor: C.white, borderRadius: 28, borderWidth: 1, borderColor: "#D9E9E6", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  secondaryText: { color: C.deepTeal, fontSize: 13, fontWeight: "700" },
  pressed: { opacity: 0.85 },
  reminder: { alignSelf: "center", flexDirection: "row", alignItems: "center", backgroundColor: C.white, width: "100%", maxWidth: 500, borderRadius: 23, padding: 17, marginTop: 28, gap: 12, borderWidth: 1, borderColor: "#F1EEE5" },
  reminderFlower: { fontSize: 26 },
  reminderLabel: { color: C.coral, fontWeight: "800", fontSize: 10, letterSpacing: 1 },
  reminderText: { color: C.dark, fontSize: 16, fontWeight: "800", marginTop: 3 },
  reminderHeart: { color: C.coral, fontSize: 26 },
  features: { paddingHorizontal: 20, paddingTop: 44, paddingBottom: 48 },
  featuresHeading: { color: C.dark, fontSize: 30, fontWeight: "900", textAlign: "center" },
  featuresAccent: { color: C.deepTeal, fontSize: 25, fontWeight: "800", textAlign: "center", marginTop: 3 },
  featureGrid: { flexDirection: "row", justifyContent: "center", gap: 14, marginTop: 28 },
  featureGridPhone: { flexDirection: "column" },
  featureCard: { flex: 1, borderRadius: 25, padding: 24, minHeight: 205 },
  featureNumber: { color: C.dark, opacity: 0.7, fontWeight: "900", fontSize: 13 },
  featureEmoji: { fontSize: 35, marginTop: 12, marginBottom: 12 },
  featureTitle: { fontSize: 20, fontWeight: "900", color: C.dark },
  featureDescription: { fontSize: 13, lineHeight: 20, marginTop: 8, color: C.dark },
  onColor: { color: C.white },
  footer: { alignItems: "center", paddingHorizontal: 18, paddingTop: 18, paddingBottom: 25 },
  footerText: { color: C.deepTeal, fontSize: 13, fontWeight: "700", textAlign: "center" },
});
