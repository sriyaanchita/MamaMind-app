import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";

import MeditationIllustration from "../../assets/undraw_meditation_k4oa.svg";
import JournalIllustration from "../../assets/Notebook-bro.svg";
import CommunityIllustration from "../../assets/Women talking-pana.svg";

export default function Care() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.smallTitle}>YOUR WELLBEING</Text>

        <Text style={styles.title}>
          A little time{"\n"}for you.
        </Text>

        <Text style={styles.subtitle}>
          Choose something that feels good right now.
        </Text>
      </View>

      {/* Meditation */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push("/meditation")}
      >
        <MeditationIllustration width="100%" height={170} />

        <Text style={styles.cardTitle}>Meditation</Text>

        <Text style={styles.cardText}>
          Take five quiet minutes to breathe and reset.
        </Text>

        <View style={styles.button}>
          <Text style={styles.buttonText}>Take a moment</Text>
        </View>
      </TouchableOpacity>

      {/* Journal */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push("/journal")}
      >
        <JournalIllustration width="100%" height={170} />

        <Text style={styles.cardTitle}>Journal</Text>

        <Text style={styles.cardText}>
          Write whatever is on your mind. No rules.
        </Text>

        <View style={styles.button}>
          <Text style={styles.buttonText}>Write something</Text>
        </View>
      </TouchableOpacity>

      {/* Happy Jar */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push("/happy-jar")}
      >
        <Text style={styles.jar}>♡</Text>

        <Text style={styles.cardTitle}>Happy Jar</Text>

        <Text style={styles.cardText}>
          Save one little moment that made you smile.
        </Text>

        <View style={styles.button}>
          <Text style={styles.buttonText}>Add a happy moment</Text>
        </View>
      </TouchableOpacity>

      {/* Support */}
      <TouchableOpacity
        style={styles.supportCard}
        onPress={() => router.push("/support")}
      >
        <Text style={styles.supportTitle}>
          You don't have to handle everything alone.
        </Text>

        <Text style={styles.cardText}>
          Find a quiet moment, write, breathe or reach out.
        </Text>

        <View style={styles.supportButton}>
          <Text style={styles.buttonText}>I need some support</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8F6",
    paddingHorizontal: 22,
  },

  header: {
    marginTop: 60,
    marginBottom: 28,
  },

  smallTitle: {
    fontSize: 11,
    letterSpacing: 2,
    color: "#8D7C81",
    fontWeight: "700",
  },

  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "700",
    color: "#2D2A2A",
    marginTop: 10,
  },

  subtitle: {
    fontSize: 15,
    color: "#7A6E74",
    lineHeight: 22,
    marginTop: 10,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
  },

  cardTitle: {
    fontSize: 25,
    fontWeight: "700",
    color: "#2D2A2A",
    marginTop: 10,
  },

  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6E6268",
    marginTop: 8,
  },

  button: {
    backgroundColor: "#2D2A2A",
    alignSelf: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 18,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  jar: {
    fontSize: 70,
    textAlign: "center",
    marginVertical: 15,
    color: "#F3A39B",
  },

  supportCard: {
    backgroundColor: "#F8D2CD",
    borderRadius: 28,
    padding: 24,
    marginBottom: 50,
  },

  supportTitle: {
    fontSize: 25,
    lineHeight: 32,
    fontWeight: "700",
    color: "#2D2A2A",
  },

  supportButton: {
    backgroundColor: "#2D2A2A",
    alignSelf: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
  },
});