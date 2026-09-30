import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";

export default function BabyDashboard() {
  const [feeding, setFeeding] = useState(0);
  const [sleep, setSleep] = useState(0);
  const [diapers, setDiapers] = useState(0);

  const [milestones, setMilestones] = useState([
    "First smile ♡",
    "Held head up",
  ]);

  const addMilestone = () => {
    setMilestones([
      ...milestones,
      "New little milestone ✨",
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.label}>SHARED BABY SPACE</Text>

      <Text style={styles.title}>
        Little moments,
        {"\n"}big memories.
      </Text>

      <Text style={styles.subtitle}>
        A shared space for Mama and Dad to keep track
        of the little things that matter.
      </Text>

      {/* Baby header */}

      <View style={styles.babyHero}>
        <View style={styles.babyCircle}>
          <Text style={styles.babySymbol}>♡</Text>
        </View>

        <View style={styles.babyInfo}>
          <Text style={styles.babyName}>
            Our Little One
          </Text>

          <Text style={styles.babyStatus}>
            Growing every day ✨
          </Text>
        </View>
      </View>

      {/* Today's care */}

      <Text style={styles.sectionTitle}>
        Today's Care
      </Text>

      <View style={styles.statsRow}>

        <View style={styles.statCard}>
          <Text style={styles.statSymbol}>◌</Text>

          <Text style={styles.statNumber}>
            {feeding}
          </Text>

          <Text style={styles.statLabel}>
            Feeds
          </Text>

          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => setFeeding(feeding + 1)}
          >
            <Text style={styles.smallButtonText}>
              + Log
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statSymbol}>☼</Text>

          <Text style={styles.statNumber}>
            {sleep}
          </Text>

          <Text style={styles.statLabel}>
            Sleep
          </Text>

          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => setSleep(sleep + 1)}
          >
            <Text style={styles.smallButtonText}>
              + Log
            </Text>
          </TouchableOpacity>
        </View>

      </View>

      <View style={styles.statsRow}>

        <View style={styles.statCard}>
          <Text style={styles.statSymbol}>○</Text>

          <Text style={styles.statNumber}>
            {diapers}
          </Text>

          <Text style={styles.statLabel}>
            Diapers
          </Text>

          <TouchableOpacity
            style={styles.smallButton}
            onPress={() => setDiapers(diapers + 1)}
          >
            <Text style={styles.smallButtonText}>
              + Log
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statSymbol}>♡</Text>

          <Text style={styles.statNumber}>
            Happy
          </Text>

          <Text style={styles.statLabel}>
            Baby today
          </Text>

          <TouchableOpacity
            style={styles.smallButton}
          >
            <Text style={styles.smallButtonText}>
              Update
            </Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* Who updated */}

      <View style={styles.sharedCard}>
        <Text style={styles.sharedLabel}>
          SHARED CARE
        </Text>

        <Text style={styles.sharedTitle}>
          Mama + Dad
        </Text>

        <Text style={styles.sharedText}>
          Both parents can update baby's care records,
          so neither has to remember everything alone.
        </Text>
      </View>

      {/* Memories */}

      <Text style={styles.sectionTitle}>
        Baby Memories
      </Text>

      <View style={styles.memoryCard}>
        <View style={styles.memoryPlaceholder}>
          <Text style={styles.memorySymbol}>
            +
          </Text>
        </View>

        <View style={styles.memoryContent}>
          <Text style={styles.memoryTitle}>
            Save a little moment
          </Text>

          <Text style={styles.memoryText}>
            Add photos and memories as your baby grows.
          </Text>

          <TouchableOpacity>
            <Text style={styles.memoryButton}>
              Add Memory →
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Milestones */}

      <Text style={styles.sectionTitle}>
        Little Milestones
      </Text>

      {milestones.map((item, index) => (
        <View key={index} style={styles.milestone}>
          <View style={styles.milestoneDot} />

          <Text style={styles.milestoneText}>
            {item}
          </Text>
        </View>
      ))}

      <TouchableOpacity
        style={styles.addMilestone}
        onPress={addMilestone}
      >
        <Text style={styles.addMilestoneText}>
          + Add a milestone
        </Text>
      </TouchableOpacity>

      {/* Supplies */}

      <View style={styles.suppliesCard}>
        <Text style={styles.suppliesLabel}>
          COMING UP
        </Text>

        <Text style={styles.suppliesTitle}>
          Baby supplies
        </Text>

        <Text style={styles.suppliesText}>
          Keep track of diapers, wipes, formula and
          other monthly essentials.
        </Text>

        <TouchableOpacity>
          <Text style={styles.suppliesButton}>
            View Supplies →
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8F6",
  },

  content: {
    padding: 22,
    paddingBottom: 60,
  },

  backButton: {
    marginTop: 45,
    marginBottom: 28,
  },

  backText: {
    fontSize: 15,
    color: "#6F6268",
    fontWeight: "600",
  },

  label: {
    fontSize: 11,
    letterSpacing: 2,
    color: "#829571",
    fontWeight: "700",
  },

  title: {
    fontSize: 37,
    lineHeight: 43,
    fontWeight: "700",
    color: "#2D2A2A",
    marginTop: 10,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: "#756B70",
    marginTop: 12,
  },

  babyHero: {
    backgroundColor: "#E9F0E4",
    borderRadius: 28,
    padding: 22,
    marginTop: 25,
    flexDirection: "row",
    alignItems: "center",
  },

  babyCircle: {
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor: "#FFFDFB",
    alignItems: "center",
    justifyContent: "center",
  },

  babySymbol: {
    fontSize: 45,
    color: "#7F9272",
  },

  babyInfo: {
    marginLeft: 17,
  },

  babyName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2D2A2A",
  },

  babyStatus: {
    fontSize: 13,
    color: "#65745B",
    marginTop: 5,
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2D2A2A",
    marginTop: 30,
    marginBottom: 15,
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
  },

  statSymbol: {
    fontSize: 25,
    color: "#A47A7B",
  },

  statNumber: {
    fontSize: 27,
    fontWeight: "700",
    color: "#2D2A2A",
    marginTop: 8,
  },

  statLabel: {
    fontSize: 13,
    color: "#817579",
    marginTop: 2,
  },

  smallButton: {
    backgroundColor: "#FCE8E6",
    borderRadius: 18,
    paddingVertical: 9,
    alignItems: "center",
    marginTop: 12,
  },

  smallButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8F686A",
  },

  sharedCard: {
    backgroundColor: "#FCE8E6",
    borderRadius: 24,
    padding: 22,
    marginTop: 10,
  },

  sharedLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#A47A7B",
    fontWeight: "700",
  },

  sharedTitle: {
    fontSize: 23,
    fontWeight: "700",
    color: "#2D2A2A",
    marginTop: 7,
  },

  sharedText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#6E6268",
    marginTop: 8,
  },

  memoryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
  },

  memoryPlaceholder: {
    width: 105,
    height: 105,
    borderRadius: 18,
    backgroundColor: "#FFF0D8",
    alignItems: "center",
    justifyContent: "center",
  },

  memorySymbol: {
    fontSize: 35,
    color: "#C58C63",
  },

  memoryContent: {
    flex: 1,
    marginLeft: 15,
    justifyContent: "center",
  },

  memoryTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#2D2A2A",
  },

  memoryText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#7A7074",
    marginTop: 5,
  },

  memoryButton: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8C6D57",
    marginTop: 9,
  },

  milestone: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  milestoneDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#A8B49A",
    marginRight: 13,
  },

  milestoneText: {
    fontSize: 15,
    color: "#40383B",
    fontWeight: "600",
  },

  addMilestone: {
    borderWidth: 1.5,
    borderColor: "#829571",
    borderRadius: 25,
    paddingVertical: 13,
    alignItems: "center",
  },

  addMilestoneText: {
    color: "#65745B",
    fontWeight: "700",
  },

  suppliesCard: {
    backgroundColor: "#E9F0E4",
    borderRadius: 25,
    padding: 22,
    marginTop: 30,
  },

  suppliesLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#69745F",
    fontWeight: "700",
  },

  suppliesTitle: {
    fontSize: 23,
    fontWeight: "700",
    color: "#2D2A2A",
    marginTop: 7,
  },

  suppliesText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#687064",
    marginTop: 7,
  },

  suppliesButton: {
    color: "#53604D",
    fontWeight: "700",
    marginTop: 13,
  },
});