/**
 * GamesScreen.tsx  —  Self Care corner (single file)
 *
 * Activities: Bubble Pop · Fidget Spinner · Pebble Stack · Zen Sand ·
 *             Mood Garden · Sound Garden
 *
 * SOUND SETUP
 *  1. npx expo install expo-audio
 *  2. Put the .wav files (chime_0.wav ... wind.wav) in your project's assets
 *     folder. The require() paths below ("../../assets/...") assume this file
 *     lives two folders deep (e.g. app/(tabs)/games.tsx). Adjust if needed.
 *
 * If a sound fails to load, the app never crashes — it just stays silent.
 */
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioPlayer } from "expo-audio";

/* =========================================================
   THEME
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

type ActivityId =
  | "menu"
  | "bubble"
  | "spinner"
  | "stack"
  | "sand"
  | "garden"
  | "sound";

const FLOWER_COLORS = [C.coral, C.yellow, C.teal, "#E7A8C8", "#B48AC7"];

const shadow = (
  color: string,
  opacity: number,
  radius: number,
  y: number,
  elevation = 4
) => ({
  shadowColor: color,
  shadowOpacity: opacity,
  shadowRadius: radius,
  shadowOffset: { width: 0, height: y },
  elevation,
});

/* =========================================================
   SMALL ANIMATION HELPERS
========================================================= */

/** 0 → 1 → 0 → 1 … forever (native driven). */
function useLoop(duration: number, startDelay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration,
          delay: startDelay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    l.start();
    return () => l.stop();
  }, [v, duration, startDelay]);
  return v;
}

/** One-shot 0 → 1 progress that calls onDone when finished. */
function useProgress(
  duration: number,
  easing: (t: number) => number,
  onDone: () => void
) {
  const p = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(p, {
      toValue: 1,
      duration,
      easing,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDone();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return p;
}

/** Smooth random wandering offsets, for flying creatures. */
function useWander(rx: number, ry: number, stepMs: number, steps = 5) {
  const tx = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const seq: Animated.CompositeAnimation[] = [];
    for (let i = 0; i < steps; i++) {
      const d = stepMs * (0.8 + Math.random() * 0.6);
      seq.push(
        Animated.parallel([
          Animated.timing(tx, {
            toValue: (Math.random() * 2 - 1) * rx,
            duration: d,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(ty, {
            toValue: (Math.random() * 2 - 1) * ry,
            duration: d,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
    }
    seq.push(
      Animated.parallel([
        Animated.timing(tx, {
          toValue: 0,
          duration: stepMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ty, {
          toValue: 0,
          duration: stepMs,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const l = Animated.loop(Animated.sequence(seq));
    l.start();
    return () => l.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { tx, ty };
}

/** Fast flapping 0 ↔ 1. */
function useFlap(ms: number) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: ms,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: ms,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    l.start();
    return () => l.stop();
  }, [v, ms]);
  return v;
}

/* =========================================================
   SOUND ENGINE  (expo-audio + the .wav files in your assets)
========================================================= */

type SoundKind = "leaf" | "rain" | "chime" | "water" | "wind" | "pop";

/* eslint-disable @typescript-eslint/no-var-requires */
const SOUND_FILES: Record<SoundKind, any[]> = {
  chime: [
    require("../../assets/chime_0.wav"),
    require("../../assets/chime_1.wav"),
    require("../../assets/chime_2.wav"),
    require("../../assets/chime_3.wav"),
    require("../../assets/chime_4.wav"),
    require("../../assets/chime_5.wav"),
  ],
  rain: [
    require("../../assets/drop_0.wav"),
    require("../../assets/drop_1.wav"),
    require("../../assets/drop_2.wav"),
  ],
  leaf: [
    require("../../assets/leaf_0.wav"),
    require("../../assets/leaf_1.wav"),
  ],
  water: [
    require("../../assets/water_0.wav"),
    require("../../assets/water_1.wav"),
  ],
  wind: [require("../../assets/wind.wav")],
  pop: [
    require("../../assets/pop_0.wav"),
    require("../../assets/pop_1.wav"),
    require("../../assets/pop_2.wav"),
  ],
};
/* eslint-enable @typescript-eslint/no-var-requires */

/** Up to 2 players per file so quick repeated taps can overlap. */
const pools = new Map<string, AudioPlayer[]>();
let audioReady = false;

async function ensureAudioMode() {
  if (audioReady) return;
  audioReady = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {
    /* ignore */
  }
}

async function playSound(kind: SoundKind, v: number) {
  try {
    await ensureAudioMode();
    const files = SOUND_FILES[kind];
    const idx = ((v % files.length) + files.length) % files.length;
    const key = `${kind}-${idx}`;

    let pool = pools.get(key);
    if (!pool) {
      pool = [];
      pools.set(key, pool);
    }

    let player = pool.find((p) => !p.playing);
    let fresh = false;
    if (!player) {
      if (pool.length < 2) {
        player = createAudioPlayer(files[idx]);
        pool.push(player);
        fresh = true;
      } else {
        player = pool[0];
      }
    }

    player.volume = 0.8;
    if (!fresh) await player.seekTo(0);
    player.play();
  } catch {
    /* stay silent rather than crash */
  }
}

/** Create the first player for each file ahead of time so the first tap is instant. */
function preloadSounds(kinds: SoundKind[]) {
  const jobs: { kind: SoundKind; idx: number }[] = [];
  kinds.forEach((kind) =>
    SOUND_FILES[kind].forEach((_, idx) => jobs.push({ kind, idx }))
  );
  let i = 0;
  const step = () => {
    if (i >= jobs.length) return;
    const { kind, idx } = jobs[i++];
    try {
      const key = `${kind}-${idx}`;
      if (!pools.has(key)) {
        pools.set(key, [createAudioPlayer(SOUND_FILES[kind][idx])]);
      }
    } catch {
      /* ignore */
    }
    setTimeout(step, 40);
  };
  setTimeout(step, 250);
}

function releaseSounds() {
  pools.forEach((list) =>
    list.forEach((p) => {
      try {
        p.remove();
      } catch {
        /* ignore */
      }
    })
  );
  pools.clear();
}

/* =========================================================
   ROOT
========================================================= */

export default function GamesScreen() {
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityId>("menu");
  const goMenu = useCallback(() => setActivity("menu"), []);

  useEffect(() => releaseSounds, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={C.cream} />

      {activity === "menu" && (
        <ActivityMenu onSelect={setActivity} onBack={() => router.back()} />
      )}
      {activity === "bubble" && <BubblePop onBack={goMenu} />}
      {activity === "spinner" && <FidgetSpinner onBack={goMenu} />}
      {activity === "stack" && <PebbleStack onBack={goMenu} />}
      {activity === "sand" && <ZenSand onBack={goMenu} />}
      {activity === "garden" && <MoodGarden onBack={goMenu} />}
      {activity === "sound" && <SoundGarden onBack={goMenu} />}
    </SafeAreaView>
  );
}

/* =========================================================
   MENU
========================================================= */

function ActivityMenu({
  onSelect,
  onBack,
}: {
  onSelect: (id: ActivityId) => void;
  onBack: () => void;
}) {
  const cards = [
    {
      id: "bubble" as const,
      color: C.paleTeal,
      accent: C.teal,
      title: "Bubble Pop",
      description: "Tap a bubble and every matching colour beside it pops together.",
      symbol: "◎",
    },
    {
      id: "spinner" as const,
      color: "#F3EAF7",
      accent: "#B48AC7",
      title: "Fidget Spinner",
      description: "Swipe to spin it fast, then watch it slow down. Touch to catch it.",
      symbol: "◈",
    },
    {
      id: "stack" as const,
      color: "#FFF3E7",
      accent: "#D98B5F",
      title: "Pebble Stack",
      description: "Balance stones carefully. Off-balance towers topple.",
      symbol: "△",
    },
    {
      id: "sand" as const,
      color: "#FFF9E8",
      accent: "#E6B800",
      title: "Zen Sand",
      description: "Draw anything. There is no right way to make it.",
      symbol: "〰",
    },
    {
      id: "garden" as const,
      color: "#EAF6EA",
      accent: "#5F8A62",
      title: "Mood Garden",
      description: "Grow flowers, butterflies and bees. They stay until you remove them.",
      symbol: "✦",
    },
    {
      id: "sound" as const,
      color: "#E9F1FF",
      accent: "#5B8DEF",
      title: "Sound Garden",
      description: "Tap leaves, rain, chimes, water and wind to make soft sounds.",
      symbol: "♪",
    },
  ];

  return (
    <ScrollView
      contentContainerStyle={styles.menuContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.menuTopRow}>
        <Pressable
          onPress={onBack}
          hitSlop={12}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.6 },
          ]}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.menuTopLabel}>SELF CARE</Text>
        <View style={{ width: 42 }} />
      </View>

      <View style={styles.menuHeader}>
        <Text style={styles.menuTitle}>
          Take a little time{"\n"}for yourself.
        </Text>
        <Text style={styles.menuSubtitle}>
          No scores. No pressure.{"\n"}Just a few quiet minutes for you.
        </Text>
      </View>

      {cards.map((card, index) => (
        <CalmCard
          key={card.id}
          index={index}
          color={card.color}
          accent={card.accent}
          title={card.title}
          description={card.description}
          symbol={card.symbol}
          onPress={() => onSelect(card.id)}
        />
      ))}

      <View style={styles.menuFooter}>
        <Text style={styles.footerText}>
          You don't need to achieve anything here.
        </Text>
      </View>
    </ScrollView>
  );
}

function CalmCard({
  index,
  color,
  accent,
  title,
  description,
  symbol,
  onPress,
}: {
  index: number;
  color: string;
  accent: string;
  title: string;
  description: string;
  symbol: string;
  onPress: () => void;
}) {
  const enter = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(enter, {
      toValue: 1,
      duration: 480,
      delay: 120 + index * 90,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter, index]);

  const springTo = (v: number) =>
    Animated.spring(press, {
      toValue: v,
      friction: 6,
      tension: 220,
      useNativeDriver: true,
    }).start();

  return (
    <Animated.View
      style={{
        opacity: enter,
        transform: [
          {
            translateY: enter.interpolate({
              inputRange: [0, 1],
              outputRange: [24, 0],
            }),
          },
          { scale: press },
        ],
      }}
    >
      <Pressable
        onPressIn={() => springTo(0.97)}
        onPressOut={() => springTo(1)}
        onPress={onPress}
        style={[
          styles.calmCard,
          { backgroundColor: color },
          shadow(accent, 0.18, 14, 6, 3),
        ]}
      >
        <View style={[styles.calmSymbol, shadow(accent, 0.15, 6, 2, 2)]}>
          <Text style={[styles.calmSymbolText, { color: accent }]}>
            {symbol}
          </Text>
        </View>
        <View style={styles.calmCardText}>
          <Text style={styles.calmCardTitle}>{title}</Text>
          <Text style={styles.calmCardDescription}>{description}</Text>
        </View>
        <Text style={[styles.calmArrow, { color: accent }]}>→</Text>
      </Pressable>
    </Animated.View>
  );
}

/* =========================================================
   SHARED HEADER
========================================================= */

function ActivityHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.activityHeader}>
      <Pressable
        onPress={onBack}
        hitSlop={14}
        style={({ pressed }) => [
          styles.activityBack,
          pressed && { opacity: 0.6, transform: [{ scale: 0.94 }] },
        ]}
      >
        <Text style={styles.activityBackText}>‹</Text>
      </Pressable>
      <View style={styles.activityHeaderText}>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={styles.activitySubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

/* =========================================================
   1. BUBBLE POP
   Tap a bubble: it pops together with every connected bubble of the
   SAME colour (a little chain reaction). Drag to pop many groups.
========================================================= */

const BUBBLE_COLORS = ["#8FD9D3", "#9CCBF2", "#F4B6CB", "#FFE08A"];
const BUBBLE_COLS = 5;
const BUBBLE_PAD = 14;

const Bubble = memo(function Bubble({
  left,
  top,
  size,
  color,
  popDelay,
}: {
  left: number;
  top: number;
  size: number;
  color: string;
  /** -1 = not popped, otherwise ms to wait before popping (chain effect) */
  popDelay: number;
}) {
  const p = useRef(new Animated.Value(0)).current;
  const ring = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (popDelay >= 0) {
      ring.setValue(0);
      Animated.sequence([
        Animated.delay(popDelay),
        Animated.parallel([
          Animated.spring(p, {
            toValue: 1,
            friction: 4,
            tension: 200,
            useNativeDriver: true,
          }),
          Animated.timing(ring, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      p.setValue(0);
      ring.setValue(0);
    }
  }, [popDelay, p, ring]);

  const d = size * 0.86;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left,
        top,
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* burst ring */}
      <Animated.View
        style={{
          position: "absolute",
          width: d,
          height: d,
          borderRadius: d / 2,
          borderWidth: 2,
          borderColor: "rgba(255,255,255,0.95)",
          opacity: ring.interpolate({
            inputRange: [0, 0.1, 1],
            outputRange: [0, 0.8, 0],
          }),
          transform: [
            {
              scale: ring.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1.5],
              }),
            },
          ],
        }}
      />
      <Animated.View
        style={{
          width: d,
          height: d,
          borderRadius: d / 2,
          backgroundColor: color,
          overflow: "hidden",
          opacity: p.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.5],
          }),
          transform: [
            {
              scale: p.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.8],
              }),
            },
          ],
        }}
      >
        <View
          style={{
            position: "absolute",
            right: -d * 0.28,
            bottom: -d * 0.3,
            width: d * 0.95,
            height: d * 0.95,
            borderRadius: d,
            backgroundColor: "rgba(0,0,0,0.1)",
          }}
        />
        <Animated.View
          style={{
            position: "absolute",
            left: d * 0.16,
            top: d * 0.12,
            width: d * 0.28,
            height: d * 0.4,
            borderRadius: d,
            backgroundColor: "rgba(255,255,255,0.6)",
            transform: [{ rotate: "24deg" }],
            opacity: p.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
          }}
        />
        <Animated.View
          style={{
            position: "absolute",
            left: d * 0.2,
            top: d * 0.62,
            width: d * 0.1,
            height: d * 0.1,
            borderRadius: d,
            backgroundColor: "rgba(255,255,255,0.5)",
            opacity: p.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
          }}
        />
        <Animated.View
          style={{
            position: "absolute",
            left: d * 0.28,
            top: d * 0.28,
            width: d * 0.44,
            height: d * 0.44,
            borderRadius: d,
            backgroundColor: "rgba(0,0,0,0.12)",
            opacity: p,
          }}
        />
      </Animated.View>
    </View>
  );
});

function BubblePop({ onBack }: { onBack: () => void }) {
  const [area, setArea] = useState({ w: 0, h: 0 });
  const [sheet, setSheet] = useState(0);
  const [popped, setPopped] = useState<number[]>([]);

  const poppedRef = useRef<number[]>([]);
  const geo = useRef({ cell: 0, rows: 0, padX: 0, padY: 0 });
  const startPt = useRef({ x: 0, y: 0 });
  const lastPt = useRef({ x: 0, y: 0 });

  const cell = area.w
    ? Math.floor((area.w - BUBBLE_PAD * 2) / BUBBLE_COLS)
    : 0;
  const rows = cell
    ? Math.max(1, Math.floor((area.h - BUBBLE_PAD * 2) / cell))
    : 0;
  const total = cell ? BUBBLE_COLS * rows : 0;
  const padX = cell ? (area.w - cell * BUBBLE_COLS) / 2 : 0;
  const padY = cell ? (area.h - cell * rows) / 2 : 0;
  geo.current = { cell, rows, padX, padY };

  // Random colours, but clustered so there are always groups to pop together.
  const colorIdx = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < total; i++) {
      const col = i % BUBBLE_COLS;
      const row = Math.floor(i / BUBBLE_COLS);
      const left = col > 0 ? arr[i - 1] : -1;
      const up = row > 0 ? arr[i - BUBBLE_COLS] : -1;
      const r = Math.random();
      let c: number;
      if (left >= 0 && r < 0.35) c = left;
      else if (up >= 0 && r < 0.7) c = up;
      else c = Math.floor(Math.random() * BUBBLE_COLORS.length);
      arr.push(c);
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, sheet]);
  const colorsRef = useRef<number[]>(colorIdx);
  colorsRef.current = colorIdx;

  useEffect(() => {
    preloadSounds(["pop"]);
  }, []);

  // reset whenever the grid size changes or a new sheet is requested
  useEffect(() => {
    poppedRef.current = new Array(total).fill(-1);
    setPopped(poppedRef.current.slice());
  }, [total, sheet]);

  const popAt = (x: number, y: number) => {
    const g = geo.current;
    if (!g.cell) return;
    const col = Math.floor((x - g.padX) / g.cell);
    const row = Math.floor((y - g.padY) / g.cell);
    if (col < 0 || col >= BUBBLE_COLS || row < 0 || row >= g.rows) return;
    const start = row * BUBBLE_COLS + col;
    if (poppedRef.current[start] !== -1) return;

    const colors = colorsRef.current;
    const target = colors[start];

    // flood-fill: all connected un-popped bubbles of the same colour
    const order: number[] = [start];
    const seen = new Set<number>([start]);
    for (let h = 0; h < order.length; h++) {
      const i = order[h];
      const c = i % BUBBLE_COLS;
      const r = Math.floor(i / BUBBLE_COLS);
      const nbrs: number[] = [];
      if (c > 0) nbrs.push(i - 1);
      if (c < BUBBLE_COLS - 1) nbrs.push(i + 1);
      if (r > 0) nbrs.push(i - BUBBLE_COLS);
      if (r < g.rows - 1) nbrs.push(i + BUBBLE_COLS);
      for (const n of nbrs) {
        if (
          !seen.has(n) &&
          poppedRef.current[n] === -1 &&
          colors[n] === target
        ) {
          seen.add(n);
          order.push(n);
        }
      }
    }

    order.forEach((i, k) => {
      poppedRef.current[i] = Math.min(k * 45, 450);
    });
    setPopped(poppedRef.current.slice());

    const n = Math.min(order.length, 5);
    for (let k = 0; k < n; k++) {
      const v = Math.floor(Math.random() * 3);
      if (k === 0) playSound("pop", v);
      else setTimeout(() => playSound("pop", v), k * 70);
    }
  };
  const popAtRef = useRef(popAt);
  popAtRef.current = popAt;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const x = e.nativeEvent.locationX;
        const y = e.nativeEvent.locationY;
        startPt.current = { x, y };
        lastPt.current = { x, y };
        popAtRef.current(x, y);
      },
      onPanResponderMove: (_e, g) => {
        const x = startPt.current.x + g.dx;
        const y = startPt.current.y + g.dy;
        const dx = x - lastPt.current.x;
        const dy = y - lastPt.current.y;
        const step = Math.max(8, geo.current.cell / 2);
        const n = Math.max(1, Math.ceil(Math.sqrt(dx * dx + dy * dy) / step));
        for (let k = 1; k <= n; k++) {
          popAtRef.current(
            lastPt.current.x + (dx * k) / n,
            lastPt.current.y + (dy * k) / n
          );
        }
        lastPt.current = { x, y };
      },
    })
  ).current;

  const count = popped.filter((v) => v >= 0).length;
  const done = total > 0 && count === total;

  return (
    <View style={styles.fullScreen}>
      <ActivityHeader
        title="Bubble Pop"
        subtitle="Matching colours pop together."
        onBack={onBack}
      />

      <View
        style={[styles.bubbleSheet, shadow("#5FA9A4", 0.25, 16, 8, 5)]}
        onLayout={(e) =>
          setArea({
            w: e.nativeEvent.layout.width,
            h: e.nativeEvent.layout.height,
          })
        }
        {...pan.panHandlers}
      >
        {Array.from({ length: total }).map((_, i) => {
          const col = i % BUBBLE_COLS;
          const row = Math.floor(i / BUBBLE_COLS);
          return (
            <Bubble
              key={`${sheet}-${i}`}
              left={padX + col * cell}
              top={padY + row * cell}
              size={cell}
              color={BUBBLE_COLORS[colorIdx[i] ?? 0]}
              popDelay={popped[i] ?? -1}
            />
          );
        })}

        {done && (
          <View pointerEvents="none" style={styles.bubbleDone}>
            <Text style={styles.bubbleDoneTitle}>All popped.</Text>
            <Text style={styles.bubbleDoneText}>
              Lovely. Start a fresh sheet whenever you like.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.sandBottom}>
        <Text style={styles.bottomMessageTitle}>
          {count === 0 ? "Nothing popped yet" : `${count} popped`}
        </Text>
        <Text style={[styles.sandBottomText, { marginTop: 6 }]}>
          Tap a bubble, or drag across the sheet.
        </Text>
        <Pressable
          onPress={() => setSheet((s) => s + 1)}
          style={({ pressed }) => [
            styles.resetButton,
            pressed && { opacity: 0.6, transform: [{ scale: 0.96 }] },
          ]}
        >
          <Text style={styles.resetButtonText}>New sheet</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* =========================================================
   2. FIDGET SPINNER
   Swipe around it to spin. It slows down on its own and clicks softly.
   Touch it any time to catch it.
========================================================= */

const SPIN_SIZE = 240;
const SPIN_ARMS = [C.coral, C.teal, C.yellow];

function FidgetSpinner({ onBack }: { onBack: () => void }) {
  const [scene, setScene] = useState({ w: 320, h: 380 });
  const [turns, setTurns] = useState(0);

  const spin = useRef(new Animated.Value(0)).current;
  const sceneRef = useRef(scene);
  sceneRef.current = scene;

  const angle = useRef(0); // degrees
  const vel = useRef(0); // degrees per ms
  const raf = useRef<number | null>(null);
  const lastT = useRef(0);
  const totalDeg = useRef(0);
  const turnsRef = useRef(0);
  const lastTickIdx = useRef(0);
  const lastTickAt = useRef(0);
  const startPt = useRef({ x: 0, y: 0 });
  const lastTouchAngle = useRef(0);
  const lastMoveT = useRef(0);

  useEffect(() => {
    preloadSounds(["pop"]);
    return () => {
      if (raf.current != null) cancelAnimationFrame(raf.current);
    };
  }, []);

  const advance = (delta: number) => {
    angle.current += delta;
    spin.setValue(angle.current);

    totalDeg.current += Math.abs(delta);
    const t = Math.floor(totalDeg.current / 360);
    if (t !== turnsRef.current) {
      turnsRef.current = t;
      setTurns(t);
    }

    // a soft click each time an arm passes (every 120°)
    const idx = Math.floor(angle.current / 120);
    if (idx !== lastTickIdx.current) {
      lastTickIdx.current = idx;
      const now = performance.now();
      if (now - lastTickAt.current > 70) {
        lastTickAt.current = now;
        playSound("pop", Math.abs(idx) % 3);
      }
    }
  };

  const stopLoop = () => {
    if (raf.current != null) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
  };

  const startLoop = () => {
    stopLoop();
    lastT.current = performance.now();
    const loop = () => {
      const now = performance.now();
      const dt = Math.min(40, now - lastT.current);
      lastT.current = now;
      advance(vel.current * dt);
      vel.current *= Math.exp(-dt / 2400);
      if (Math.abs(vel.current) < 0.015) {
        vel.current = 0;
        raf.current = null;
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
  };

  const touchAngle = (x: number, y: number) =>
    (Math.atan2(y - sceneRef.current.h / 2, x - sceneRef.current.w / 2) * 180) /
    Math.PI;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        stopLoop();
        vel.current = 0; // catching it stops it
        const x = e.nativeEvent.locationX;
        const y = e.nativeEvent.locationY;
        startPt.current = { x, y };
        lastTouchAngle.current = touchAngle(x, y);
        lastMoveT.current = performance.now();
      },
      onPanResponderMove: (_e, g) => {
        const x = startPt.current.x + g.dx;
        const y = startPt.current.y + g.dy;
        const a = touchAngle(x, y);
        let d = a - lastTouchAngle.current;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        lastTouchAngle.current = a;

        const now = performance.now();
        const dt = Math.max(1, now - lastMoveT.current);
        lastMoveT.current = now;

        advance(d);
        vel.current = vel.current * 0.6 + (d / dt) * 0.4;
      },
      onPanResponderRelease: () => {
        if (performance.now() - lastMoveT.current > 90) vel.current = 0;
        vel.current = Math.max(-3, Math.min(3, vel.current));
        if (Math.abs(vel.current) > 0.03) startLoop();
      },
      onPanResponderTerminate: () => {
        if (Math.abs(vel.current) > 0.03) startLoop();
      },
    })
  ).current;

  const S = SPIN_SIZE;
  const ARM = 82; // centre → arm-end distance
  const R = 38; // arm-end radius

  return (
    <View style={styles.fullScreen}>
      <ActivityHeader
        title="Fidget Spinner"
        subtitle="Swipe around it. Touch to catch it."
        onBack={onBack}
      />

      <View
        style={[styles.spinScene, shadow("#9B7FB8", 0.28, 16, 8, 5)]}
        onLayout={(e) =>
          setScene({
            w: e.nativeEvent.layout.width,
            h: e.nativeEvent.layout.height,
          })
        }
        {...pan.panHandlers}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "#E6D9F1",
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: "50%",
            backgroundColor: "#F1E8F8",
          }}
        />
        {/* soft glow behind the spinner */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: scene.w / 2 - (S + 40) / 2,
            top: scene.h / 2 - (S + 40) / 2,
            width: S + 40,
            height: S + 40,
            borderRadius: (S + 40) / 2,
            backgroundColor: "rgba(255,255,255,0.45)",
          }}
        />

        <Text pointerEvents="none" style={styles.spinHint}>
          Swipe in a circle to spin
        </Text>

        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: scene.w / 2 - S / 2,
            top: scene.h / 2 - S / 2,
            width: S,
            height: S,
            transform: [
              {
                rotate: spin.interpolate({
                  inputRange: [0, 360],
                  outputRange: ["0deg", "360deg"],
                }),
              },
            ],
          }}
        >
          {SPIN_ARMS.map((c, i) => (
            <View
              key={i}
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: S,
                height: S,
                transform: [{ rotate: `${i * 120}deg` }],
              }}
            >
              {/* connector */}
              <View
                style={{
                  position: "absolute",
                  left: S / 2 - 17,
                  top: S / 2 - ARM,
                  width: 34,
                  height: ARM,
                  backgroundColor: c,
                }}
              />
              {/* arm end */}
              <View
                style={{
                  position: "absolute",
                  left: S / 2 - R,
                  top: S / 2 - ARM - R,
                  width: R * 2,
                  height: R * 2,
                  borderRadius: R,
                  backgroundColor: c,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "rgba(0,0,0,0.08)",
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "#F6EEFA",
                    borderWidth: 3,
                    borderColor: "rgba(0,0,0,0.12)",
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    left: 10,
                    top: 8,
                    width: 18,
                    height: 10,
                    borderRadius: 8,
                    backgroundColor: "rgba(255,255,255,0.4)",
                    transform: [{ rotate: "-30deg" }],
                  }}
                />
              </View>
            </View>
          ))}

          {/* centre bearing */}
          <View
            style={[
              {
                position: "absolute",
                left: S / 2 - 38,
                top: S / 2 - 38,
                width: 76,
                height: 76,
                borderRadius: 38,
                backgroundColor: "#FFFFFF",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: "rgba(0,0,0,0.08)",
              },
              shadow("#6B4E8A", 0.25, 6, 2, 3),
            ]}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "#D9C8EA",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: "#8E6FB0",
                }}
              />
            </View>
          </View>
        </Animated.View>
      </View>

      <View style={styles.sandBottom}>
        <Text style={styles.bottomMessageTitle}>
          {turns === 0 ? "Give it a spin" : `${turns} ${turns === 1 ? "turn" : "turns"}`}
        </Text>
        <Text style={[styles.sandBottomText, { marginTop: 6, marginBottom: 0 }]}>
          Fast or slow, let it run on its own.
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   3. PEBBLE STACK
   Press, slide to choose a spot, let go to place the stone.
   If a stone's weight isn't balanced over the one below it, the
   stones above it topple.
========================================================= */

type Pebble = { id: number; w: number; h: number; color: string; cx: number };
type NextPebble = { w: number; h: number; color: string };

const PEBBLE_COLORS = [
  "#A9A38B",
  "#9D9A82",
  "#B7AE96",
  "#C9B79C",
  "#8FA39B",
  "#B8A59A",
  "#9AA8A0",
];
const MAX_PEBBLES = 30;
const PEBBLE_GROUND = 62;

const makePebble = (): NextPebble => ({
  w: 70 + Math.random() * 60,
  h: 24 + Math.random() * 8,
  color: PEBBLE_COLORS[Math.floor(Math.random() * PEBBLE_COLORS.length)],
});

/**
 * Classic block-stacking balance rule: for every stone, the combined centre
 * of mass of everything above it must sit over that stone. Returns the index
 * of the lowest stone that can't hold what's above it (those above fall).
 */
function firstUnstable(
  stones: { w: number; h: number; cx: number }[]
): { k: number; dir: 1 | -1 } | null {
  for (let k = 0; k < stones.length - 1; k++) {
    let m = 0;
    let mx = 0;
    for (let j = k + 1; j < stones.length; j++) {
      const a = stones[j].w * stones[j].h;
      m += a;
      mx += a * stones[j].cx;
    }
    const com = mx / m;
    const half = stones[k].w / 2 - 2;
    if (Math.abs(com - stones[k].cx) > half) {
      return { k, dir: com > stones[k].cx ? 1 : -1 };
    }
  }
  return null;
}

const PebbleView = memo(function PebbleView({
  s,
  bottom,
  dir,
  collapse,
}: {
  s: Pebble;
  bottom: number;
  dir: 0 | 1 | -1;
  collapse: Animated.Value;
}) {
  const d = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(d, {
      toValue: 1,
      friction: 6,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [d]);

  const spinDeg = 30 + (s.id % 4) * 22;

  const transforms: any[] = [
    {
      translateY: d.interpolate({
        inputRange: [0, 1],
        outputRange: [-110, 0],
      }),
    },
  ];
  if (dir !== 0) {
    transforms.push(
      {
        translateX: collapse.interpolate({
          inputRange: [0, 1],
          outputRange: [0, dir * (46 + (s.id % 5) * 16)],
        }),
      },
      {
        translateY: collapse.interpolate({
          inputRange: [0, 1],
          outputRange: [0, bottom + 10],
        }),
      },
      {
        rotate: collapse.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${dir * spinDeg}deg`],
        }),
      }
    );
  }

  const fadeIn = d.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 1, 1],
  });
  const opacity =
    dir !== 0
      ? Animated.multiply(
          fadeIn,
          collapse.interpolate({
            inputRange: [0, 0.8, 1],
            outputRange: [1, 1, 0],
          })
        )
      : fadeIn;

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: s.cx - s.w / 2,
        bottom,
        width: s.w,
        height: s.h,
        opacity,
        transform: transforms,
      }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: s.h * 0.5,
          backgroundColor: s.color,
          overflow: "hidden",
          borderWidth: 0.6,
          borderColor: "rgba(0,0,0,0.08)",
        }}
      >
        <View
          style={{
            position: "absolute",
            left: s.w * 0.1,
            top: s.h * 0.12,
            width: s.w * 0.4,
            height: s.h * 0.3,
            borderRadius: s.h,
            backgroundColor: "rgba(255,255,255,0.32)",
          }}
        />
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: s.h * 0.35,
            backgroundColor: "rgba(0,0,0,0.12)",
          }}
        />
      </View>
    </Animated.View>
  );
});

function PebbleStack({ onBack }: { onBack: () => void }) {
  const [stones, setStones] = useState<Pebble[]>([]);
  const [next, setNext] = useState<NextPebble>(makePebble);
  const [scene, setScene] = useState({ w: 340, h: 400 });
  const [aim, setAim] = useState<number | null>(null);
  const [fallMap, setFallMap] = useState<Record<number, 1 | -1>>({});
  const [msg, setMsg] = useState("");

  const idRef = useRef(0);
  const busy = useRef(false);
  const aimRef = useRef(0);
  const aimStart = useRef(0);
  const collapse = useRef(new Animated.Value(0)).current;
  const towerScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    preloadSounds(["rain", "leaf"]);
  }, []);

  const totalH = stones.reduce((a, s) => a + s.h, 0);
  const H = Math.max(totalH, 1);
  const avail = Math.max(140, scene.h - PEBBLE_GROUND - 110);
  const targetScale = totalH > avail ? avail / totalH : 1;

  useEffect(() => {
    Animated.spring(towerScale, {
      toValue: targetScale,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [targetScale, towerScale]);

  // finger position → position inside the (possibly scaled-down) tower
  const toWorld = (tx: number) => scene.w / 2 + (tx - scene.w / 2) / targetScale;
  const clampCx = (x: number, w: number) =>
    Math.max(w / 2 + 6, Math.min(scene.w - w / 2 - 6, x));

  const candidateCx = clampCx(
    toWorld(aim !== null ? aim : scene.w / 2),
    next.w
  );
  const risky =
    stones.length > 0 &&
    firstUnstable([...stones, { w: next.w, h: next.h, cx: candidateCx }]) !==
    null;

  const runCollapse = (map: Record<number, 1 | -1>) => {
    setFallMap(map);
    collapse.setValue(0);
    playSound("leaf", Math.floor(Math.random() * 2));
    Animated.timing(collapse, {
      toValue: 1,
      duration: 1100,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setStones((prev) => prev.filter((s) => map[s.id] === undefined));
      setFallMap({});
      collapse.setValue(0);
      busy.current = false;
    });
  };

  const place = () => {
    if (busy.current) return;
    if (stones.length >= MAX_PEBBLES) {
      setMsg("What a tower. That's as high as it goes.");
      return;
    }
    const cx = clampCx(toWorld(aimRef.current), next.w);
    const stone: Pebble = { id: idRef.current++, ...next, cx };
    const list = [...stones, stone];
    setStones(list);
    setNext(makePebble());
    setMsg("");
    playSound("rain", Math.floor(Math.random() * 3));

    const bad = firstUnstable(list);
    if (bad) {
      busy.current = true;
      setTimeout(() => {
        const map: Record<number, 1 | -1> = {};
        for (let j = bad.k + 1; j < list.length; j++) map[list[j].id] = bad.dir;
        setMsg("It wasn't balanced — and that's okay. Try again.");
        runCollapse(map);
      }, 420);
    }
  };
  const placeRef = useRef(place);
  placeRef.current = place;

  const knockOver = () => {
    if (busy.current || stones.length === 0) return;
    busy.current = true;
    const map: Record<number, 1 | -1> = {};
    stones.forEach((s) => {
      map[s.id] = Math.random() > 0.5 ? 1 : -1;
    });
    setMsg("");
    runCollapse(map);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        aimStart.current = e.nativeEvent.locationX;
        aimRef.current = aimStart.current;
        setAim(aimRef.current);
      },
      onPanResponderMove: (_e, g) => {
        aimRef.current = aimStart.current + g.dx;
        setAim(aimRef.current);
      },
      onPanResponderRelease: () => {
        placeRef.current();
        setAim(null);
      },
      onPanResponderTerminate: () => setAim(null),
    })
  ).current;

  let acc = 0;
  const placed = stones.map((s) => {
    const bottom = acc;
    acc += s.h;
    return { s, bottom };
  });

  const bottomText =
    msg !== ""
      ? msg
      : stones.length === 0
        ? "Keep each stone's weight over the one below."
        : `${stones.length} ${stones.length === 1 ? "stone" : "stones"} stacked`;

  return (
    <View style={styles.fullScreen}>
      <ActivityHeader
        title="Pebble Stack"
        subtitle="Slide to pick a spot. Let go to place."
        onBack={onBack}
      />

      <View
        style={[styles.pebbleScene, shadow("#B79B72", 0.25, 16, 8, 5)]}
        onLayout={(e) =>
          setScene({
            w: e.nativeEvent.layout.width,
            h: e.nativeEvent.layout.height,
          })
        }
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "#FDE8D3",
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: "50%",
            backgroundColor: "#FFF2E3",
          }}
        />
        <View pointerEvents="none" style={styles.pebbleSun} />

        <View pointerEvents="none" style={styles.pebbleGround} />
        <View pointerEvents="none" style={styles.pebbleGroundShade} />

        {/* tower (absolute-positioned stones, scaled down when tall) */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: PEBBLE_GROUND,
            height: H,
            transform: [
              { translateY: H / 2 },
              { scale: towerScale },
              { translateY: -H / 2 },
            ],
          }}
        >
          {placed.map(({ s, bottom }) => (
            <PebbleView
              key={s.id}
              s={s}
              bottom={bottom}
              dir={fallMap[s.id] ?? 0}
              collapse={collapse}
            />
          ))}

          {/* guide line while sliding */}
          {aim !== null && (
            <View
              style={{
                position: "absolute",
                left: candidateCx - 0.75,
                bottom: 0,
                width: 1.5,
                height: totalH + 18,
                backgroundColor: risky
                  ? "rgba(255,107,107,0.55)"
                  : "rgba(255,255,255,0.8)",
              }}
            />
          )}

          {/* the stone you're about to place */}
          {!busy.current && stones.length < MAX_PEBBLES && (
            <View
              style={{
                position: "absolute",
                left: candidateCx - next.w / 2,
                bottom: totalH + 18,
                width: next.w,
                height: next.h,
                borderRadius: next.h * 0.5,
                backgroundColor: next.color,
                opacity: aim !== null ? 0.9 : 0.55,
                borderWidth: 2,
                borderColor: risky ? C.coral : "rgba(255,255,255,0.9)",
              }}
            />
          )}
        </Animated.View>

        {/* touch layer */}
        <View style={StyleSheet.absoluteFill} {...pan.panHandlers} />

        {stones.length === 0 && aim === null && (
          <View pointerEvents="none" style={styles.pebbleEmpty}>
            <Text style={styles.gardenEmptyTitle}>Press, slide, let go.</Text>
            <Text style={styles.gardenEmptyText}>
              The ghost stone turns coral if it won't balance.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.sandBottom}>
        <Text style={[styles.sandBottomText, { textAlign: "center" }]}>
          {bottomText}
        </Text>
        <Pressable
          onPress={knockOver}
          disabled={stones.length === 0}
          style={({ pressed }) => [
            styles.resetButton,
            {
              opacity: stones.length === 0 ? 0.45 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
          ]}
        >
          <Text style={styles.resetButtonText}>Let it fall</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* =========================================================
   4. ZEN SAND
========================================================= */

type Segment = { id: number; x: number; y: number; len: number; angle: number };

const GROOVE = 13;
const MAX_SEGMENTS = 1400;

const SandSegment = memo(function SandSegment({ s }: { s: Segment }) {
  const w = s.len + GROOVE;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: s.x - w / 2,
        top: s.y - GROOVE / 2,
        width: w,
        height: GROOVE,
        borderRadius: GROOVE / 2,
        backgroundColor: "#CDB088",
        transform: [{ rotate: `${s.angle}rad` }],
      }}
    >
      <View
        style={{
          position: "absolute",
          left: 2,
          right: 2,
          top: 0,
          height: 3,
          borderRadius: 2,
          backgroundColor: "rgba(255,246,226,0.85)",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 3,
          right: 3,
          top: 4,
          height: 5,
          borderRadius: 3,
          backgroundColor: "#B8996F",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 2,
          right: 2,
          bottom: 0,
          height: 2,
          borderRadius: 2,
          backgroundColor: "rgba(120,88,52,0.45)",
        }}
      />
    </View>
  );
});

function ZenSand({ onBack }: { onBack: () => void }) {
  const [segments, setSegments] = useState<Segment[]>([]);
  const idRef = useRef(0);
  const start = useRef({ x: 0, y: 0 });
  const last = useRef({ x: 0, y: 0 });

  const addSegment = (x: number, y: number) => {
    const dx = x - last.current.x;
    const dy = y - last.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 3) return;

    const seg: Segment = {
      id: idRef.current++,
      x: (x + last.current.x) / 2,
      y: (y + last.current.y) / 2,
      len: dist,
      angle: Math.atan2(dy, dx),
    };
    last.current = { x, y };
    setSegments((prev) =>
      prev.length >= MAX_SEGMENTS
        ? [...prev.slice(-MAX_SEGMENTS + 1), seg]
        : [...prev, seg]
    );
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const x = e.nativeEvent.locationX;
        const y = e.nativeEvent.locationY;
        start.current = { x, y };
        last.current = { x, y };
        setSegments((prev) => [
          ...prev.slice(-MAX_SEGMENTS + 1),
          { id: idRef.current++, x, y, len: 0.1, angle: 0 },
        ]);
      },
      onPanResponderMove: (_e, g) => {
        addSegment(start.current.x + g.dx, start.current.y + g.dy);
      },
    })
  ).current;

  return (
    <View style={styles.fullScreen}>
      <ActivityHeader
        title="Zen Sand"
        subtitle="Draw slowly. There is no wrong way."
        onBack={onBack}
      />

      <View
        style={[styles.sandArea, shadow("#8A6B3F", 0.25, 16, 8, 5)]}
        {...pan.panHandlers}
      >
        {Array.from({ length: 70 }).map((_, i) => (
          <View
            key={i}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: i * 13,
              height: 1.5,
              backgroundColor: i % 2 ? "#F4E5C6" : "#D3BB93",
              opacity: 0.4,
            }}
          />
        ))}

        <Rings right={36} bottom={52} base={86} />
        <Rings left={36} bottom={112} base={64} />
        <Rings right={92} top={86} base={50} />

        <Stone right={55} bottom={66} w={50} h={34} c="#9D9A82" />
        <Stone left={50} bottom={122} w={32} h={24} c="#A9A38B" />
        <Stone right={102} top={98} w={24} h={18} c="#B2AA8E" />

        <Text pointerEvents="none" style={styles.sandHint}>
          Draw your own little pattern
        </Text>

        {segments.map((s) => (
          <SandSegment key={s.id} s={s} />
        ))}
      </View>

      <View style={styles.sandBottom}>
        <Text style={styles.sandBottomText}>
          Let your hand move without thinking.
        </Text>
        <Pressable
          onPress={() => setSegments([])}
          style={({ pressed }) => [
            styles.resetButton,
            pressed && { opacity: 0.6, transform: [{ scale: 0.96 }] },
          ]}
        >
          <Text style={styles.resetButtonText}>Start again</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Rings(p: {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  base: number;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: p.left,
        right: p.right,
        top: p.top,
        bottom: p.bottom,
      }}
    >
      {[3, 2, 1].map((k) => {
        const s = p.base + k * 26;
        return (
          <View
            key={k}
            style={{
              position: "absolute",
              left: -(s - 40) / 2 - 4,
              top: -(s - 28) / 2,
              width: s,
              height: s * 0.75,
              borderRadius: s,
              borderWidth: 2,
              borderColor: "rgba(160,128,88,0.4)",
            }}
          />
        );
      })}
    </View>
  );
}

function Stone(p: {
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  w: number;
  h: number;
  c: string;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: p.left,
        right: p.right,
        top: p.top,
        bottom: p.bottom,
        width: p.w,
        height: p.h,
      }}
    >
      <View
        style={{
          position: "absolute",
          left: 4,
          top: p.h * 0.55,
          width: p.w,
          height: p.h * 0.6,
          borderRadius: p.h,
          backgroundColor: "rgba(80,60,30,0.28)",
        }}
      />
      <View
        style={{
          width: p.w,
          height: p.h,
          borderRadius: p.h * 0.6,
          backgroundColor: p.c,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            position: "absolute",
            left: p.w * 0.12,
            top: p.h * 0.1,
            width: p.w * 0.5,
            height: p.h * 0.35,
            borderRadius: p.h,
            backgroundColor: "rgba(255,255,255,0.3)",
          }}
        />
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: p.h * 0.35,
            backgroundColor: "rgba(0,0,0,0.12)",
          }}
        />
      </View>
    </View>
  );
}

/* =========================================================
   5. MOOD GARDEN
   Everything you plant STAYS until you remove it.
   Use "Remove" mode and tap something to pick it, or "Clear garden".
========================================================= */

type CreatureType = "flower" | "butterfly" | "bee" | "ladybug" | "mushroom";

type Creature = {
  id: number;
  type: CreatureType;
  x: number;
  y: number;
  size: number;
  stem: number;
  color: string;
  dir: 1 | -1;
  angle: number;
};

type GardenMode = "plant" | "remove";

const CREATURE_TYPES: { id: CreatureType; icon: string; label: string }[] = [
  { id: "flower", icon: "🌸", label: "Flower" },
  { id: "butterfly", icon: "🦋", label: "Butterfly" },
  { id: "bee", icon: "🐝", label: "Bee" },
  { id: "ladybug", icon: "🐞", label: "Ladybug" },
  { id: "mushroom", icon: "🍄", label: "Mushroom" },
];

const MAX_CREATURES = 60;

/** Rough hit-test so the person can tap a creature to remove it. */
function creatureHit(c: Creature, x: number, y: number): boolean {
  const dx = x - c.x;
  const dy = y - c.y;
  switch (c.type) {
    case "flower":
      return (
        Math.abs(dx) <= c.size * 0.65 + 8 &&
        dy >= -c.size * 0.65 - 8 &&
        dy <= c.stem + c.size * 0.5 + 10
      );
    case "mushroom":
      return Math.abs(dx) <= 28 && dy >= -46 && dy <= 12;
    case "ladybug": {
      const cx = Math.cos(c.angle) * 31;
      const cy = Math.sin(c.angle) * 15.5;
      const ddx = x - (c.x + cx);
      const ddy = y - (c.y + cy);
      return Math.sqrt(ddx * ddx + ddy * ddy) <= 46;
    }
    case "bee":
      return Math.sqrt(dx * dx + dy * dy) <= 50;
    default:
      return Math.sqrt(dx * dx + dy * dy) <= 80;
  }
}

function MoodGarden({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<Creature[]>([]);
  const [selectedColor, setSelectedColor] = useState(FLOWER_COLORS[0]);
  const [selectedType, setSelectedType] = useState<CreatureType>("flower");
  const [mode, setMode] = useState<GardenMode>("plant");
  const [notice, setNotice] = useState("");
  const idRef = useRef(0);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const sway = useLoop(2600);
  const sunPulse = useLoop(3400);
  const cloudDrift = useLoop(9000);

  useEffect(() => {
    preloadSounds(["pop", "leaf"]);
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const flash = (msg: string) => {
    setNotice(msg);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 2200);
  };

  const plant = (x: number, y: number) => {
    if (items.length >= MAX_CREATURES) {
      flash("Your garden is full. Remove something to plant more.");
      return;
    }
    const c: Creature = {
      id: idRef.current++,
      type: selectedType,
      x,
      y,
      size: 30 + Math.random() * 20,
      stem: 38 + Math.random() * 40,
      color: selectedColor,
      dir: Math.random() > 0.5 ? 1 : -1,
      angle: Math.random() * Math.PI * 2,
    };
    setItems((prev) => [...prev, c]);
    playSound("pop", Math.floor(Math.random() * 3));
  };

  const removeAt = (x: number, y: number) => {
    for (let i = items.length - 1; i >= 0; i--) {
      if (creatureHit(items[i], x, y)) {
        const id = items[i].id;
        setItems((prev) => prev.filter((c) => c.id !== id));
        playSound("leaf", Math.floor(Math.random() * 2));
        return;
      }
    }
  };

  const usesColor =
    mode === "plant" &&
    (selectedType === "flower" || selectedType === "butterfly");

  return (
    <View style={styles.fullScreen}>
      <ActivityHeader
        title="Mood Garden"
        subtitle={
          mode === "plant"
            ? "Grow something. It stays until you remove it."
            : "Tap a flower or creature to remove it."
        }
        onBack={onBack}
      />

      <View style={[styles.garden, shadow("#5F8A62", 0.25, 16, 8, 5)]}>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "#CBEBE3",
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: "45%",
            backgroundColor: "#E3F5EE",
          }}
        />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.sunGlow,
            {
              opacity: sunPulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.25, 0.5],
              }),
              transform: [
                {
                  scale: sunPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1.12],
                  }),
                },
              ],
            },
          ]}
        />
        <View pointerEvents="none" style={styles.gardenSun} />

        <Animated.View
          pointerEvents="none"
          style={[
            styles.skyCloud,
            {
              top: 38,
              left: 26,
              transform: [
                {
                  translateX: cloudDrift.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 38],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.skyPuff, { left: 12, top: -12, width: 30, height: 30 }]} />
          <View style={[styles.skyPuff, { left: 30, top: -18, width: 36, height: 36 }]} />
        </Animated.View>

        <View pointerEvents="none" style={styles.hillBack} />
        <View pointerEvents="none" style={styles.gardenGround}>
          <View style={styles.gardenGroundLine} />
        </View>

        {Array.from({ length: 34 }).map((_, i) => {
          const r = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
          const h = 16 + r * 26;
          return (
            <View
              key={i}
              pointerEvents="none"
              style={{
                position: "absolute",
                bottom: 14 + (i % 3) * 7,
                left: `${(i / 34) * 100}%`,
                width: 4,
                height: h,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                backgroundColor: i % 2 ? "#6E9C6B" : "#86B382",
                transform: [{ rotate: `${(r - 0.5) * 24}deg` }],
              }}
            />
          );
        })}

        <Pressable
          style={StyleSheet.absoluteFill}
          onPressIn={(e) => {
            const { locationX, locationY } = e.nativeEvent;
            if (mode === "plant") plant(locationX, locationY);
            else removeAt(locationX, locationY);
          }}
        />

        {items.map((c) => {
          const flying = c.type === "butterfly" || c.type === "bee";
          return (
            <Placed
              key={c.id}
              x={c.x}
              y={c.y}
              pop={c.type !== "flower"}
              fly={flying}
            >
              {c.type === "flower" && <Flower flower={c} sway={sway} />}
              {c.type === "butterfly" && <Butterfly color={c.color} />}
              {c.type === "bee" && <Bee />}
              {c.type === "ladybug" && <Ladybug angle={c.angle} />}
              {c.type === "mushroom" && <Mushroom />}
            </Placed>
          );
        })}

        {items.length === 0 && (
          <View pointerEvents="none" style={styles.gardenEmpty}>
            <Text style={styles.gardenEmptyTitle}>
              Your little garden is waiting.
            </Text>
            <Text style={styles.gardenEmptyText}>
              Tap anywhere to bring something to life.
            </Text>
          </View>
        )}

        {notice !== "" && (
          <View pointerEvents="none" style={styles.gardenNotice}>
            <Text style={styles.gardenNoticeText}>{notice}</Text>
          </View>
        )}
      </View>

      <View style={styles.gardenControls}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeRow}
        >
          {CREATURE_TYPES.map((t) => {
            const on = selectedType === t.id && mode === "plant";
            return (
              <Pressable
                key={t.id}
                onPressIn={() => {
                  setSelectedType(t.id);
                  setMode("plant");
                }}
                style={[
                  styles.typeChip,
                  on && { backgroundColor: C.deepTeal },
                ]}
              >
                <Text style={styles.typeIcon}>{t.icon}</Text>
                <Text style={[styles.typeLabel, on && { color: C.white }]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.colorRow}>
          {FLOWER_COLORS.map((color) => (
            <Pressable
              key={color}
              hitSlop={6}
              onPressIn={() => {
                setSelectedColor(color);
                setMode("plant");
              }}
              style={[
                styles.colorButton,
                shadow(color, 0.5, 6, 3, 3),
                {
                  backgroundColor: color,
                  opacity: usesColor ? 1 : 0.35,
                  borderWidth: selectedColor === color && usesColor ? 3 : 0,
                  transform: [
                    {
                      scale: selectedColor === color && usesColor ? 1.15 : 1,
                    },
                  ],
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.soundToggleRow}>
          <Pressable
            onPress={() => setMode("plant")}
            style={[
              styles.toggleBtn,
              mode === "plant" && { backgroundColor: C.deepTeal },
            ]}
          >
            <Text style={[styles.toggleText, mode === "plant" && { color: C.white }]}>
              Plant
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("remove")}
            style={[
              styles.toggleBtn,
              mode === "remove" && { backgroundColor: C.coral },
            ]}
          >
            <Text style={[styles.toggleText, mode === "remove" && { color: C.white }]}>
              Remove
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setItems([])}
            disabled={items.length === 0}
            style={[styles.toggleBtn, { opacity: items.length === 0 ? 0.45 : 1 }]}
          >
            <Text style={styles.toggleText}>Clear garden</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Zero-size anchor at the tap point. Stays until the item is removed. */
const Placed = memo(function Placed({
  x,
  y,
  pop,
  fly,
  children,
}: {
  x: number;
  y: number;
  pop: boolean;
  fly: boolean;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(pop ? 0.2 : 1)).current;

  useEffect(() => {
    if (pop) {
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 0,
        height: 0,
        zIndex: Math.round(y) + (fly ? 1000 : 0),
        transform: [{ scale }],
      }}
    >
      {children}
    </Animated.View>
  );
});

const Flower = memo(function Flower({
  flower,
  sway,
}: {
  flower: Creature;
  sway: Animated.Value;
}) {
  const grow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(grow, {
      toValue: 1,
      friction: 4.5,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [grow]);

  const S = flower.size;
  const H = S + flower.stem;
  const pw = S * 0.44;
  const ph = S * 0.58;

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: -S / 2,
        top: -S / 2,
        width: S,
        height: H,
        transform: [
          { translateY: H / 2 },
          { scale: grow },
          {
            rotate: sway.interpolate({
              inputRange: [0, 1],
              outputRange: [`${-3.5 * flower.dir}deg`, `${3.5 * flower.dir}deg`],
            }),
          },
          { translateY: -H / 2 },
        ],
      }}
    >
      <View
        style={{
          position: "absolute",
          left: S / 2 - 1.75,
          top: S / 2,
          width: 3.5,
          height: flower.stem + S / 2,
          borderRadius: 2,
          backgroundColor: "#5F8A62",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: S / 2 + 1,
          top: S / 2 + flower.stem * 0.45,
          width: S * 0.45,
          height: S * 0.2,
          borderTopRightRadius: S,
          borderBottomRightRadius: S,
          borderTopLeftRadius: 2,
          backgroundColor: "#7FB07C",
          transform: [{ rotate: "-28deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          right: S / 2 + 1,
          top: S / 2 + flower.stem * 0.68,
          width: S * 0.4,
          height: S * 0.18,
          borderTopLeftRadius: S,
          borderBottomLeftRadius: S,
          borderTopRightRadius: 2,
          backgroundColor: "#6E9C6B",
          transform: [{ rotate: "26deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          left: S * 0.05,
          top: S * 0.1,
          width: S * 0.95,
          height: S * 0.95,
          borderRadius: S,
          backgroundColor: "rgba(40,70,50,0.14)",
        }}
      />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={{
            position: "absolute",
            left: S / 2 - pw / 2,
            top: S / 2 - ph / 2,
            width: pw,
            height: ph,
            borderRadius: pw,
            backgroundColor: flower.color,
            borderWidth: 0.6,
            borderColor: "rgba(0,0,0,0.08)",
            overflow: "hidden",
            transform: [{ rotate: `${i * 60}deg` }, { translateY: -ph * 0.52 }],
          }}
        >
          <View
            style={{
              position: "absolute",
              left: pw * 0.2,
              top: ph * 0.08,
              width: pw * 0.35,
              height: ph * 0.4,
              borderRadius: pw,
              backgroundColor: "rgba(255,255,255,0.35)",
            }}
          />
        </View>
      ))}
      <View
        style={{
          position: "absolute",
          left: S / 2 - S * 0.17,
          top: S / 2 - S * 0.17,
          width: S * 0.34,
          height: S * 0.34,
          borderRadius: S,
          backgroundColor: "#E8A317",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: S * 0.2,
            height: S * 0.2,
            borderRadius: S,
            backgroundColor: "#FFD966",
          }}
        />
      </View>
    </Animated.View>
  );
});

function Butterfly({ color }: { color: string }) {
  const { tx, ty } = useWander(70, 50, 1700);
  const flap = useFlap(150);
  const tilt = useLoop(900);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transform: [
          { translateX: tx },
          { translateY: ty },
          {
            rotate: tilt.interpolate({
              inputRange: [0, 1],
              outputRange: ["-10deg", "10deg"],
            }),
          },
        ],
      }}
    >
      <View
        style={{
          position: "absolute",
          left: -9,
          top: 12,
          width: 18,
          height: 5,
          borderRadius: 3,
          backgroundColor: "rgba(40,70,50,0.18)",
        }}
      />
      <Animated.View
        style={{
          position: "absolute",
          left: -24,
          top: -18,
          width: 48,
          height: 36,
          transform: [
            {
              scaleX: flap.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.22],
              }),
            },
          ],
        }}
      >
        <View style={[styles.wing, { left: 0, top: 1, width: 23, height: 19, backgroundColor: color }]}>
          <View style={styles.wingDot} />
        </View>
        <View style={[styles.wing, { right: 0, top: 1, width: 23, height: 19, backgroundColor: color }]}>
          <View style={styles.wingDot} />
        </View>
        <View style={[styles.wing, { left: 5, top: 17, width: 17, height: 15, backgroundColor: color, opacity: 0.88 }]} />
        <View style={[styles.wing, { right: 5, top: 17, width: 17, height: 15, backgroundColor: color, opacity: 0.88 }]} />
      </Animated.View>
      <View
        style={{
          position: "absolute",
          left: -2,
          top: -13,
          width: 4,
          height: 26,
          borderRadius: 2,
          backgroundColor: "#3A2A2A",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: -6,
          top: -20,
          width: 1.5,
          height: 9,
          backgroundColor: "#3A2A2A",
          transform: [{ rotate: "-20deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 4,
          top: -20,
          width: 1.5,
          height: 9,
          backgroundColor: "#3A2A2A",
          transform: [{ rotate: "20deg" }],
        }}
      />
    </Animated.View>
  );
}

function Bee() {
  const { tx, ty } = useWander(34, 26, 1100);
  const buzz = useFlap(55);

  const wing = {
    position: "absolute" as const,
    top: -13,
    width: 13,
    height: 9,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 0.6,
    borderColor: "rgba(120,160,180,0.5)",
  };
  const wingAnim = {
    transform: [
      {
        scaleY: buzz.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.35],
        }),
      },
    ],
  };

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transform: [{ translateX: tx }, { translateY: ty }],
      }}
    >
      <View
        style={{
          position: "absolute",
          left: -9,
          top: 18,
          width: 18,
          height: 4,
          borderRadius: 3,
          backgroundColor: "rgba(40,70,50,0.18)",
        }}
      />
      <Animated.View style={[wing, { left: -9 }, wingAnim]} />
      <Animated.View style={[wing, { left: 0 }, wingAnim]} />
      <View
        style={{
          position: "absolute",
          left: -12,
          top: -7,
          width: 24,
          height: 15,
          borderRadius: 9,
          backgroundColor: "#FFC83D",
          overflow: "hidden",
        }}
      >
        <View style={{ position: "absolute", left: 8, width: 4, height: 15, backgroundColor: "#2B2B2B" }} />
        <View style={{ position: "absolute", left: 14, width: 4, height: 15, backgroundColor: "#2B2B2B" }} />
        <View
          style={{
            position: "absolute",
            left: 3,
            top: 2,
            width: 8,
            height: 4,
            borderRadius: 3,
            backgroundColor: "rgba(255,255,255,0.45)",
          }}
        />
      </View>
      <View
        style={{
          position: "absolute",
          left: -16,
          top: -4,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: "#2B2B2B",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 11,
          top: 0,
          width: 4,
          height: 2,
          borderRadius: 1,
          backgroundColor: "#2B2B2B",
        }}
      />
    </Animated.View>
  );
}

function Ladybug({ angle }: { angle: number }) {
  const walk = useProgress(13000, Easing.inOut(Easing.sin), () => { });
  const wiggle = useFlap(180);
  const dist = 62;

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transform: [
          {
            translateX: walk.interpolate({
              inputRange: [0, 1],
              outputRange: [0, Math.cos(angle) * dist],
            }),
          },
          {
            translateY: walk.interpolate({
              inputRange: [0, 1],
              outputRange: [0, Math.sin(angle) * dist * 0.5],
            }),
          },
        ],
      }}
    >
      <Animated.View
        style={{
          transform: [
            { rotate: `${angle + Math.PI / 2}rad` },
            {
              rotate: wiggle.interpolate({
                inputRange: [0, 1],
                outputRange: ["-4deg", "4deg"],
              }),
            },
          ],
        }}
      >
        <View
          style={{
            position: "absolute",
            left: -8,
            top: -3,
            width: 18,
            height: 22,
            borderRadius: 10,
            backgroundColor: "rgba(40,70,50,0.2)",
          }}
        />
        <View
          style={{
            position: "absolute",
            left: -6,
            top: -14,
            width: 12,
            height: 9,
            borderRadius: 6,
            backgroundColor: "#262626",
          }}
        />
        <View
          style={{
            position: "absolute",
            left: -9,
            top: -9,
            width: 18,
            height: 22,
            borderRadius: 10,
            backgroundColor: "#E0322E",
            overflow: "hidden",
            borderWidth: 0.8,
            borderColor: "#A11E1B",
          }}
        >
          <View style={{ position: "absolute", left: 8, top: 0, width: 1.5, height: 22, backgroundColor: "#262626" }} />
          <View style={{ position: "absolute", left: 3, top: 4, width: 4, height: 4, borderRadius: 2, backgroundColor: "#262626" }} />
          <View style={{ position: "absolute", left: 11, top: 8, width: 4, height: 4, borderRadius: 2, backgroundColor: "#262626" }} />
          <View style={{ position: "absolute", left: 3, top: 13, width: 4, height: 4, borderRadius: 2, backgroundColor: "#262626" }} />
          <View
            style={{
              position: "absolute",
              left: 2,
              top: 1,
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: "rgba(255,255,255,0.4)",
            }}
          />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function Mushroom() {
  return (
    <View style={{ position: "absolute", left: 0, top: 0 }}>
      <View
        style={{
          position: "absolute",
          left: -16,
          top: -4,
          width: 34,
          height: 8,
          borderRadius: 6,
          backgroundColor: "rgba(40,70,50,0.22)",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: -6,
          top: -18,
          width: 12,
          height: 18,
          borderRadius: 5,
          backgroundColor: "#F6E9D2",
          borderWidth: 0.6,
          borderColor: "#D9C7A4",
        }}
      />
      <View
        style={{
          position: "absolute",
          left: -19,
          top: -34,
          width: 38,
          height: 20,
          borderTopLeftRadius: 38,
          borderTopRightRadius: 38,
          borderBottomLeftRadius: 8,
          borderBottomRightRadius: 8,
          backgroundColor: "#E85D5D",
          overflow: "hidden",
        }}
      >
        <View style={{ position: "absolute", left: 6, top: 4, width: 7, height: 7, borderRadius: 4, backgroundColor: "#FFF" }} />
        <View style={{ position: "absolute", left: 20, top: 3, width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFF" }} />
        <View style={{ position: "absolute", left: 14, top: 11, width: 5, height: 5, borderRadius: 3, backgroundColor: "#FFF" }} />
        <View
          style={{
            position: "absolute",
            left: 4,
            top: 1,
            width: 12,
            height: 5,
            borderRadius: 3,
            backgroundColor: "rgba(255,255,255,0.3)",
          }}
        />
      </View>
    </View>
  );
}

/* =========================================================
   6. SOUND GARDEN
========================================================= */

type Fx = {
  id: number;
  kind: SoundKind;
  x: number;
  y: number;
  v: number;
  dir: 1 | -1;
};

const SOUND_ITEMS: { id: SoundKind; icon: string; label: string }[] = [
  { id: "chime", icon: "🎐", label: "Chimes" },
  { id: "rain", icon: "🌧️", label: "Rain" },
  { id: "leaf", icon: "🍃", label: "Leaves" },
  { id: "water", icon: "💧", label: "Water" },
  { id: "wind", icon: "🌬️", label: "Wind" },
];

const CHIME_COLORS = [
  "#FFD27F",
  "#FF9FB5",
  "#9FD8FF",
  "#B8F0C8",
  "#D6B8FF",
  "#FFF0A0",
];

const LEAF_COLORS = ["#9CC57E", "#E3A857", "#C97B4A", "#7FB07C", "#D9C25A"];

function SoundGarden({ onBack }: { onBack: () => void }) {
  const [kind, setKind] = useState<SoundKind>("chime");
  const [fx, setFx] = useState<Fx[]>([]);
  const [muted, setMuted] = useState(false);
  const [ambient, setAmbient] = useState(false);
  const [size, setSize] = useState({ w: 320, h: 380 });

  const idRef = useRef(0);
  const lastWind = useRef(0);
  const sway = useLoop(3600);
  const sway2 = useLoop(4700, 500);
  const glow = useLoop(5000);

  useEffect(() => {
    preloadSounds(["chime", "rain", "leaf", "water", "wind"]);
  }, []);

  const trigger = (k: SoundKind, x: number, y: number) => {
    const dir: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
    const add: Fx[] = [];
    const mk = (extra: Partial<Fx>): Fx => ({
      id: idRef.current++,
      kind: k,
      x,
      y,
      v: 0,
      dir,
      ...extra,
    });

    if (k === "leaf") {
      for (let i = 0; i < 3; i++) {
        add.push(
          mk({
            x: x + (i - 1) * 22 + Math.random() * 10,
            y: y - Math.random() * 14,
            v: i,
            dir: i % 2 ? 1 : -1,
          })
        );
      }
      if (!muted) playSound("leaf", Math.floor(Math.random() * 2));
    } else if (k === "rain") {
      add.push(mk({ v: Math.floor(Math.random() * 3) }));
      if (!muted) {
        const v = add[0].v;
        setTimeout(() => playSound("rain", v), 320);
      }
    } else if (k === "chime") {
      const idx = Math.max(
        0,
        Math.min(5, Math.floor((x / Math.max(1, size.w)) * 6))
      );
      add.push(mk({ v: idx }));
      if (!muted) playSound("chime", idx);
    } else if (k === "water") {
      add.push(mk({ v: Math.floor(Math.random() * 2) }));
      if (!muted) playSound("water", Math.floor(Math.random() * 2));
    } else {
      add.push(mk({}));
      const now = Date.now();
      if (!muted && now - lastWind.current > 2200) {
        lastWind.current = now;
        playSound("wind", 0);
      }
    }
    setFx((prev) => [...prev.slice(-22), ...add]);
  };

  const triggerRef = useRef(trigger);
  triggerRef.current = trigger;

  useEffect(() => {
    if (!ambient) return;
    const every = kind === "rain" ? 450 : kind === "leaf" ? 1400 : 1700;
    const t = setInterval(() => {
      triggerRef.current(
        kind,
        30 + Math.random() * Math.max(40, size.w - 60),
        50 + Math.random() * Math.max(60, size.h - 160)
      );
    }, every);
    return () => clearInterval(t);
  }, [ambient, kind, size.w, size.h]);

  const remove = useCallback((id: number) => {
    setFx((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const chimeTubes = [
    { h: 70, c: "#C9D6E8" },
    { h: 96, c: "#D8C9E8" },
    { h: 120, c: "#C9E8DF" },
    { h: 84, c: "#E8DCC9" },
    { h: 104, c: "#E8C9D6" },
    { h: 64, c: "#C9D6E8" },
  ];

  return (
    <View style={styles.fullScreen}>
      <ActivityHeader
        title="Sound Garden"
        subtitle="Tap to make soft, slow sounds."
        onBack={onBack}
      />

      <View
        style={[styles.soundScene, shadow("#6F86B8", 0.3, 16, 8, 5)]}
        onLayout={(e) =>
          setSize({
            w: e.nativeEvent.layout.width,
            h: e.nativeEvent.layout.height,
          })
        }
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "#CBD8EE",
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: "45%",
            backgroundColor: "#E1E9F7",
          }}
        />
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 36,
            alignSelf: "center",
            width: 150,
            height: 150,
            borderRadius: 75,
            backgroundColor: "#FFFFFF",
            opacity: glow.interpolate({
              inputRange: [0, 1],
              outputRange: [0.2, 0.42],
            }),
          }}
        />

        {/* hanging wind chimes */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 14,
            right: 14,
            height: 8,
            borderRadius: 4,
            backgroundColor: "#A98E6E",
          }}
        />
        {chimeTubes.map((t, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 6,
              left: `${8 + i * 16}%`,
              alignItems: "center",
              transform: [
                { translateY: t.h / 2 },
                {
                  rotate: (i % 2 ? sway : sway2).interpolate({
                    inputRange: [0, 1],
                    outputRange: ["-5deg", "5deg"],
                  }),
                },
                { translateY: -t.h / 2 },
              ],
            }}
          >
            <View style={{ width: 1.2, height: 16, backgroundColor: "#8A8070" }} />
            <View
              style={{
                width: 9,
                height: t.h,
                borderRadius: 4,
                backgroundColor: t.c,
                borderWidth: 0.8,
                borderColor: "rgba(80,100,140,0.35)",
              }}
            >
              <View
                style={{
                  position: "absolute",
                  left: 1.5,
                  top: 4,
                  width: 2,
                  height: t.h - 12,
                  borderRadius: 1,
                  backgroundColor: "rgba(255,255,255,0.7)",
                }}
              />
            </View>
          </Animated.View>
        ))}

        {/* garden floor */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: -30,
            right: -30,
            bottom: -50,
            height: 170,
            borderRadius: 100,
            backgroundColor: "#A9C4B2",
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 30,
            right: 30,
            bottom: 14,
            height: 30,
            borderRadius: 30,
            backgroundColor: "#8FC2D4",
            opacity: 0.9,
          }}
        />
        {Array.from({ length: 26 }).map((_, i) => {
          const r = Math.abs(Math.sin(i * 5.1) * 7919.3) % 1;
          return (
            <View
              key={i}
              pointerEvents="none"
              style={{
                position: "absolute",
                bottom: 40 + (i % 3) * 6,
                left: `${(i / 26) * 100}%`,
                width: 4,
                height: 14 + r * 22,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                backgroundColor: i % 2 ? "#6E9C6B" : "#86B382",
                transform: [{ rotate: `${(r - 0.5) * 24}deg` }],
              }}
            />
          );
        })}

        <Pressable
          style={StyleSheet.absoluteFill}
          onPressIn={(e) =>
            trigger(kind, e.nativeEvent.locationX, e.nativeEvent.locationY)
          }
        />

        {fx.map((f) => (
          <SoundFx key={f.id} fx={f} onDone={remove} />
        ))}

        {fx.length === 0 && !ambient && (
          <View pointerEvents="none" style={styles.soundEmpty}>
            <Text style={styles.soundEmptyTitle}>Choose a sound, then tap.</Text>
            <Text style={styles.soundEmptyText}>
              Chimes play higher notes on the right.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.soundControls}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeRow}
        >
          {SOUND_ITEMS.map((s) => {
            const on = kind === s.id;
            return (
              <Pressable
                key={s.id}
                onPressIn={() => setKind(s.id)}
                style={[styles.typeChip, on && { backgroundColor: "#5B8DEF" }]}
              >
                <Text style={styles.typeIcon}>{s.icon}</Text>
                <Text style={[styles.typeLabel, on && { color: C.white }]}>
                  {s.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.soundToggleRow}>
          <Pressable
            onPress={() => setAmbient((a) => !a)}
            style={[styles.toggleBtn, ambient && { backgroundColor: "#5B8DEF" }]}
          >
            <Text style={[styles.toggleText, ambient && { color: C.white }]}>
              {ambient ? "Ambient: on" : "Ambient: off"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMuted((m) => !m)}
            style={[styles.toggleBtn, muted && { backgroundColor: C.muted }]}
          >
            <Text style={[styles.toggleText, muted && { color: C.white }]}>
              {muted ? "Sound: muted" : "Sound: on"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const SoundFx = memo(function SoundFx({
  fx,
  onDone,
}: {
  fx: Fx;
  onDone: (id: number) => void;
}) {
  const done = () => onDone(fx.id);
  switch (fx.kind) {
    case "leaf":
      return <LeafFx fx={fx} onDone={done} />;
    case "rain":
      return <RainFx fx={fx} onDone={done} />;
    case "chime":
      return <ChimeFx fx={fx} onDone={done} />;
    case "water":
      return <WaterFx fx={fx} onDone={done} />;
    default:
      return <WindFx fx={fx} onDone={done} />;
  }
});

const CLAMP = { extrapolate: "clamp" as const };

function LeafFx({ fx, onDone }: { fx: Fx; onDone: () => void }) {
  const p = useProgress(4200, Easing.linear, onDone);
  const color = LEAF_COLORS[(fx.id + fx.v) % LEAF_COLORS.length];
  const d = fx.dir;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: fx.x - 11,
        top: fx.y - 6,
        opacity: p.interpolate({
          inputRange: [0, 0.08, 0.8, 1],
          outputRange: [0, 1, 1, 0],
        }),
        transform: [
          {
            translateY: p.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 170],
            }),
          },
          {
            translateX: p.interpolate({
              inputRange: [0, 0.25, 0.5, 0.75, 1],
              outputRange: [0, 28 * d, -8 * d, 26 * d, 6 * d],
            }),
          },
          {
            rotate: p.interpolate({
              inputRange: [0, 0.25, 0.5, 0.75, 1],
              outputRange: ["0deg", `${70 * d}deg`, `${-20 * d}deg`, `${120 * d}deg`, `${200 * d}deg`],
            }),
          },
        ],
      }}
    >
      <View
        style={{
          width: 22,
          height: 12,
          borderTopLeftRadius: 14,
          borderBottomRightRadius: 14,
          borderTopRightRadius: 3,
          borderBottomLeftRadius: 3,
          backgroundColor: color,
          ...shadow("#3A5A3A", 0.25, 3, 2, 2),
        }}
      >
        <View
          style={{
            position: "absolute",
            left: 2,
            right: 2,
            top: 5.5,
            height: 1,
            backgroundColor: "rgba(255,255,255,0.55)",
          }}
        />
      </View>
    </Animated.View>
  );
}

function RainFx({ fx, onDone }: { fx: Fx; onDone: () => void }) {
  const p = useProgress(1700, Easing.linear, onDone);
  const ringStart = 0.2;

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: fx.x - 3,
          top: fx.y - 14,
          width: 6,
          height: 14,
          borderTopLeftRadius: 3,
          borderTopRightRadius: 3,
          borderBottomLeftRadius: 4,
          borderBottomRightRadius: 4,
          backgroundColor: "rgba(120,170,230,0.9)",
          opacity: p.interpolate({
            inputRange: [0, 0.03, ringStart - 0.01, ringStart],
            outputRange: [0, 1, 1, 0],
            ...CLAMP,
          }),
          transform: [
            {
              translateY: p.interpolate({
                inputRange: [0, ringStart],
                outputRange: [-150, 0],
                ...CLAMP,
              }),
            },
          ],
        }}
      />
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: fx.x - 30,
            top: fx.y - 11,
            width: 60,
            height: 22,
            borderRadius: 30,
            borderWidth: 1.8,
            borderColor: "rgba(255,255,255,0.95)",
            backgroundColor: "rgba(150,190,240,0.18)",
            opacity: p.interpolate({
              inputRange: [ringStart + i * 0.1, ringStart + i * 0.1 + 0.04, 1],
              outputRange: [0, 0.9 - i * 0.2, 0],
              ...CLAMP,
            }),
            transform: [
              {
                scale: p.interpolate({
                  inputRange: [ringStart + i * 0.1, 1],
                  outputRange: [0.1, 1.6 + i * 0.4],
                  ...CLAMP,
                }),
              },
            ],
          }}
        />
      ))}
    </>
  );
}

function ChimeFx({ fx, onDone }: { fx: Fx; onDone: () => void }) {
  const p = useProgress(2800, Easing.out(Easing.cubic), onDone);
  const color = CHIME_COLORS[fx.v % CHIME_COLORS.length];

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: fx.x - 30,
          top: fx.y - 30,
          width: 60,
          height: 60,
          borderRadius: 30,
          borderWidth: 2,
          borderColor: color,
          opacity: p.interpolate({
            inputRange: [0, 0.05, 1],
            outputRange: [0, 0.9, 0],
          }),
          transform: [
            {
              scale: p.interpolate({
                inputRange: [0, 1],
                outputRange: [0.2, 2.6],
              }),
            },
          ],
        }}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: fx.x - 14,
          top: fx.y - 14,
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: color,
          ...shadow(color, 1, 16, 0, 6),
          opacity: p.interpolate({
            inputRange: [0, 0.06, 0.7, 1],
            outputRange: [0, 1, 0.8, 0],
          }),
          transform: [
            {
              translateY: p.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -110],
              }),
            },
            {
              scale: p.interpolate({
                inputRange: [0, 0.15, 1],
                outputRange: [0.4, 1.15, 0.6],
              }),
            },
          ],
        }}
      >
        <View
          style={{
            position: "absolute",
            left: 6,
            top: 5,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: "rgba(255,255,255,0.8)",
          }}
        />
      </Animated.View>
      {[-1, 0, 1].map((k) => (
        <Animated.View
          key={k}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: fx.x - 2,
            top: fx.y - 2,
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: "#FFFFFF",
            opacity: p.interpolate({
              inputRange: [0, 0.1, 0.8],
              outputRange: [0, 1, 0],
              ...CLAMP,
            }),
            transform: [
              {
                translateX: p.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, k * 34],
                }),
              },
              {
                translateY: p.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -50 - Math.abs(k) * 16],
                }),
              },
            ],
          }}
        />
      ))}
    </>
  );
}

function WaterFx({ fx, onDone }: { fx: Fx; onDone: () => void }) {
  const p = useProgress(2400, Easing.out(Easing.cubic), onDone);

  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: fx.x - 32,
            top: fx.y - 32,
            width: 64,
            height: 64,
            borderRadius: 32,
            borderWidth: 2.2 - i * 0.3,
            borderColor: "rgba(255,255,255,0.95)",
            backgroundColor: "rgba(110,190,225,0.16)",
            opacity: p.interpolate({
              inputRange: [i * 0.1, i * 0.1 + 0.05, 1],
              outputRange: [0, 0.9 - i * 0.15, 0],
              ...CLAMP,
            }),
            transform: [
              {
                scale: p.interpolate({
                  inputRange: [i * 0.1, 1],
                  outputRange: [0.12, 3.2 + i * 0.3],
                  ...CLAMP,
                }),
              },
            ],
          }}
        />
      ))}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: fx.x - 5,
          top: fx.y - 5,
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: "#FFFFFF",
          opacity: p.interpolate({
            inputRange: [0, 0.3],
            outputRange: [0.95, 0],
            ...CLAMP,
          }),
        }}
      />
    </>
  );
}

function WindFx({ fx, onDone }: { fx: Fx; onDone: () => void }) {
  const p = useProgress(3200, Easing.out(Easing.quad), onDone);
  const streaks = [
    { dy: -18, w: 90, h: 3, dl: 0 },
    { dy: 0, w: 120, h: 3.5, dl: 0.08 },
    { dy: 20, w: 76, h: 3, dl: 0.16 },
  ];

  return (
    <>
      {streaks.map((s, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: fx.x - 50,
            top: fx.y + s.dy,
            width: s.w,
            height: s.h,
            borderRadius: 2,
            backgroundColor: "rgba(255,255,255,0.85)",
            opacity: p.interpolate({
              inputRange: [s.dl, s.dl + 0.12, 0.8, 1],
              outputRange: [0, 0.85, 0.5, 0],
              ...CLAMP,
            }),
            transform: [
              {
                translateX: p.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 230],
                }),
              },
              {
                translateY: p.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, -10 - i * 4, 6],
                }),
              },
            ],
          }}
        />
      ))}
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={`s${i}`}
          pointerEvents="none"
          style={{
            position: "absolute",
            left: fx.x,
            top: fx.y - 8 + i * 14,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: "#F4F9E8",
            opacity: p.interpolate({
              inputRange: [0, 0.1, 0.9, 1],
              outputRange: [0, 0.9, 0.5, 0],
            }),
            transform: [
              {
                translateX: p.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 190 + i * 24],
                }),
              },
              {
                translateY: p.interpolate({
                  inputRange: [0, 0.3, 0.6, 1],
                  outputRange: [0, -16, 8, -10],
                }),
              },
            ],
          }}
        />
      ))}
    </>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.cream,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight ?? 0 : 0,
  },
  fullScreen: { flex: 1, backgroundColor: C.cream },

  /* MENU */
  menuContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  menuTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuTopLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    color: C.deepTeal,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: { fontSize: 30, lineHeight: 32, color: C.dark, marginTop: -3 },
  menuHeader: { paddingTop: 32, paddingBottom: 25 },
  menuTitle: { fontSize: 32, lineHeight: 39, fontWeight: "800", color: C.dark },
  menuSubtitle: { marginTop: 12, fontSize: 15, lineHeight: 23, color: C.muted },
  calmCard: {
    minHeight: 105,
    borderRadius: 26,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  calmSymbol: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  calmSymbolText: { fontSize: 30, fontWeight: "300" },
  calmCardText: { flex: 1, marginLeft: 15, paddingRight: 8 },
  calmCardTitle: { fontSize: 18, fontWeight: "800", color: C.dark },
  calmCardDescription: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 18,
    color: C.muted,
  },
  calmArrow: { fontSize: 25, fontWeight: "600" },
  menuFooter: { alignItems: "center", paddingTop: 12 },
  footerText: { color: C.muted, fontSize: 12 },

  /* HEADER */
  activityHeader: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  activityBack: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },
  activityBackText: { fontSize: 30, color: C.dark, marginTop: -3 },
  activityHeaderText: { marginLeft: 14, flex: 1 },
  activityTitle: { fontSize: 21, fontWeight: "800", color: C.dark },
  activitySubtitle: { fontSize: 12, color: C.muted, marginTop: 2 },

  /* SHARED */
  bottomMessageTitle: { fontSize: 17, fontWeight: "800", color: C.dark },
  resetButton: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: C.white,
  },
  resetButtonText: { color: C.deepTeal, fontSize: 13, fontWeight: "700" },

  /* BUBBLE POP */
  bubbleSheet: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 14,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "#E4F4F2",
  },
  bubbleDone: {
    position: "absolute",
    left: 30,
    right: 30,
    top: "42%",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.88)",
  },
  bubbleDoneTitle: { fontSize: 20, fontWeight: "800", color: C.dark },
  bubbleDoneText: {
    marginTop: 6,
    fontSize: 13,
    color: C.muted,
    textAlign: "center",
  },

  /* FIDGET SPINNER */
  spinScene: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 14,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "#E6D9F1",
  },
  spinHint: {
    position: "absolute",
    alignSelf: "center",
    top: 22,
    color: "#7B5E99",
    fontSize: 13,
    opacity: 0.7,
  },

  /* PEBBLE STACK */
  pebbleScene: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 14,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "#FDE8D3",
  },
  pebbleSun: {
    position: "absolute",
    top: 30,
    right: 34,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFD9A8",
    opacity: 0.8,
  },
  pebbleGround: {
    position: "absolute",
    left: -30,
    right: -30,
    bottom: -60,
    height: 150,
    borderRadius: 90,
    backgroundColor: "#E3CFA8",
  },
  pebbleGroundShade: {
    position: "absolute",
    left: "30%",
    right: "30%",
    bottom: 54,
    height: 14,
    borderRadius: 8,
    backgroundColor: "rgba(110,80,40,0.2)",
  },
  pebbleEmpty: {
    position: "absolute",
    left: 30,
    right: 30,
    top: "30%",
    alignItems: "center",
  },

  /* SAND */
  sandArea: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 14,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#E6D2AE",
  },
  sandHint: {
    position: "absolute",
    alignSelf: "center",
    top: 25,
    color: "#8A7050",
    fontSize: 13,
    opacity: 0.6,
  },
  sandBottom: { paddingHorizontal: 20, paddingBottom: 25, alignItems: "center" },
  sandBottomText: { color: C.muted, fontSize: 13, marginBottom: 10 },

  /* GARDEN */
  garden: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "#DDF1E5",
  },
  sunGlow: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: C.yellow,
  },
  gardenSun: {
    position: "absolute",
    top: 30,
    right: 30,
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: C.yellow,
    borderWidth: 4,
    borderColor: "#FFE98F",
  },
  skyCloud: {
    position: "absolute",
    width: 80,
    height: 26,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  skyPuff: {
    position: "absolute",
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  hillBack: {
    position: "absolute",
    left: -60,
    right: -30,
    bottom: 30,
    height: 190,
    borderRadius: 120,
    backgroundColor: "#BFDDBA",
  },
  gardenGround: {
    position: "absolute",
    left: -20,
    right: -20,
    bottom: -40,
    height: 190,
    borderRadius: 100,
    backgroundColor: "#A8C6A4",
  },
  gardenGroundLine: {
    position: "absolute",
    left: 20,
    right: 20,
    top: 25,
    height: 2,
    backgroundColor: "#8DAE8A",
    opacity: 0.5,
  },
  gardenEmpty: {
    position: "absolute",
    left: 30,
    right: 30,
    top: "40%",
    alignItems: "center",
  },
  gardenEmptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.dark,
    textAlign: "center",
  },
  gardenEmptyText: { marginTop: 7, color: C.muted, fontSize: 13, textAlign: "center" },
  gardenNotice: {
    position: "absolute",
    left: 20,
    right: 20,
    top: 14,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    zIndex: 5000,
  },
  gardenNoticeText: { color: C.dark, fontSize: 12.5, fontWeight: "700", textAlign: "center" },
  gardenControls: { paddingBottom: 18, alignItems: "center" },
  typeRow: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: "center",
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: C.white,
    gap: 6,
  },
  typeIcon: { fontSize: 16 },
  typeLabel: { fontSize: 12.5, fontWeight: "700", color: C.dark },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 12,
    marginBottom: 12,
  },
  colorButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderColor: C.dark,
  },
  wing: {
    position: "absolute",
    borderRadius: 12,
    borderWidth: 0.7,
    borderColor: "rgba(0,0,0,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  wingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.75)",
  },

  /* SOUND */
  soundScene: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: "#CBD8EE",
  },
  soundEmpty: {
    position: "absolute",
    left: 30,
    right: 30,
    top: "46%",
    alignItems: "center",
  },
  soundEmptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: C.dark,
    textAlign: "center",
  },
  soundEmptyText: {
    marginTop: 7,
    color: C.muted,
    fontSize: 12.5,
    textAlign: "center",
  },
  soundControls: { paddingBottom: 20, alignItems: "center" },
  soundToggleRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  toggleBtn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: C.white,
  },
  toggleText: { color: C.deepTeal, fontSize: 12.5, fontWeight: "700" },
}); 