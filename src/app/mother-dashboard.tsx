
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Animated,
  Easing,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  estimateWellness,
  WellnessResult,
} from "@/utils/wellnessEngine";
import {
  getSelfCareRecommendation,
  SelfCareRecommendation,
} from "@/utils/selfCareEngine";
import { logActivity } from "@/utils/activityLogger";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import * as Speech from "expo-speech";
import { db } from "@/services/firebase";
import { getMyFamily } from "@/utils/familyService";
import { collection, doc, onSnapshot, runTransaction, type DocumentReference } from "firebase/firestore";

type SupportOffer = { id: number; message: string; createdAt: string; status: 'pending' | 'accepted' | 'later' };
type FamilyNote = { id: number; message: string; createdAt: string; read: boolean };


/* =========================================================
   MAMAMIND COLOUR PALETTE — UNCHANGED
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
};

/* =========================================================
   SCREEN
========================================================= */

export default function MotherDashboard() {
  const router = useRouter();
  const [familyNotes, setFamilyNotes] = useState<FamilyNote[]>([]);
  const [supportOffers, setSupportOffers] = useState<SupportOffer[]>([]);
  const [notesRef, setNotesRef] = useState<DocumentReference | null>(null);
  const [notesError, setNotesError] = useState("");
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [offersExpanded, setOffersExpanded] = useState(false);

  // Compact family-care overview. These listeners read only family-shared data.
  const [careExpanded, setCareExpanded] = useState(false);
  const [careSupplies, setCareSupplies] = useState<any[]>([]);
  const [restSessions, setRestSessions] = useState<any[]>([]);
  const [responsibilities, setResponsibilities] = useState<any[]>([]);
  const [comfortLogs, setComfortLogs] = useState<any[]>([]);
  const [careError, setCareError] = useState("");

  useEffect(() => {
    let mounted = true;
    const unsubscribers: Array<() => void> = [];
    (async () => {
      try {
        const family = await getMyFamily();
        if (!mounted || !family?.familyId) return;
        const base = ["families", family.familyId] as const;
        const listen = (path: string, update: (items: any[]) => void) => {
          const unsubscribe = onSnapshot(
            collection(db, ...base, path),
            snapshot => { if (mounted) update(snapshot.docs.map(d => ({ id: d.id, ...d.data() }))); },
            error => { if (mounted) setCareError("Family updates are temporarily unavailable."); console.warn(path, error); }
          );
          unsubscribers.push(unsubscribe);
        };
        listen("careSupplies", setCareSupplies);
        listen("restSessions", setRestSessions);
        listen("familyResponsibilities", setResponsibilities);
        listen("babyComfortLogs", setComfortLogs);
      } catch (error) {
        if (mounted) setCareError("Connect with Dad to see family care updates.");
        console.warn("Family care setup", error);
      }
    })();
    return () => { mounted = false; unsubscribers.forEach(unsubscribe => unsubscribe()); };
  }, []);

  const lowSupplies = careSupplies.filter(item =>
    typeof item.quantity === "number" && typeof item.threshold === "number" && item.quantity <= item.threshold
  );
  const activeRest = restSessions.find(session => session.status === "active");
  const latestHandover = restSessions
    .filter(session => session.status === "completed")
    .sort((a, b) => (b.endedAt?.toMillis?.() || 0) - (a.endedAt?.toMillis?.() || 0))[0];
  const completedResponsibilities = responsibilities.filter(item => item.completedAt != null);
  const latestComfort = [...comfortLogs]
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))[0];


  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;
    (async () => {
      try {
        const family = await getMyFamily();
        if (!active) return;
        if (!family?.familyId) {
          setNotesError("Connect with Dad to receive Little Notes.");
          return;
        }
        const ref = doc(db, "families", family.familyId, "sharedData", "current");
        setNotesRef(ref);
        unsubscribe = onSnapshot(ref, (snapshot) => {
          const raw = snapshot.data()?.encouragements;
          const rawOffers = snapshot.data()?.supportOffers;
          setSupportOffers(Array.isArray(rawOffers) ? rawOffers.filter((o): o is SupportOffer => typeof o?.message === 'string' && typeof o?.id === 'number') : []);
          setFamilyNotes(Array.isArray(raw) ? raw.filter((item): item is FamilyNote =>
            typeof item?.message === "string" && typeof item?.id === "number"
          ) : []);
          setNotesError("");
        }, (error) => {
          console.error("Little Notes listener:", error);
          setNotesError("Could not load Little Notes. Check your family connection.");
        });
      } catch (error) {
        console.error("Little Notes setup:", error);
        if (active) setNotesError("Could not connect to family notes.");
      }
    })();
    return () => { active = false; unsubscribe?.(); };
  }, []);

  const markNotesRead = async () => {
    if (!notesRef) return;
    try {
      await runTransaction(db, async (tx) => {
        const snapshot = await tx.get(notesRef);
        if (!snapshot.exists()) return;
        const notes = snapshot.data().encouragements;
        if (!Array.isArray(notes)) return;
        tx.update(notesRef, {
          encouragements: notes.map((note) => ({ ...note, read: true })),
        });
      });
    } catch (error) {
      console.error("Mark notes read:", error);
      setNotesError("Couldn't mark notes as read. Please try again.");
    }
  };

  const respondToOffer = async (id: number, status: 'accepted' | 'later') => {
    if (!notesRef) return;
    try {
      await runTransaction(db, async tx => {
        const snap = await tx.get(notesRef);
        if (!snap.exists()) return;
        const offers = snap.data().supportOffers;
        if (!Array.isArray(offers)) return;
        tx.update(notesRef, { supportOffers: offers.map(o => o.id === id ? { ...o, status } : o) });
      });
    } catch (error) {
      console.error('Support offer response:', error);
      setNotesError('Could not send your response. Please try again.');
    }
  };

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceMessage, setVoiceMessage] = useState(
    "Tell me where you want to go."
  );

  const [wellness, setWellness] =
    useState<WellnessResult | null>(null);

  const [selfCareRecommendation, setSelfCareRecommendation] =
    useState<SelfCareRecommendation | null>(null);

  const pulse = useRef(new Animated.Value(1)).current;
  const backgroundFloat = useRef(new Animated.Value(0)).current;
  const processingVoiceRef = useRef(false);

  /* =========================================================
     GEMINI VOICE API
     Android emulator: 10.0.2.2 reaches the development PC.
     Physical phone: replace with your PC's LAN IPv4 address.
  ========================================================= */


  useEffect(() => {
    if (isListening) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.08,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

      animation.start();

      return () => animation.stop();
    }

    pulse.stopAnimation();

    Animated.spring(pulse, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [isListening, pulse]);

  const sendVoiceToGemini = async (text: string) => {
    try {
      const response = await fetch(
        "http://localhost:3000/api/voice",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            message: text
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Gemini voice request failed:", error);

      setVoiceMessage(
        "I couldn't connect right now. Please try again."
      );

      return null;
    }
  };


  /* =========================================================
     WELLNESS ENGINE
  ========================================================= */

  const loadWellness = useCallback(async () => {
    try {
      const result = await estimateWellness();

      setWellness(result);

      const recommendation =
        getSelfCareRecommendation(result);

      setSelfCareRecommendation(recommendation);
    } catch (error) {
      console.error("Failed to load wellness:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWellness();
    }, [loadWellness])
  );

  /* =========================================================
     BACKGROUND ANIMATION
  ========================================================= */

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(backgroundFloat, {
          toValue: 1,
          duration: 6500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(backgroundFloat, {
          toValue: 0,
          duration: 6500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [backgroundFloat]);

  /* =========================================================
     MICROPHONE PULSE
  ========================================================= */


  /* =========================================================
     VOICE RECOGNITION EVENTS
  ========================================================= */

  useSpeechRecognitionEvent("start", () => {
    setIsListening(true);
    setTranscript("");
    setVoiceMessage("I'm listening...");
  });

  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent("result", async (event) => {
    if (processingVoiceRef.current) return;
    const spokenText =
      event.results?.[0]?.transcript?.trim() || "";

    if (!spokenText) return;

    processingVoiceRef.current = true;

    try {
      console.log("Mama said:", spokenText);

      setTranscript(spokenText);

      await logActivity("voice_input", {
        command: spokenText,
      });


      const request = spokenText.toLowerCase().trim();

      // Open MamaGo without changing the saved checklist.
      const isMamaGoOpenCommand =
        /\b(open|show|go to|take me to|bring up)\b.*\b(trip checklist|outing checklist|travel checklist|packing list|mama ?go)\b/i.test(request) ||
        /^(trip checklist|outing checklist|travel checklist|packing list|mama ?go)$/i.test(request);

      // Detect a destination and a request for packing advice.
      const hasDestination =
        /\b(hospital|doctor|clinic|temple|park|beach|picnic|mall|market|school|daycare|airport|train|station|wedding|function|trip|outing|travel|vacation|holiday)\b/i.test(request);

      const soundsLikePackingRequest =
        /\b(pack|packing|take|bring|need|checklist|things|items|what should|what do i|what do we|going to|visiting|travelling|traveling)\b/i.test(request);

      const isSpecificMamaGoRequest =
        hasDestination && soundsLikePackingRequest;

      if (isMamaGoOpenCommand || isSpecificMamaGoRequest) {
        const reply = isSpecificMamaGoRequest
          ? "I'll prepare a checklist for that outing."
          : "Opening your saved outing checklist.";

        setVoiceMessage(reply);
        Speech.speak(reply, {
          rate: 0.95,
          language: "en-US",
        });

        if (isSpecificMamaGoRequest) {
          router.push({
            pathname: "/mama-go",
            params: {
              request: spokenText,
              autoGenerate: "true",
            },
          });
        } else {
          router.push("/mama-go");
        }

        return;
      }


      setVoiceMessage("MamaMind is thinking...");

      const data = await sendVoiceToGemini(spokenText);

      if (!data) return;

      if (data.wellnessSignal) {
        await logActivity("mood", {
          value: data.wellnessSignal,
          source: "voice",
        });

        await loadWellness();
      }

      if (data.type === "navigation") {
        const reply = data.reply || "Opening it...";

        setVoiceMessage(reply);

        Speech.speak(reply, {
          rate: 0.95,
          language: "en-US",
        });

        switch (data.intent) {
          case "MOTHER_DASHBOARD":
            router.replace("/mother-dashboard");
            break;

          case "MEDITATION":
            router.push("/meditation");
            break;

          case "MEDICATION":
            router.push("/medication");
            break;

          case "BABY_DASHBOARD":
            router.push("/baby-dashboard");
            break;

          case "DAILY_CARE":
            router.push("/daily-care");
            break;

          case "SHARED_TASKS":
            router.push("/shared-tasks");
            break;

          case "COMMUNITY":
            router.push("/community");
            break;

          case "GAMES":
            router.push("/games");
            break;

          case "JOURNAL":
            router.push("/journal");
            break;

          case "HAPPY_JAR":
            router.push("/happy-jar");
            break;

          case "HEALTH_MONITOR":
            router.push("/health-monitor");
            break;

          case "BACK":
            router.back();
            break;

          default:
            setVoiceMessage(
              reply + " I couldn't identify that destination."
            );
        }

        return;
      }

      if (data.type === "conversation") {
        const reply = data.reply || "I'm here with you.";

        setVoiceMessage(reply);

        Speech.speak(reply, {
          rate: 0.9,
          pitch: 1,
          language: "en-US",
        });

        return;
      }

      setVoiceMessage(
        data.reply || "I'm here to help, Mama."
      );
    } catch (error) {
      console.error("Voice processing failed:", error);
      setVoiceMessage(
        "Something went wrong. Please try again."
      );
    } finally {
      processingVoiceRef.current = false;
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    setIsListening(false);

    console.log(
      "Speech recognition error:",
      event.error,
      event.message
    );

    setVoiceMessage(
      "I couldn't hear you. Please try again."
    );
  });

  /* =========================================================
     START / STOP VOICE
  ========================================================= */

  const handleVoice = async () => {
    try {
      if (isListening) {
        ExpoSpeechRecognitionModule.stop();
        setIsListening(false);
        return;
      }

      const permission =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();

      if (!permission.granted) {
        setVoiceMessage(
          "Microphone permission is needed so you can talk to MamaMind."
        );

        Speech.speak(
          "Please allow microphone access so you can talk to MamaMind.",
          { language: "en-US" }
        );

        return;
      }

      processingVoiceRef.current = false;
      setTranscript("");
      setVoiceMessage("I'm listening...");

      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: false,
        continuous: false,
      });
    } catch (error) {
      console.error("Voice error:", error);

      setIsListening(false);

      setVoiceMessage(
        "Voice isn't available right now. Please try again."
      );
    }
  };

  /* =========================================================
     NAVIGATION HELPER
  ========================================================= */

  const openScreen = (route: string) => {
    router.push(route as any);
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={C.cream}
      />

      {/* SOFT ANIMATED BACKGROUND */}

      <View
        pointerEvents="none"
        style={styles.backgroundLayer}
      >
        <Animated.View
          style={[
            styles.backgroundBlobOne,
            {
              transform: [
                {
                  translateY: backgroundFloat.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 18],
                  }),
                },
                {
                  translateX: backgroundFloat.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -10],
                  }),
                },
                {
                  scale: backgroundFloat.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.05],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.backgroundBlobTwo,
            {
              transform: [
                {
                  translateY: backgroundFloat.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -14],
                  }),
                },
                {
                  translateX: backgroundFloat.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 12],
                  }),
                },
                {
                  scale: backgroundFloat.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.04],
                  }),
                },
              ],
            },
          ]}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* COMPACT HEADER */}

        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerText}>
              <Text style={styles.greeting}>
                GOOD MORNING, MAMA
              </Text>

              <Text style={styles.heading}>
                Your little{"\n"}
                <Text style={styles.headingAccent}>
                  space is yours.
                </Text>
              </Text>
            </View>

            <View style={styles.headerHeart}>
              <Text style={styles.headerHeartText}>♡</Text>
            </View>
          </View>

          <Text style={styles.subtitle}>
            You care for everyone.
            {"\n"}
            Let MamaMind care for you too.
          </Text>
        </View>

        {/* AI VOICE COMPANION */}

        <Animated.View
          style={[
            styles.voiceCard,
            {
              transform: [{ scale: pulse }],
            },
          ]}
        >
          <View style={styles.voiceTop}>
            <View style={styles.voiceTextContainer}>
              <Text style={styles.voiceLabel}>
                YOUR AI COMPANION
              </Text>

              <Text style={styles.voiceTitle}>
                {isListening
                  ? "I'm listening..."
                  : "How can I help, Mama?"}
              </Text>

              <Text style={styles.voiceSubtitle}>
                No forms. No typing.
                {"\n"}
                Just talk to me.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isListening
                  ? "Stop listening"
                  : "Talk to MamaMind"
              }
              onPress={handleVoice}
              style={({ pressed }) => [
                styles.micButton,
                isListening && styles.micButtonListening,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.micText}>
                {isListening ? "■" : "●"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.voiceFeedback}>
            <Text style={styles.voiceFeedbackText}>
              {voiceMessage}
            </Text>

            {transcript.length > 0 && (
              <Text style={styles.transcript}>
                “{transcript}”
              </Text>
            )}
          </View>
        </Animated.View>

        {/* MEDICATION — SINGLE REMINDER CARD */}

        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionTitle}>Today</Text>

          <Pressable onPress={() => openScreen("/medication")}>
            <Text style={styles.seeAll}>View all →</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => openScreen("/medication")}
          style={({ pressed }) => [
            styles.medicationCard,
            pressed && styles.buttonPressed,
          ]}
        >
          <View style={styles.medicationIcon}>
            <Text style={styles.medicationIconText}>✚</Text>
          </View>

          <View style={styles.cardContent}>
            <Text style={styles.smallLabel}>
              GENTLE REMINDER
            </Text>

            <Text style={styles.cardTitle}>
              Your medication
            </Text>

            <Text style={styles.cardSubtitle}>
              Check your upcoming reminders.
            </Text>
          </View>

          <Text style={styles.cardArrow}>›</Text>
        </Pressable>

        {/* FOUR QUICK SHORTCUTS */}



        {/* VOICE-POWERED OUTING CHECKLIST */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create an outing checklist by voice"
          onPress={() => router.push("/mama-go")}
          style={({ pressed }) => [
            styles.outingCard,
            pressed && styles.buttonPressed,
          ]}
        >
          <View style={styles.outingIconCircle}>
            <Ionicons name="bag-handle-outline" size={25} color={C.deepTeal} />
          </View>
          <View style={styles.outingContent}>
            <Text style={styles.smallLabel}>READY, SET, GO</Text>
            <Text style={styles.outingTitle}>Going somewhere?</Text>
            <Text style={styles.outingSubtitle}>
              Your family, ready together. Tap and tell me what you need to pack.
            </Text>
            <Text style={styles.outingExample}>
              Try: “What should we take to the hospital?”
            </Text>
          </View>
          <Ionicons name="mic-outline" size={22} color={C.deepTeal} />
        </Pressable>

        <View style={styles.shortcutGrid}>

          <Pressable
            style={[styles.shortcutCard, styles.shortcutTeal]}
            onPress={() => router.push("/self-care" as any)}
          >
            <View style={styles.shortcutIconCircle}>
              <Ionicons
                name="heart-outline"
                size={24}
                color="#0E7C86"
              />
            </View>

            <Text style={styles.shortcutTitle}>Self-care</Text>
            <Text style={styles.shortcutSubtitle}>
              A little time for you
            </Text>

            <Ionicons
              name="arrow-forward"
              size={18}
              color="#0E7C86"
              style={styles.shortcutArrow}
            />
          </Pressable>


          <Pressable
            onPress={() => openScreen("/baby-dashboard")}
            style={({ pressed }) => [
              styles.shortcutCard,
              styles.shortcutTeal,
              pressed && styles.buttonPressed,
            ]}
          >
            <View style={styles.shortcutIconCircle}>
              <Text style={styles.shortcutIcon}>♡</Text>
            </View>

            <Text style={styles.shortcutTitle}>
              Baby Space
            </Text>

            <Text style={styles.shortcutSubtitle}>
              Care & milestones
            </Text>

            <Text style={styles.shortcutArrow}>↗</Text>
          </Pressable>

          <Pressable
            onPress={() => openScreen("/medication")}
            style={({ pressed }) => [
              styles.shortcutCard,
              styles.shortcutYellow,
              pressed && styles.buttonPressed,
            ]}
          >
            <View style={styles.shortcutIconCircle}>
              <Ionicons name="medkit-outline" size={23} color={C.deepTeal} />
            </View>

            <Text style={styles.shortcutTitle}>Medication</Text>

            <Text style={styles.shortcutSubtitle}>
              Your gentle reminders
            </Text>

            <Text style={styles.shortcutArrow}>↗</Text>
          </Pressable>

          <Pressable
            onPress={() => openScreen("/shared-tasks")}
            style={({ pressed }) => [
              styles.shortcutCard,
              styles.shortcutCream,
              pressed && styles.buttonPressed,
            ]}
          >
            <View style={styles.shortcutIconCircle}>
              <Text style={styles.shortcutIcon}>♡</Text>
            </View>

            <Text style={styles.shortcutTitle}>
              Family Tasks
            </Text>

            <Text style={styles.shortcutSubtitle}>
              Share the load
            </Text>

            <Text style={styles.shortcutArrow}>↗</Text>
          </Pressable>
        </View>

        {/* PERSONALIZED WELLNESS */}

        <View style={styles.compactSuggestion}>
          <View style={styles.suggestionTop}>
            <View style={styles.suggestionIconCircle}>
              <Text style={styles.suggestionIcon}>✧</Text>
            </View>

            <View style={styles.suggestionHeading}>
              <Text style={styles.smallLabel}>
                A MOMENT FOR YOU
              </Text>

              <Text style={styles.suggestionTitle}>
                {selfCareRecommendation?.title ??
                  "Take a moment for yourself."}
              </Text>
            </View>
          </View>

          <Text style={styles.suggestionText}>
            {selfCareRecommendation?.message ??
              "MamaMind is getting to know your day."}
          </Text>

          <Pressable
            onPress={() => {
              const type = selfCareRecommendation?.type;

              if (type === "support") {
                openScreen("/shared-tasks");
              } else if (type === "break" || type === "meditation") {
                openScreen("/meditation");
              } else {
                openScreen("/meditation");
              }
            }}
            style={styles.suggestionButton}
          >
            <Text style={styles.suggestionButtonText}>
              {selfCareRecommendation?.action ?? "Take a break"} →
            </Text>
          </Pressable>
        </View>

        {/* COMPACT FAMILY CARE UPDATES — EXPANDS ONLY ON TAP */}
        <View style={styles.familyCareCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Family Care Updates"
            accessibilityState={{ expanded: careExpanded }}
            onPress={() => setCareExpanded(value => !value)}
            style={styles.familyCareHeader}
          >
            <Ionicons name="heart-circle-outline" size={22} color={C.deepTeal} />
            <View style={{ flex: 1 }}>
              <Text style={styles.familyCareTitle}>Family Care Updates</Text>
              <Text style={styles.familyCareHint}>
                {activeRest ? "Dad is covering baby care" :
                  lowSupplies.length ? `${lowSupplies.length} supplies need restocking` :
                  "Your family's shared care at a glance"}
              </Text>
            </View>
            <Ionicons name={careExpanded ? "chevron-up" : "chevron-down"} size={19} color={C.deepTeal} />
          </Pressable>
          {careExpanded && (
            <View style={styles.familyCareDetails}>
              {careError ? <Text style={styles.familyCareHint}>{careError}</Text> : null}
              <Text style={styles.familyCareLine}>📦 Supplies: {lowSupplies.length ? `${lowSupplies.length} low-stock item(s)` : "No low-stock items"}</Text>
              {lowSupplies.slice(0, 2).map(item => (
                <Text key={item.id} style={styles.familyCareHint}>   • {String(item.name || "Supply")}: {item.quantity} {String(item.unit || "left")}</Text>
              ))}
              <Text style={styles.familyCareLine}>🌙 Rest: {activeRest ? "Dad's care session is active" : "No active rest session"}</Text>
              {!activeRest && latestHandover?.handover ? <Text style={styles.familyCareHint}>   Last handover: {String(latestHandover.handover).slice(0, 140)}</Text> : null}
              <Text style={styles.familyCareLine}>✓ Responsibilities: {completedResponsibilities.length} marked completed</Text>
              <Text style={styles.familyCareLine}>♡ Baby comfort: {latestComfort ? `${String(latestComfort.method || "Activity")} — ${String(latestComfort.result || "recorded")}` : "No observations yet"}</Text>
            </View>
          )}
        </View>

        {/* COMPACT, EXPANDABLE SUPPORT OFFERS FROM DAD */}
        <View style={styles.compactFamilyCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dad wants to help"
            accessibilityState={{ expanded: offersExpanded }}
            onPress={() => setOffersExpanded(value => !value)}
            style={styles.compactFamilyHeader}
          >
            <Ionicons name="heart-outline" size={21} color={C.deepTeal} />
            <View style={{ flex: 1 }}>
              <Text style={styles.compactFamilyTitle}>Dad wants to help</Text>
              <Text style={styles.compactFamilySummary} numberOfLines={1}>
                {supportOffers.filter(offer => offer.status === 'pending').length > 0
                  ? `${supportOffers.filter(offer => offer.status === 'pending').length} offer(s) awaiting your reply`
                  : supportOffers.length ? `${supportOffers.length} support offer(s)` : 'No offers yet'}
              </Text>
            </View>
            <Ionicons name={offersExpanded ? 'chevron-up' : 'chevron-down'} size={19} color={C.deepTeal} />
          </Pressable>
          {offersExpanded && (
            <View style={styles.compactFamilyDetails}>
              {supportOffers.length === 0 ? (
                <Text style={styles.compactFamilySummary}>Support offers from Dad will appear here.</Text>
              ) : supportOffers.map(offer => (
                <View key={String(offer.id)} style={styles.compactFamilyItem}>
                  <Text style={{ color: C.dark, fontSize: 13, lineHeight: 19 }}>{offer.message}</Text>
                  {offer.status === 'pending' ? (
                    <View style={{ flexDirection: 'row', gap: 9, marginTop: 10 }}>
                      <Pressable onPress={() => void respondToOffer(offer.id, 'accepted')} style={styles.offerAccept}>
                        <Text style={styles.offerAcceptText}>Yes, please ♡</Text>
                      </Pressable>
                      <Pressable onPress={() => void respondToOffer(offer.id, 'later')} style={styles.offerLater}>
                        <Text style={styles.offerLaterText}>Maybe later</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Text style={{ color: C.deepTeal, fontSize: 11, marginTop: 7 }}>
                      Your response: {offer.status === 'accepted' ? 'Yes, please ♡' : 'Maybe later'}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* COMPACT, EXPANDABLE LITTLE NOTES FROM DAD */}
        <View style={styles.compactFamilyCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Little Notes from Dad"
            accessibilityState={{ expanded: notesExpanded }}
            onPress={() => setNotesExpanded(value => !value)}
            style={styles.compactFamilyHeader}
          >
            <Ionicons name="heart-outline" size={21} color={C.coral} />
            <View style={{ flex: 1 }}>
              <Text style={styles.compactFamilyTitle}>Little Notes from Dad</Text>
              <Text style={styles.compactFamilySummary} numberOfLines={1}>
                {familyNotes.some(note => !note.read)
                  ? `${familyNotes.filter(note => !note.read).length} new note(s) ♡`
                  : familyNotes.length ? `${familyNotes.length} note(s) to read` : 'A little love will appear here ♡'}
              </Text>
            </View>
            <Ionicons name={notesExpanded ? 'chevron-up' : 'chevron-down'} size={19} color={C.deepTeal} />
          </Pressable>
          {notesExpanded && (
            <View style={styles.compactFamilyDetails}>
              {notesError ? <Text style={styles.compactFamilySummary}>{notesError}</Text> : null}
              {familyNotes.length === 0 ? (
                <Text style={styles.compactFamilySummary}>Dad's messages will appear here.</Text>
              ) : (
                <>
                  {familyNotes.map(note => (
                    <View key={String(note.id)} style={[styles.compactFamilyItem, { backgroundColor: note.read ? C.cream : C.paleTeal }]}>
                      <Text style={{ color: C.dark, fontSize: 13, lineHeight: 19 }}>{note.message}</Text>
                      <Text style={{ color: C.muted, fontSize: 10, marginTop: 6 }}>
                        {note.read ? 'Read' : 'New ♡'} · {new Date(note.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                  {familyNotes.some(note => !note.read) && (
                    <Pressable onPress={() => void markNotesRead()} style={styles.markNotesButton}>
                      <Text style={styles.offerAcceptText}>Mark notes as read ✓</Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          )}
        </View>

        {/* FAMILY & COMMUNITY */}

        <View style={styles.supportRow}>
          <Pressable
            onPress={() => openScreen("/connect-family")}
            style={({ pressed }) => [
              styles.supportCard,
              styles.shortcutTeal,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.supportTitle}>
              Connect with Dad
            </Text>

            <Text style={styles.supportSubtitle}>
              Share baby care
            </Text>

            <Text style={styles.supportArrow}>→</Text>
          </Pressable>

          <Pressable
            onPress={() => openScreen("/community")}
            style={({ pressed }) => [
              styles.supportCard,
              styles.shortcutYellow,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.supportTitle}>
              Moms Community
            </Text>

            <Text style={styles.supportSubtitle}>
              Connect & share
            </Text>

            <Text style={styles.supportArrow}>→</Text>
          </Pressable>
        </View>

        <Text style={styles.footerText}>
          One moment at a time, Mama. ♡
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  compactFamilyCard: { backgroundColor: C.white, borderRadius: 17, marginBottom: 11, borderWidth: 1, borderColor: C.paleTeal, overflow: 'hidden' },
  compactFamilyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, minHeight: 66 },
  compactFamilyTitle: { color: C.dark, fontSize: 14, fontWeight: '800' },
  compactFamilySummary: { color: C.muted, fontSize: 11, marginTop: 3, lineHeight: 16 },
  compactFamilyDetails: { paddingHorizontal: 12, paddingBottom: 12 },
  compactFamilyItem: { backgroundColor: C.cream, borderRadius: 12, padding: 12, marginTop: 8 },
  offerAccept: { backgroundColor: C.deepTeal, borderRadius: 10, padding: 10, flex: 1, alignItems: 'center' },
  offerAcceptText: { color: C.white, fontSize: 12, fontWeight: '700' },
  offerLater: { backgroundColor: C.white, borderRadius: 10, padding: 10, flex: 1, alignItems: 'center' },
  offerLaterText: { color: C.dark, fontSize: 12, fontWeight: '700' },
  markNotesButton: { backgroundColor: C.deepTeal, borderRadius: 10, padding: 12, marginTop: 10, alignItems: 'center' },

  familyCareCard: {
    backgroundColor: C.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.paleTeal,
    marginBottom: 14,
    overflow: "hidden",
  },
  familyCareHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  familyCareTitle: { fontSize: 13, fontWeight: "800", color: C.dark },
  familyCareHint: { fontSize: 10, lineHeight: 16, color: C.muted, marginTop: 2 },
  familyCareDetails: {
    borderTopWidth: 1,
    borderTopColor: C.paleTeal,
    paddingHorizontal: 13,
    paddingBottom: 12,
    paddingTop: 7,
  },
  familyCareLine: { fontSize: 12, lineHeight: 19, color: C.dark, marginTop: 7 },
  safe: {
    flex: 1,
    backgroundColor: C.cream,
  },

  backgroundLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
  },

  backgroundBlobOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: C.paleTeal,
    opacity: 0.5,
    top: 85,
    left: -80,
  },

  backgroundBlobTwo: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "#FFF0D0",
    opacity: 0.45,
    top: 420,
    right: -100,
  },

  container: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
  },

  /* HEADER */

  header: {
    marginBottom: 18,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerText: {
    flex: 1,
    paddingRight: 8,
  },

  greeting: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.7,
    color: C.deepTeal,
    marginBottom: 7,
  },

  heading: {
    fontSize: 29,
    lineHeight: 34,
    fontWeight: "900",
    color: C.dark,
    letterSpacing: -0.6,
  },

  headingAccent: {
    color: C.teal,
  },

  headerHeart: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.yellow,
    alignItems: "center",
    justifyContent: "center",
  },

  headerHeartText: {
    fontSize: 31,
    fontWeight: "700",
    color: C.deepTeal,
    marginTop: -2,
  },

  subtitle: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: C.muted,
  },

  /* VOICE COMPANION */

  voiceCard: {
    backgroundColor: C.deepTeal,
    borderRadius: 24,
    padding: 17,
    marginBottom: 21,

    shadowColor: C.dark,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 4,
  },

  voiceTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  voiceTextContainer: {
    flex: 1,
    paddingRight: 12,
  },

  voiceLabel: {
    fontSize: 9,
    letterSpacing: 1.7,
    fontWeight: "900",
    color: C.yellow,
  },

  voiceTitle: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "900",
    color: C.white,
    marginTop: 6,
  },

  voiceSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: "#D9F4F1",
    marginTop: 5,
  },

  micButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.yellow,
    alignItems: "center",
    justifyContent: "center",
  },

  micButtonListening: {
    backgroundColor: C.coral,
  },

  micText: {
    color: C.deepTeal,
    fontSize: 19,
    fontWeight: "900",
  },

  voiceFeedback: {
    marginTop: 13,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.18)",
  },

  voiceFeedbackText: {
    fontSize: 11,
    color: "#E9FAF8",
    lineHeight: 16,
  },

  transcript: {
    fontSize: 12,
    fontWeight: "700",
    color: C.yellow,
    marginTop: 5,
  },

  /* SECTION HEADINGS */

  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: C.dark,
  },

  seeAll: {
    fontSize: 11,
    fontWeight: "800",
    color: C.deepTeal,
  },

  sectionHint: {
    fontSize: 10,
    color: C.muted,
  },

  /* MEDICATION */

  medicationCard: {
    backgroundColor: C.yellow,
    borderRadius: 21,
    padding: 14,
    marginBottom: 21,
    flexDirection: "row",
    alignItems: "center",

    shadowColor: C.dark,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 2,
  },

  medicationIcon: {
    width: 43,
    height: 43,
    borderRadius: 15,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  medicationIconText: {
    fontSize: 22,
    fontWeight: "900",
    color: C.deepTeal,
  },

  cardContent: {
    flex: 1,
    paddingRight: 8,
  },

  smallLabel: {
    fontSize: 9,
    letterSpacing: 1.3,
    fontWeight: "900",
    color: C.deepTeal,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: C.dark,
    marginTop: 4,
  },

  cardSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: C.muted,
    marginTop: 3,
  },

  cardArrow: {
    fontSize: 28,
    color: C.deepTeal,
    fontWeight: "700",
  },

  /* VOICE-POWERED OUTING CHECKLIST */

  outingCard: {
    backgroundColor: C.white,
    borderRadius: 21,
    padding: 14,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.paleTeal,
    shadowColor: C.dark,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },

  outingIconCircle: {
    width: 45,
    height: 45,
    borderRadius: 16,
    backgroundColor: C.paleTeal,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  outingContent: { flex: 1, paddingRight: 8 },

  outingTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
    color: C.dark,
    marginTop: 4,
  },

  outingSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    color: C.muted,
    marginTop: 3,
  },

  outingExample: {
    fontSize: 10,
    lineHeight: 15,
    color: C.deepTeal,
    fontWeight: "700",
    marginTop: 6,
  },

  outingChecklistCard: {
    backgroundColor: C.paleTeal,
    borderRadius: 21,
    padding: 15,
    marginBottom: 18,
  },

  outingChecklistTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: C.dark,
  },

  outingChecklistHint: {
    fontSize: 11,
    lineHeight: 16,
    color: C.muted,
    marginTop: 4,
    marginBottom: 10,
  },

  outingChecklistRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
  },

  outingBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
    marginTop: 1,
  },

  outingChecklistItem: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: C.dark,
  },

  /* QUICK ACCESS GRID */

  shortcutGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 9,
  },

  shortcutCard: {
    width: "48.5%",
    minHeight: 116,
    borderRadius: 21,
    padding: 13,
    marginBottom: 10,
    position: "relative",
    overflow: "hidden",
  },

  shortcutYellow: {
    backgroundColor: C.yellow,
  },

  shortcutTeal: {
    backgroundColor: C.paleTeal,
  },

  shortcutCream: {
    backgroundColor: "#FFF0D0",
  },

  shortcutIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.8)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  shortcutIcon: {
    fontSize: 17,
    fontWeight: "800",
    color: C.deepTeal,
  },

  shortcutTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    color: C.dark,
    paddingRight: 3,
  },

  shortcutSubtitle: {
    fontSize: 10,
    lineHeight: 14,
    color: C.muted,
    marginTop: 3,
  },

  shortcutArrow: {
    position: "absolute",
    right: 12,
    top: 12,
    fontSize: 15,
    fontWeight: "900",
    color: C.deepTeal,
  },

  /* PERSONALIZED WELLNESS */

  compactSuggestion: {
    backgroundColor: C.white,
    borderRadius: 21,
    padding: 15,
    marginBottom: 14,

    shadowColor: C.dark,
    shadowOpacity: 0.04,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },

    elevation: 2,
  },

  suggestionTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  suggestionIconCircle: {
    width: 39,
    height: 39,
    borderRadius: 15,
    backgroundColor: C.paleTeal,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  suggestionIcon: {
    fontSize: 23,
    fontWeight: "800",
    color: C.deepTeal,
  },

  suggestionHeading: {
    flex: 1,
  },

  suggestionTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "900",
    color: C.dark,
    marginTop: 4,
  },

  suggestionText: {
    fontSize: 11,
    lineHeight: 17,
    color: C.muted,
    marginTop: 9,
  },

  suggestionButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: C.paleTeal,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  suggestionButtonText: {
    color: C.deepTeal,
    fontSize: 11,
    fontWeight: "900",
  },

  /* FAMILY & COMMUNITY */

  supportRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 12,
  },

  supportCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 94,
    borderRadius: 19,
    padding: 12,
    justifyContent: "center",
  },

  supportTitle: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
    color: C.dark,
  },

  supportSubtitle: {
    fontSize: 10,
    lineHeight: 14,
    color: C.muted,
    marginTop: 4,
  },

  supportArrow: {
    fontSize: 17,
    fontWeight: "900",
    color: C.deepTeal,
    marginTop: 5,
  },

  footerText: {
    textAlign: "center",
    color: C.muted,
    fontSize: 10,
    marginTop: 2,
    marginBottom: 6,
  },

  /* PRESS FEEDBACK */

  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});