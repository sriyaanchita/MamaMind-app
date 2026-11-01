
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

type ActivityStatus =
  | "Walking"
  | "Active"
  | "Resting"
  | "No movement data";

type WearableData = {
  heartRate: number | null;
  spo2: number | null;
  steps: number | null;
  walkingMinutes: number | null;
  activeMinutes: number | null;
  activity: ActivityStatus;
  movementDetected: boolean | null;
  connected: boolean;
  lastUpdated: string | null;
};

const DEMO_DATA: WearableData = {
  heartRate: 82,
  spo2: 98,
  steps: 3240,
  walkingMinutes: 28,
  activeMinutes: 46,
  activity: "Walking",
  movementDetected: true,
  connected: false,
  lastUpdated: new Date().toISOString(),
};

function formatValue(
  value: number | null,
  suffix = ""
): string {
  return value === null ? "--" : `${value}${suffix}`;
}

function getWellnessMessage(data: WearableData): string {
  if (!data.connected) {
    return "Connect your wearable to receive real readings.";
  }

  if (data.heartRate === null) {
    return "Waiting for a valid heart-rate reading.";
  }

  if (
    data.activity === "Walking" ||
    data.activity === "Active"
  ) {
    return "Movement can naturally raise your heart rate. Check again when resting.";
  }

  if (data.heartRate > 100) {
    return "Your heart rate is elevated for a resting reading. Rest comfortably and check again.";
  }

  return "Take a moment to check how you feel. Your heart rate alone cannot determine stress.";
}

function MetricCard({
  title,
  value,
  unit,
  description,
}: {
  title: string;
  value: string;
  unit: string;
  description: string;
}) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>

      <View style={styles.valueRow}>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricUnit}>{unit}</Text>
      </View>

      <Text style={styles.metricDescription}>
        {description}
      </Text>
    </View>
  );
}

export default function WearableDashboard() {
  const [demoMode, setDemoMode] = useState(true);
  const [showHeartRate, setShowHeartRate] = useState(false);

  // Restart the 8-second delay whenever this screen gains focus.
  useFocusEffect(
    useCallback(() => {
      setShowHeartRate(false);

      const timer = setTimeout(() => {
        setShowHeartRate(true);
      }, 8000);

      return () => clearTimeout(timer);
    }, [])
  );

  const data: WearableData = demoMode
    ? DEMO_DATA
    : {
        heartRate: null,
        spo2: null,
        steps: null,
        walkingMinutes: null,
        activeMinutes: null,
        activity: "No movement data",
        movementDetected: null,
        connected: false,
        lastUpdated: null,
      };

  const steps = data.steps ?? 0;
  const stepGoal = 6000;
  const progress = Math.min(steps / stepGoal, 1);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.eyebrow}>
          MAMAMIND WELLNESS
        </Text>

        <Text style={styles.heading}>
          Your wearable
        </Text>

        <Text style={styles.subtitle}>
          Understand your activity and wellness patterns.
        </Text>

        {/* Connection status */}
        <View style={styles.connectionCard}>
          <View style={styles.connectionRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: data.connected
                    ? "#16866D"
                    : "#D69A31",
                },
              ]}
            />

            <Text style={styles.connectionTitle}>
              {data.connected
                ? "Device connected"
                : "Device not connected"}
            </Text>
          </View>

          <Text style={styles.connectionDescription}>
            {demoMode
              ? "DEMO DATA — these are example readings, not live measurements."
              : "Live readings will appear here after BLE integration."}
          </Text>

          <Pressable
            accessibilityRole="button"
            style={styles.modeButton}
            onPress={() =>
              setDemoMode((previous) => !previous)
            }
          >
            <Text style={styles.modeButtonText}>
              {demoMode
                ? "Switch to waiting for device"
                : "Show demo data"}
            </Text>
          </Pressable>
        </View>

        {/* Body measurements */}
        <Text style={styles.sectionTitle}>
          Body measurements
        </Text>

        <View style={styles.metricsGrid}>
          <MetricCard
            title="Heart rate"
            value={
              showHeartRate
                ? formatValue(data.heartRate)
                : "--"
            }
            unit="BPM"
            description={
              showHeartRate
                ? "Beats per minute"
                : "Waiting for reading..."
            }
          />

          <MetricCard
            title="Blood oxygen"
            value={formatValue(data.spo2)}
            unit="%"
            description="Estimated SpO₂"
          />
        </View>

        {/* Today's activity */}
        <Text style={styles.sectionTitle}>
          Today's activity
        </Text>

        <View style={styles.stepsCard}>
          <Text style={styles.cardLabel}>
            Total steps
          </Text>

          <View style={styles.valueRow}>
            <Text style={styles.stepsValue}>
              {data.steps?.toLocaleString("en-IN") ?? "--"}
            </Text>

            <Text style={styles.metricUnit}>
              / {stepGoal.toLocaleString("en-IN")}
            </Text>
          </View>

          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%` },
              ]}
            />
          </View>

          <Text style={styles.mutedText}>
            Daily step goal: {stepGoal.toLocaleString("en-IN")}
          </Text>

          <View style={styles.activityStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatValue(data.walkingMinutes, " min")}
              </Text>

              <Text style={styles.statLabel}>
                Walking
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatValue(data.activeMinutes, " min")}
              </Text>

              <Text style={styles.statLabel}>
                Active time
              </Text>
            </View>
          </View>
        </View>

        {/* Current activity */}
        <Text style={styles.sectionTitle}>
          Current activity
        </Text>

        <View style={styles.activityCard}>
          <Text style={styles.activityStatus}>
            {data.activity}
          </Text>

          <Text style={styles.mutedText}>
            Movement detected:{" "}
            {data.movementDetected === null
              ? "Waiting for sensor"
              : data.movementDetected
                ? "Yes"
                : "No"}
          </Text>

          <Text style={styles.connectionDescription}>
            Activity classification will use movement readings
            from the MPU6050 when connected.
          </Text>
        </View>

        {/* Wellness check-in */}
        <Text style={styles.sectionTitle}>
          Wellness check-in
        </Text>

        <View style={styles.wellnessCard}>
          <Text style={styles.wellnessHeading}>
            A gentle reminder
          </Text>

          <Text style={styles.wellnessMessage}>
            {getWellnessMessage(data)}
          </Text>

          <Text style={styles.disclaimer}>
            Heart rate and SpO₂ readings cannot diagnose stress
            or determine a person's emotional state. Sensor
            readings may be inaccurate or unavailable.
          </Text>
        </View>

        {/* Last updated */}
        <Text style={styles.footer}>
          Last updated:{" "}
          {data.lastUpdated
            ? new Date(data.lastUpdated).toLocaleTimeString()
            : "No readings yet"}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF9E8",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  eyebrow: {
    color: "#0E7C86",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  heading: {
    color: "#164F52",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 8,
  },
  subtitle: {
    color: "#648384",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
    marginBottom: 20,
  },
  connectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E8F0E9",
  },
  connectionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginRight: 9,
  },
  connectionTitle: {
    color: "#164F52",
    fontSize: 16,
    fontWeight: "700",
  },
  connectionDescription: {
    color: "#648384",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  modeButton: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F8F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
  },
  modeButtonText: {
    color: "#0E7C86",
    fontSize: 13,
    fontWeight: "700",
  },
  sectionTitle: {
    color: "#164F52",
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E8F0E9",
  },
  metricTitle: {
    color: "#648384",
    fontSize: 13,
    fontWeight: "600",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    marginTop: 10,
  },
  metricValue: {
    color: "#164F52",
    fontSize: 30,
    fontWeight: "800",
  },
  metricUnit: {
    color: "#648384",
    fontSize: 12,
    marginLeft: 5,
  },
  metricDescription: {
    color: "#648384",
    fontSize: 11,
    marginTop: 9,
  },
  stepsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E8F0E9",
  },
  cardLabel: {
    color: "#648384",
    fontSize: 14,
    fontWeight: "600",
  },
  stepsValue: {
    color: "#164F52",
    fontSize: 34,
    fontWeight: "800",
  },
  progressBackground: {
    height: 9,
    backgroundColor: "#E8F8F6",
    borderRadius: 5,
    overflow: "hidden",
    marginTop: 16,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#19B7B0",
    borderRadius: 5,
  },
  mutedText: {
    color: "#648384",
    fontSize: 13,
    marginTop: 10,
  },
  activityStats: {
    flexDirection: "row",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E8F0E9",
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    color: "#164F52",
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    color: "#648384",
    fontSize: 12,
    marginTop: 5,
  },
  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E8F0E9",
  },
  activityStatus: {
    color: "#0E7C86",
    fontSize: 23,
    fontWeight: "800",
  },
  wellnessCard: {
    backgroundColor: "#E8F8F6",
    borderRadius: 18,
    padding: 18,
  },
  wellnessHeading: {
    color: "#164F52",
    fontSize: 17,
    fontWeight: "700",
  },
  wellnessMessage: {
    color: "#164F52",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  disclaimer: {
    color: "#648384",
    fontSize: 11,
    lineHeight: 17,
    marginTop: 14,
  },
  footer: {
    color: "#648384",
    fontSize: 12,
    marginTop: 20,
    textAlign: "center",
  },
});
