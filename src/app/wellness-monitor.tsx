
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
} from "react-native";
import { Accelerometer } from "expo-sensors";

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

export default function WellnessMonitorScreen() {
  const [movement, setMovement] = useState(0);
  const [active, setActive] = useState(false);
  const [tracking, setTracking] = useState(true);

  // Demo values only — not measured by a heart-rate or SpO₂ sensor.
  const [heartRate] = useState(76);
  const [spo2] = useState(98);

  const lastShake = useRef(0);

  useEffect(() => {
    if (!tracking) {
      setActive(false);
      return;
    }

    Accelerometer.setUpdateInterval(150);

    const subscription = Accelerometer.addListener(({ x, y, z }) => {
      const magnitude = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();

      // A shake creates one movement event, with a cooldown.
      if (
        Math.abs(magnitude - 1) > 0.65 &&
        now - lastShake.current > 900
      ) {
        lastShake.current = now;
        setMovement((previous) => previous + 1);
        setActive(true);
      }
    });

    return () => subscription.remove();
  }, [tracking]);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cream} />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.brand}>MamaMind</Text>
        <Text style={styles.heading}>Mama's Wellness</Text>
        <Text style={styles.subtitle}>
          A little check-in for your wellbeing
        </Text>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.cardLabel}>MOVEMENT STATUS</Text>
              <Text style={styles.statusTitle}>
                {active ? "Movement detected" : "Waiting for movement"}
              </Text>
              <Text style={styles.smallText}>
                {tracking
                  ? "Shake your phone to test the demo"
                  : "Monitoring is paused"}
              </Text>
            </View>

            <View
              style={[
                styles.statusDot,
                { backgroundColor: active ? C.teal : C.muted },
              ]}
            />
          </View>

          <View style={styles.movementRow}>
            <View>
              <Text style={styles.movementCount}>{movement}</Text>
              <Text style={styles.smallText}>Movement events</Text>
            </View>
            <Text style={styles.movementIcon}>~</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Vital signs</Text>
        <Text style={styles.demoNotice}>
          DEMO MODE · Heart rate and SpO₂ are simulated
        </Text>

        <View style={styles.vitalsRow}>
          <View style={styles.vitalCard}>
            <View style={[styles.iconCircle, { backgroundColor: "#FFE8E5" }]}>
              <Text style={styles.heartIcon}>♥</Text>
            </View>
            <Text style={styles.vitalLabel}>Heart rate</Text>
            <View style={styles.valueRow}>
              <Text style={styles.vitalValue}>{heartRate}</Text>
              <Text style={styles.unit}>bpm</Text>
            </View>
            <Text style={styles.vitalFoot}>Simulated value</Text>
          </View>

          <View style={styles.vitalCard}>
            <View style={[styles.iconCircle, { backgroundColor: C.paleTeal }]}>
              <Text style={styles.oxygenIcon}>O₂</Text>
            </View>
            <Text style={styles.vitalLabel}>Blood oxygen</Text>
            <View style={styles.valueRow}>
              <Text style={styles.vitalValue}>{spo2}</Text>
              <Text style={styles.unit}>%</Text>
            </View>
            <Text style={styles.vitalFoot}>Simulated value</Text>
          </View>
        </View>

        <View style={styles.activityCard}>
          <Text style={styles.sectionTitle}>Activity overview</Text>
          <View style={styles.activityRow}>
            <Text style={styles.activityLabel}>Movement events</Text>
            <Text style={styles.activityValue}>{movement}</Text>
          </View>
          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(movement * 5, 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.smallText}>
            This bar represents demo movement events, not verified steps.
          </Text>
        </View>

        <Pressable
          style={[
            styles.primaryButton,
            { backgroundColor: tracking ? C.deepTeal : C.teal },
          ]}
          onPress={() => setTracking((previous) => !previous)}
        >
          <Text style={styles.primaryButtonText}>
            {tracking ? "Pause monitoring" : "Start monitoring"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.resetButton}
          onPress={() => {
            setMovement(0);
            setActive(false);
            lastShake.current = Date.now();
          }}
        >
          <Text style={styles.resetText}>Reset movement count</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          Prototype only. Phone shaking detects movement events. Heart rate
          and blood oxygen are fixed demo values, not live measurements.
          Do not use this screen for medical decisions.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.cream,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  brand: {
    color: C.deepTeal,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 12,
  },
  heading: {
    color: C.dark,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 8,
  },
  subtitle: {
    color: C.muted,
    fontSize: 14,
    marginTop: 6,
    marginBottom: 22,
  },
  statusCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: C.paleTeal,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  statusTitle: {
    color: C.dark,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 8,
  },
  smallText: {
    color: C.muted,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  movementRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 22,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.paleTeal,
  },
  movementCount: {
    color: C.deepTeal,
    fontSize: 44,
    fontWeight: "800",
  },
  movementIcon: {
    color: C.teal,
    fontSize: 48,
    fontWeight: "800",
  },
  sectionTitle: {
    color: C.dark,
    fontSize: 19,
    fontWeight: "800",
    marginTop: 24,
    marginBottom: 12,
  },
  demoNotice: {
    color: C.deepTeal,
    backgroundColor: C.paleTeal,
    padding: 10,
    borderRadius: 10,
    fontSize: 10,
    fontWeight: "800",
    overflow: "hidden",
    marginBottom: 12,
  },
  vitalsRow: {
    flexDirection: "row",
    gap: 12,
  },
  vitalCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: C.paleTeal,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heartIcon: {
    color: C.coral,
    fontSize: 24,
  },
  oxygenIcon: {
    color: C.deepTeal,
    fontSize: 18,
    fontWeight: "800",
  },
  vitalLabel: {
    color: C.muted,
    fontSize: 12,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    marginTop: 8,
  },
  vitalValue: {
    color: C.dark,
    fontSize: 30,
    fontWeight: "800",
  },
  unit: {
    color: C.muted,
    fontSize: 12,
    marginLeft: 4,
  },
  vitalFoot: {
    color: C.muted,
    fontSize: 10,
    marginTop: 8,
  },
  activityCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: C.paleTeal,
  },
  activityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  activityLabel: {
    color: C.dark,
    fontSize: 14,
  },
  activityValue: {
    color: C.deepTeal,
    fontSize: 16,
    fontWeight: "800",
  },
  progressBackground: {
    height: 9,
    backgroundColor: C.paleTeal,
    borderRadius: 6,
    marginTop: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: 9,
    backgroundColor: C.teal,
    borderRadius: 6,
  },
  primaryButton: {
    padding: 16,
    alignItems: "center",
    borderRadius: 15,
    marginTop: 22,
  },
  primaryButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: "800",
  },
  resetButton: {
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  resetText: {
    color: C.deepTeal,
    fontWeight: "700",
  },
  disclaimer: {
    color: C.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 12,
  },
});
