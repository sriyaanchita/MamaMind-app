import { useRouter } from "expo-router";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SafeAreaView,
  StatusBar,
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

export default function RoleSelection() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={C.cream}
      />

      <View style={styles.container}>

        {/* BACK */}

        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>
            ← Back
          </Text>
        </Pressable>

        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>
              ✿
            </Text>
          </View>

          <Text style={styles.brand}>
            MamaMind
          </Text>
        </View>

        {/* CONTENT */}

        <View style={styles.content}>

          <View style={styles.pill}>
            <View style={styles.pillDot} />

            <Text style={styles.pillText}>
              LET'S GET STARTED
            </Text>
          </View>

          <Text style={styles.title}>
            Tell us a little{"\n"}
            <Text style={styles.titleAccent}>
              about your role.
            </Text>
          </Text>

          <Text style={styles.subtitle}>
            This helps us create the right MamaMind
            experience for you and your family.
          </Text>


          {/* MOTHER */}

          <Pressable
            style={({ pressed }) => [
              styles.roleCard,
              pressed && styles.pressed,
            ]}
            onPress={() =>
              router.push("/signup?role=mother")
            }
          >
            <View
              style={[
                styles.iconCircle,
                styles.motherIcon,
              ]}
            >
              <Text style={styles.icon}>
                🤱🏻
              </Text>
            </View>

            <View style={styles.roleInfo}>
              <Text style={styles.roleTitle}>
                Mother
              </Text>

              <Text style={styles.roleDescription}>
                I’m a mother and I’m looking
                for support and wellbeing.
              </Text>
            </View>

            <View style={styles.arrowCircle}>
              <Text style={styles.arrow}>
                →
              </Text>
            </View>
          </Pressable>


          {/* FATHER */}

          <Pressable
            style={({ pressed }) => [
              styles.roleCard,
              pressed && styles.pressed,
            ]}
            onPress={() =>
              router.push("/signup?role=father")
            }
          >
            <View
              style={[
                styles.iconCircle,
                styles.fatherIcon,
              ]}
            >
              <Text style={styles.icon}>
                👨🏻
              </Text>
            </View>

            <View style={styles.roleInfo}>
              <Text style={styles.roleTitle}>
                Father
              </Text>

              <Text style={styles.roleDescription}>
                I’m a father and I want to
                support Mama and our baby.
              </Text>
            </View>

            <View style={styles.arrowCircle}>
              <Text style={styles.arrow}>
                →
              </Text>
            </View>
          </Pressable>


          {/* NOTE */}

          <View style={styles.note}>
            <View style={styles.noteIcon}>
              <Text>💛</Text>
            </View>

            <Text style={styles.noteText}>
              You can always change or update
              your information later.
            </Text>
          </View>

        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.cream,
  },

  container: {
    flex: 1,
    backgroundColor: C.cream,
    paddingHorizontal: 24,
  },

  /* BACK */

  backButton: {
    position: "absolute",
    top: 20,
    left: 24,
    zIndex: 10,
    padding: 8,
  },

  backText: {
    color: C.deepTeal,
    fontSize: 13,
    fontWeight: "800",
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 25,
  },

  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.teal,
    justifyContent: "center",
    alignItems: "center",
  },

  logoText: {
    color: C.white,
    fontSize: 22,
  },

  brand: {
    color: C.dark,
    fontSize: 21,
    fontWeight: "900",
    marginLeft: 9,
  },

  /* CONTENT */

  content: {
    flex: 1,
    justifyContent: "center",
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
  },

  pill: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.paleTeal,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 30,
    marginBottom: 18,
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
    letterSpacing: 1.3,
  },

  title: {
    color: C.dark,
    fontSize: 35,
    lineHeight: 40,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -1,
  },

  titleAccent: {
    color: C.deepTeal,
  },

  subtitle: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 28,
    paddingHorizontal: 15,
  },

  /* ROLE CARDS */

  roleCard: {
    width: "100%",
    minHeight: 105,
    backgroundColor: C.white,
    borderRadius: 25,
    marginBottom: 14,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",

    borderWidth: 1,
    borderColor: "#E1ECE9",

    shadowColor: C.dark,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },

  pressed: {
    transform: [{ scale: 0.97 }],
  },

  iconCircle: {
    width: 65,
    height: 65,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  motherIcon: {
    backgroundColor: "#FFE5E1",
  },

  fatherIcon: {
    backgroundColor: "#FFF2B8",
  },

  icon: {
    fontSize: 32,
  },

  roleInfo: {
    flex: 1,
    paddingRight: 8,
  },

  roleTitle: {
    color: C.dark,
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 4,
  },

  roleDescription: {
    color: C.muted,
    fontSize: 10,
    lineHeight: 15,
  },

  arrowCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.deepTeal,
    justifyContent: "center",
    alignItems: "center",
  },

  arrow: {
    color: C.yellow,
    fontSize: 19,
    fontWeight: "900",
  },

  /* NOTE */

  note: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.paleTeal,
    borderRadius: 18,
    padding: 12,
    marginTop: 10,
  },

  noteIcon: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: C.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  noteText: {
    flex: 1,
    color: C.muted,
    fontSize: 10,
    lineHeight: 15,
  },
});