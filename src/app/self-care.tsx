
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const COLORS = {
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

type SelfCareItem = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  backgroundColor: string;
  iconColor: string;
};

const selfCareItems: SelfCareItem[] = [
  {
    title: "Meditation",
    subtitle: "Pause, breathe and relax",
    icon: "leaf-outline",
    route: "/meditation",
    backgroundColor: COLORS.paleTeal,
    iconColor: COLORS.deepTeal,
  },
  {
    title: "Daily Task",
    subtitle: "Your everyday care routine",
    icon: "checkbox-outline",
    route: "/daily-care",
    backgroundColor: COLORS.cream,
    iconColor: COLORS.deepTeal,
  },
  {
    title: "Games",
    subtitle: "Give yourself a fun break",
    icon: "game-controller-outline",
    route: "/games",
    backgroundColor: "#FFF0ED",
    iconColor: COLORS.coral,
  },
  {
    title: "Journal",
    subtitle: "Make space for your thoughts",
    icon: "book-outline",
    route: "/journal",
    backgroundColor: COLORS.paleTeal,
    iconColor: COLORS.deepTeal,
  },
  {
    title: "Happy Jar",
    subtitle: "Collect your little joys",
    icon: "heart-outline",
    route: "/happy-jar",
    backgroundColor: COLORS.cream,
    iconColor: COLORS.coral,
  },
  {
  title: "Health Monitor",
  subtitle: "Track heart rate, SpO₂ & movement",
  icon: "pulse-outline",
  route: "/health-monitor",
  backgroundColor: "#FFF0ED",
  iconColor: COLORS.coral,
},
];

export default function SelfCareScreen() {
  const router = useRouter();

  const openFeature = (route: string) => {
    router.push(route as any);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.cream}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color={COLORS.dark}
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>A LITTLE TIME FOR YOU</Text>
            <Text style={styles.heading}>Self-care</Text>
            <Text style={styles.subtitle}>
              You care for everyone. Remember to care for yourself, too.
            </Text>
          </View>

          <View style={styles.headerDecoration}>
            <Ionicons
              name="heart"
              size={25}
              color={COLORS.coral}
            />
          </View>
        </View>

        {/* Welcome card */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeIcon}>
            <Ionicons
              name="sunny-outline"
              size={27}
              color={COLORS.deepTeal}
            />
          </View>

          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeTitle}>
              Small moments matter
            </Text>
            <Text style={styles.welcomeText}>
              No pressure to do everything. Choose what feels right
              for you today.
            </Text>
          </View>
        </View>

        {/* Feature section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>
              Your wellness space
            </Text>
            <Text style={styles.sectionSubtitle}>
              Pick a little moment for yourself
            </Text>
          </View>

          <View style={styles.sectionAccent} />
        </View>

        {/* Self-care feature boxes */}
        <View style={styles.grid}>
          {selfCareItems.map((item, index) => (
            <Pressable
              key={item.title}
              onPress={() => openFeature(item.route)}
              style={({ pressed }) => [
                styles.featureCard,
                { backgroundColor: item.backgroundColor },
                index === 4 && styles.lastCard,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}
            >
              <View style={styles.cardTop}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: COLORS.white },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={25}
                    color={item.iconColor}
                  />
                </View>

                <Ionicons
                  name="arrow-up-outline"
                  size={19}
                  color={COLORS.muted}
                  style={styles.arrowIcon}
                />
              </View>

              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSubtitle}>
                {item.subtitle}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Gentle reminder */}
        <View style={styles.reminderCard}>
          <View style={styles.reminderIcon}>
            <Ionicons
              name="flower-outline"
              size={22}
              color={COLORS.deepTeal}
            />
          </View>

          <View style={styles.reminderContent}>
            <Text style={styles.reminderTitle}>
              A gentle reminder
            </Text>
            <Text style={styles.reminderText}>
              Rest is productive, asking for help is okay, and you
              deserve kindness, too.
            </Text>
          </View>
        </View>

        <Text style={styles.footerText}>
          One small step is enough for today.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 22,
  },
  backButton: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  headerText: {
    flex: 1,
  },
  eyebrow: {
    color: COLORS.deepTeal,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  heading: {
    color: COLORS.dark,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
    paddingRight: 2,
  },
  headerDecoration: {
    width: 43,
    height: 43,
    borderRadius: 16,
    backgroundColor: "#FFF0ED",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    marginTop: 2,
  },
  welcomeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 23,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 27,
    borderWidth: 1,
    borderColor: "#F5EEDC",
  },
  welcomeIcon: {
    width: 49,
    height: 49,
    borderRadius: 17,
    backgroundColor: COLORS.yellow,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeTitle: {
    color: COLORS.dark,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 5,
  },
  welcomeText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    color: COLORS.dark,
    fontSize: 19,
    fontWeight: "800",
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  sectionAccent: {
    width: 34,
    height: 5,
    borderRadius: 5,
    backgroundColor: COLORS.yellow,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 13,
  },
  featureCard: {
    width: "48.3%",
    minHeight: 151,
    borderRadius: 22,
    padding: 15,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  lastCard: {
    width: "48.3%",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 17,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  arrowIcon: {
    transform: [{ rotate: "45deg" }],
  },
  cardTitle: {
    color: COLORS.dark,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 5,
  },
  cardSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 16,
  },
  reminderCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginTop: 25,
    borderWidth: 1,
    borderColor: "#F2EBDD",
  },
  reminderIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.paleTeal,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    color: COLORS.dark,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 5,
  },
  reminderText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
  },
  footerText: {
    color: COLORS.muted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 20,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
