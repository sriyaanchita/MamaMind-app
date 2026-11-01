import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useRouter } from "expo-router";

import {
  addCommunityReply,
  createCommunityPost,
  hasSupportedPost,
  subscribeToCommunityPosts,
  toggleCommunitySupport,
} from "../utils/communityService";

const { width, height } = Dimensions.get("window");

/* =====================================================
   MAMAMIND COLOURS
===================================================== */

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
} as const;

/* =====================================================
   TYPES
===================================================== */

type CommunityPost = {
  id: string;
  userId: string;
  name: string;
  text: string;
  supports: number;
  replies: number;
  supported: boolean;
  createdAt?: any;
};

/* =====================================================
   FLOATING ELEMENTS
===================================================== */

const floatingDefinitions = [
  {
    type: "bubble",
    left: 0.03,
    top: 0.12,
    size: 46,
    color: C.yellow,
  },
  {
    type: "dot",
    left: 0.91,
    top: 0.08,
    size: 15,
    color: C.coral,
  },
  {
    type: "heart",
    left: 0.05,
    top: 0.32,
    size: 30,
    color: C.teal,
  },
  {
    type: "ring",
    left: 0.91,
    top: 0.29,
    size: 30,
    color: C.yellow,
  },
  {
    type: "star",
    left: 0.04,
    top: 0.57,
    size: 27,
    color: C.coral,
  },
  {
    type: "bubble",
    left: 0.91,
    top: 0.54,
    size: 42,
    color: C.teal,
  },
  {
    type: "dot",
    left: 0.14,
    top: 0.76,
    size: 12,
    color: C.yellow,
  },
  {
    type: "ring",
    left: 0.84,
    top: 0.79,
    size: 24,
    color: C.coral,
  },
];

/* =====================================================
   FLOATING SHAPE
===================================================== */

function FloatingShape({
  item,
  animation,
}: {
  item: (typeof floatingDefinitions)[number];
  animation: {
    x: Animated.Value;
    y: Animated.Value;
    scale: Animated.Value;
    rotate: Animated.Value;
  };
}) {
  const rotate = animation.rotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-8deg", "0deg", "8deg"],
  });

  const baseStyle = {
    position: "absolute" as const,
    left: item.left * width,
    top: item.top * height,
    width: item.size,
    height: item.size,
    transform: [
      { translateX: animation.x },
      { translateY: animation.y },
      { scale: animation.scale },
      { rotate },
    ],
  };

  if (item.type === "bubble") {
    return (
      <Animated.View
        style={[
          baseStyle,
          {
            borderRadius: item.size / 2,
            backgroundColor: item.color,
            opacity: 0.18,
          },
        ]}
      />
    );
  }

  if (item.type === "dot") {
    return (
      <Animated.View
        style={[
          baseStyle,
          {
            borderRadius: item.size / 2,
            backgroundColor: item.color,
            opacity: 0.35,
          },
        ]}
      />
    );
  }

  if (item.type === "ring") {
    return (
      <Animated.View
        style={[
          baseStyle,
          {
            borderRadius: item.size / 2,
            borderWidth: 3,
            borderColor: item.color,
            opacity: 0.28,
          },
        ]}
      />
    );
  }

  if (item.type === "heart") {
    return (
      <Animated.View style={baseStyle}>
        <Text
          style={{
            fontSize: item.size,
            color: item.color,
            opacity: 0.25,
          }}
        >
          ♡
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={baseStyle}>
      <Text
        style={{
          fontSize: item.size,
          color: item.color,
          opacity: 0.25,
        }}
      >
        ✦
      </Text>
    </Animated.View>
  );
}

/* =====================================================
   MAIN COMMUNITY
===================================================== */

export default function Community() {
  const router = useRouter();

  /* ---------------------------------------------------
     POSTS
  --------------------------------------------------- */

  const [posts, setPosts] = useState<
    CommunityPost[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [posting, setPosting] = useState(false);

  /* ---------------------------------------------------
     CREATE POST
  --------------------------------------------------- */

  const [postText, setPostText] = useState("");

  const [selectedPrompt, setSelectedPrompt] =
    useState<string | null>(null);

  const [sharedMessage, setSharedMessage] =
    useState(false);

  /* ---------------------------------------------------
     REPLY
  --------------------------------------------------- */

  const [replyModalVisible, setReplyModalVisible] =
    useState(false);

  const [replyPost, setReplyPost] =
    useState<CommunityPost | null>(null);

  const [replyText, setReplyText] =
    useState("");

  const [sendingReply, setSendingReply] =
    useState(false);

  /* ---------------------------------------------------
     SUPPORT LOADING
  --------------------------------------------------- */

  const [supportingPostId, setSupportingPostId] =
    useState<string | null>(null);

  /* ---------------------------------------------------
     FLOATING ANIMATION
  --------------------------------------------------- */

  const floatingItems = useRef(
    floatingDefinitions.map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      scale: new Animated.Value(1),
      rotate: new Animated.Value(0),
    }))
  ).current;

  /* ---------------------------------------------------
     BUTTON ANIMATION
  --------------------------------------------------- */

  const shareScale = useRef(
    new Animated.Value(1)
  ).current;

  /* ===================================================
     FLOATING ANIMATION EFFECT
  =================================================== */

  useEffect(() => {
    let cancelled = false;

    const timers: ReturnType<
      typeof setTimeout
    >[] = [];

    floatingItems.forEach((item, index) => {
      const move = () => {
        if (cancelled) return;

        const xDistance =
          (Math.random() - 0.5) * 65;

        const yDistance =
          (Math.random() - 0.5) * 60;

        const duration =
          6500 + Math.random() * 2500;

        const rotateTarget =
          Math.random() > 0.5 ? 1 : -1;

        const animation = Animated.parallel([
          Animated.timing(item.x, {
            toValue: xDistance,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),

          Animated.timing(item.y, {
            toValue: yDistance,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),

          Animated.sequence([
            Animated.timing(item.scale, {
              toValue: 1.05,
              duration: duration / 2,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),

            Animated.timing(item.scale, {
              toValue: 1,
              duration: duration / 2,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),

          Animated.sequence([
            Animated.timing(item.rotate, {
              toValue: rotateTarget,
              duration: duration / 2,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),

            Animated.timing(item.rotate, {
              toValue: 0,
              duration: duration / 2,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        ]);

        animation.start(({ finished }) => {
          if (finished && !cancelled) {
            move();
          }
        });
      };

      const timer = setTimeout(
        move,
        index * 220
      );

      timers.push(timer);
    });

    return () => {
      cancelled = true;

      timers.forEach((timer) =>
        clearTimeout(timer)
      );

      floatingItems.forEach((item) => {
        item.x.stopAnimation();
        item.y.stopAnimation();
        item.scale.stopAnimation();
        item.rotate.stopAnimation();
      });
    };
  }, [floatingItems]);

  /* ===================================================
     FIREBASE REAL-TIME FEED
  =================================================== */

  useEffect(() => {
    const unsubscribe =
      subscribeToCommunityPosts(
        async (firebasePosts) => {
          const formattedPosts: CommunityPost[] =
            firebasePosts.map((item) => ({
              id: item.id,
              userId: item.userId,
              name: item.name,
              text: item.text,
              supports: item.supportCount,
              replies: item.replyCount,
              supported: false,
              createdAt: item.createdAt,
            }));

          setPosts(formattedPosts);
          setLoading(false);

          /*
           * Check which posts the current user
           * has already supported.
           */
          for (const post of formattedPosts) {
            try {
              const supported =
                await hasSupportedPost(
                  post.id
                );

              setPosts((current) =>
                current.map((item) =>
                  item.id === post.id
                    ? {
                        ...item,
                        supported,
                      }
                    : item
                )
              );
            } catch {
              // User may not be authenticated.
            }
          }
        }
      );

    return () => {
      unsubscribe();
    };
  }, []);

  /* ===================================================
     PROMPTS
  =================================================== */

  const prompts = [
    "Something I am proud of today is...",
    "Something that made me smile today...",
    "One thing I wish someone told me...",
    "Right now, I need...",
  ];

  /* ===================================================
     CREATE POST
  =================================================== */

  const addPost = async () => {
    const cleanText = postText.trim();

    if (!cleanText) {
      Alert.alert(
        "Share something",
        "Write a little something before sharing."
      );

      return;
    }

    if (cleanText.length > 500) {
      Alert.alert(
        "That's a little long",
        "Please keep your post under 500 characters."
      );

      return;
    }

    try {
      setPosting(true);

      await createCommunityPost(cleanText);

      setPostText("");
      setSelectedPrompt(null);

      Animated.sequence([
        Animated.spring(shareScale, {
          toValue: 0.94,
          friction: 5,
          tension: 100,
          useNativeDriver: true,
        }),

        Animated.spring(shareScale, {
          toValue: 1,
          friction: 5,
          tension: 90,
          useNativeDriver: true,
        }),
      ]).start();

      setSharedMessage(true);

      setTimeout(() => {
        setSharedMessage(false);
      }, 2200);
    } catch (error) {
      console.error(
        "CREATE COMMUNITY POST ERROR:",
        error
      );

      Alert.alert(
        "Couldn't share",
        "Something went wrong while sharing your post. Please try again."
      );
    } finally {
      setPosting(false);
    }
  };

  /* ===================================================
     SUPPORT
  =================================================== */

  const toggleSupport = async (
    post: CommunityPost
  ) => {
    if (supportingPostId) {
      return;
    }

    try {
      setSupportingPostId(post.id);

      await toggleCommunitySupport(
        post.id
      );

      /*
       * Optimistic local update.
       * Firestore will also update the feed
       * through onSnapshot.
       */
      setPosts((current) =>
        current.map((item) => {
          if (item.id !== post.id) {
            return item;
          }

          const nextSupported =
            !item.supported;

          return {
            ...item,
            supported: nextSupported,
            supports:
              item.supports +
              (nextSupported ? 1 : -1),
          };
        })
      );
    } catch (error) {
      console.error(
        "SUPPORT ERROR:",
        error
      );

      Alert.alert(
        "Couldn't update",
        "Please try again."
      );
    } finally {
      setSupportingPostId(null);
    }
  };

  /* ===================================================
     OPEN REPLY
  =================================================== */

  const openReply = (
    post: CommunityPost
  ) => {
    setReplyPost(post);
    setReplyText("");
    setReplyModalVisible(true);
  };

  /* ===================================================
     SEND REPLY
  =================================================== */

  const sendReply = async () => {
    if (!replyPost) {
      return;
    }

    const cleanReply =
      replyText.trim();

    if (!cleanReply) {
      return;
    }

    if (cleanReply.length > 300) {
      Alert.alert(
        "That's a little long",
        "Please keep your reply under 300 characters."
      );

      return;
    }

    try {
      setSendingReply(true);

      await addCommunityReply(
        replyPost.id,
        cleanReply
      );

      setReplyText("");
      setReplyModalVisible(false);
      setReplyPost(null);
    } catch (error) {
      console.error(
        "REPLY ERROR:",
        error
      );

      Alert.alert(
        "Couldn't send reply",
        "Please try again."
      );
    } finally {
      setSendingReply(false);
    }
  };

  /* ===================================================
     FORMAT TIME
  =================================================== */

  const formatTime = (
    timestamp: any
  ) => {
    if (!timestamp) {
      return "Just now";
    }

    try {
      const date =
        timestamp.toDate
          ? timestamp.toDate()
          : new Date(timestamp);

      const difference =
        Date.now() - date.getTime();

      const minutes = Math.floor(
        difference / 60000
      );

      if (minutes < 1) {
        return "Just now";
      }

      if (minutes < 60) {
        return `${minutes}m ago`;
      }

      const hours = Math.floor(
        minutes / 60
      );

      if (hours < 24) {
        return `${hours}h ago`;
      }

      const days = Math.floor(
        hours / 24
      );

      if (days < 7) {
        return `${days}d ago`;
      }

      return date.toLocaleDateString();
    } catch {
      return "Recently";
    }
  };

  /* ===================================================
     AVATAR LETTER
  =================================================== */

  const getInitial = (
    name: string
  ) => {
    return (
      name?.trim()?.charAt(0)?.toUpperCase() ||
      "M"
    );
  };

  /* ===================================================
     RENDER
  =================================================== */

  return (
    <View style={styles.screen}>

      {/* -----------------------------------------------
          FLOATING BACKGROUND
      ----------------------------------------------- */}

      <View
        pointerEvents="none"
        style={styles.floatingLayer}
      >
        {floatingDefinitions.map(
          (item, index) => (
            <FloatingShape
              key={index}
              item={item}
              animation={
                floatingItems[index]
              }
            />
          )
        )}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={
          styles.contentContainer
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ---------------------------------------------
            HEADER
        --------------------------------------------- */}

        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed &&
                styles.pressedSmall,
            ]}
          >
            <Text style={styles.backArrow}>
              ←
            </Text>
          </Pressable>

          <Text style={styles.topBarLabel}>
            MAMAMIND
          </Text>

          <View style={styles.topBarSpacer} />
        </View>

        <Text style={styles.eyebrow}>
          MOTHER TO MOTHER
        </Text>

        <Text style={styles.title}>
          Your Village
        </Text>

        <Text style={styles.subtitle}>
          A gentle space to share, listen and
          remind each other that none of us
          has to do this alone.
        </Text>

        {/* ---------------------------------------------
            COMMUNITY STATS
        --------------------------------------------- */}

        <View style={styles.communityInfoRow}>
          <View style={styles.infoPill}>
            <View
              style={styles.infoDot}
            />

            <Text style={styles.infoText}>
              {posts.length === 0
                ? "New village"
                : `${posts.length} stories`}
            </Text>
          </View>

          <View style={styles.safePill}>
            <Text style={styles.safePillText}>
              A gentle space
            </Text>
          </View>
        </View>

        {/* ---------------------------------------------
            CREATE POST
        --------------------------------------------- */}

        <View style={styles.createCard}>

          <View style={styles.createHeader}>
            <View>
              <Text style={styles.createTitle}>
                Share something with the village
              </Text>

              <Text style={styles.createSubtitle}>
                A thought, a question or a little win.
              </Text>
            </View>

            <View style={styles.createSymbol}>
              <Text style={styles.createSymbolText}>
                ♡
              </Text>
            </View>
          </View>

          {/* PROMPTS */}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={
              styles.promptScroll
            }
          >
            {prompts.map(
              (prompt, index) => (
                <Pressable
                  key={index}
                  onPress={() => {
                    setSelectedPrompt(
                      prompt
                    );

                    setPostText(
                      prompt
                    );
                  }}
                  style={[
                    styles.promptChip,
                    selectedPrompt ===
                      prompt &&
                      styles.promptChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.promptText,
                      selectedPrompt ===
                        prompt &&
                        styles.promptTextSelected,
                    ]}
                  >
                    {prompt}
                  </Text>
                </Pressable>
              )
            )}
          </ScrollView>

          {/* TEXT INPUT */}

          <View style={styles.inputWrapper}>
            <TextInput
              value={postText}
              onChangeText={(text) => {
                if (text.length <= 500) {
                  setPostText(text);
                }
              }}
              placeholder="What's on your heart?"
              placeholderTextColor={
                C.muted
              }
              multiline
              maxLength={500}
              textAlignVertical="top"
              style={styles.postInput}
            />

            <Text style={styles.characterCount}>
              {postText.length}/500
            </Text>
          </View>

          {/* SHARE BUTTON */}

          <Animated.View
            style={{
              transform: [
                {
                  scale: shareScale,
                },
              ],
            }}
          >
            <Pressable
              disabled={posting}
              onPress={addPost}
              style={({ pressed }) => [
                styles.shareButton,
                pressed &&
                  styles.buttonPressed,
                posting &&
                  styles.buttonDisabled,
              ]}
            >
              {posting ? (
                <ActivityIndicator
                  color={C.dark}
                  size="small"
                />
              ) : (
                <>
                  <Text
                    style={
                      styles.shareButtonText
                    }
                  >
                    Share with the Village
                  </Text>

                  <Text
                    style={
                      styles.shareArrow
                    }
                  >
                    →
                  </Text>
                </>
              )}
            </Pressable>
          </Animated.View>

          {sharedMessage && (
            <View
              style={styles.sharedMessage}
            >
              <Text
                style={
                  styles.sharedMessageText
                }
              >
                Your story is now part of
                the village. ♡
              </Text>
            </View>
          )}
        </View>

        {/* ---------------------------------------------
            FEED HEADER
        --------------------------------------------- */}

        <View style={styles.feedHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>
              FROM THE COMMUNITY
            </Text>

            <Text style={styles.feedTitle}>
              Little reminders from other mamas.
            </Text>
          </View>

          {posts.length > 0 && (
            <View style={styles.countBadge}>
              <Text
                style={styles.countBadgeText}
              >
                {posts.length}
              </Text>
            </View>
          )}
        </View>

        {/* ---------------------------------------------
            LOADING
        --------------------------------------------- */}

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator
              color={C.teal}
              size="small"
            />

            <Text style={styles.loadingText}>
              Gathering the village...
            </Text>
          </View>
        )}

        {/* ---------------------------------------------
            EMPTY STATE
        --------------------------------------------- */}

        {!loading &&
          posts.length === 0 && (
            <View style={styles.emptyCard}>
              <View
                style={
                  styles.emptyIllustration
                }
              >
                <Text
                  style={
                    styles.emptyHeart
                  }
                >
                  ♡
                </Text>
              </View>

              <Text style={styles.emptyTitle}>
                Be the first to share
              </Text>

              <Text style={styles.emptyText}>
                Your little story could be the
                reminder another mama needs today.
              </Text>
            </View>
          )}

        {/* ---------------------------------------------
            POSTS
        --------------------------------------------- */}

        {!loading &&
          posts.map((post) => (
            <View
              key={post.id}
              style={styles.postCard}
            >

              {/* POST HEADER */}

              <View style={styles.postHeader}>
                <View
                  style={
                    styles.avatar
                  }
                >
                  <Text
                    style={
                      styles.avatarText
                    }
                  >
                    {getInitial(
                      post.name
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.postIdentity
                  }
                >
                  <View
                    style={
                      styles.nameRow
                    }
                  >
                    <Text
                      style={
                        styles.postName
                      }
                    >
                      {post.name}
                    </Text>

                    <View
                      style={
                        styles.mamaBadge
                      }
                    >
                      <Text
                        style={
                          styles.mamaBadgeText
                        }
                      >
                        MAMA
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={
                      styles.postTime
                    }
                  >
                    {formatTime(
                      post.createdAt
                    )}
                  </Text>
                </View>
              </View>

              {/* POST TEXT */}

              <Text style={styles.postText}>
                {post.text}
              </Text>

              {/* POST ACTIONS */}

              <View
                style={
                  styles.postActions
                }
              >

                <Pressable
                  disabled={
                    supportingPostId ===
                    post.id
                  }
                  onPress={() =>
                    toggleSupport(post)
                  }
                  style={({ pressed }) => [
                    styles.supportButton,
                    pressed &&
                      styles.actionPressed,
                    post.supported &&
                      styles.supportButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.supportIcon,
                      post.supported &&
                        styles.supportIconActive,
                    ]}
                  >
                    {post.supported
                      ? "♥"
                      : "♡"}
                  </Text>

                  <Text
                    style={[
                      styles.supportText,
                      post.supported &&
                        styles.supportTextActive,
                    ]}
                  >
                    {post.supported
                      ? "Supported"
                      : "Support"}
                  </Text>

                  {post.supports >
                    0 && (
                    <Text
                      style={
                        styles.actionCount
                      }
                    >
                      {post.supports}
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() =>
                    openReply(post)
                  }
                  style={({ pressed }) => [
                    styles.replyButton,
                    pressed &&
                      styles.actionPressed,
                  ]}
                >
                  <Text
                    style={
                      styles.replyIcon
                    }
                  >
                    ◌
                  </Text>

                  <Text
                    style={
                      styles.replyText
                    }
                  >
                    Reply
                  </Text>

                  {post.replies >
                    0 && (
                    <Text
                      style={
                        styles.actionCount
                      }
                    >
                      {post.replies}
                    </Text>
                  )}
                </Pressable>
              </View>

              {/* SUPPORT MESSAGE */}

              {post.supports > 0 && (
                <View
                  style={
                    styles.supportSummary
                  }
                >
                  <View
                    style={
                      styles.supportMiniDots
                    }
                  >
                    <View
                      style={
                        styles.miniDotOne
                      }
                    />
                    <View
                      style={
                        styles.miniDotTwo
                      }
                    />
                    <View
                      style={
                        styles.miniDotThree
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.supportSummaryText
                    }
                  >
                    {post.supports === 1
                      ? "1 mama supported this"
                      : `${post.supports} mamas supported this`}
                  </Text>
                </View>
              )}
            </View>
          ))}

        {/* ---------------------------------------------
            FOOTER
        --------------------------------------------- */}

        <View style={styles.footer}>
          <View style={styles.footerLine} />

          <Text style={styles.footerTitle}>
            There is room for every story here.
          </Text>

          <Text style={styles.footerText}>
            Share only what feels comfortable.
          </Text>

          <Text style={styles.footerSymbol}>
            ♡
          </Text>

          <Text style={styles.footerBrand}>
            Mamas supporting mamas
          </Text>
        </View>

      </ScrollView>

      {/* =================================================
          REPLY MODAL
      ================================================= */}

      <Modal
        visible={replyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setReplyModalVisible(false)
        }
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() =>
              setReplyModalVisible(false)
            }
          />

          <View style={styles.replyModal}>

            <View
              style={
                styles.modalHandle
              }
            />

            <View
              style={
                styles.modalHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.modalEyebrow
                  }
                >
                  JOIN THE CONVERSATION
                </Text>

                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  A little kindness can
                  mean a lot.
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  setReplyModalVisible(
                    false
                  );
                  setReplyPost(null);
                }}
                style={
                  styles.closeButton
                }
              >
                <Text
                  style={
                    styles.closeButtonText
                  }
                >
                  ×
                </Text>
              </Pressable>
            </View>

            {/* ORIGINAL POST */}

            {replyPost && (
              <View
                style={
                  styles.replyPreview
                }
              >
                <View
                  style={
                    styles.replyPreviewAvatar
                  }
                >
                  <Text
                    style={
                      styles.replyPreviewAvatarText
                    }
                  >
                    {getInitial(
                      replyPost.name
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.replyPreviewContent
                  }
                >
                  <Text
                    style={
                      styles.replyPreviewName
                    }
                  >
                    {replyPost.name}
                  </Text>

                  <Text
                    style={
                      styles.replyPreviewText
                    }
                    numberOfLines={3}
                  >
                    {replyPost.text}
                  </Text>
                </View>
              </View>
            )}

            {/* REPLY INPUT */}

            <View
              style={
                styles.replyInputWrapper
              }
            >
              <TextInput
                value={replyText}
                onChangeText={(text) => {
                  if (text.length <= 300) {
                    setReplyText(text);
                  }
                }}
                placeholder="Write something kind..."
                placeholderTextColor={
                  C.muted
                }
                multiline
                maxLength={300}
                textAlignVertical="top"
                style={
                  styles.replyInput
                }
              />

              <Text
                style={
                  styles.replyCharacterCount
                }
              >
                {replyText.length}/300
              </Text>
            </View>

            <Text
              style={
                styles.kindnessHint
              }
            >
              Kind words are always welcome.
            </Text>

            <Pressable
              disabled={
                sendingReply ||
                !replyText.trim()
              }
              onPress={sendReply}
              style={({ pressed }) => [
                styles.sendReplyButton,
                pressed &&
                  styles.buttonPressed,
                (sendingReply ||
                  !replyText.trim()) &&
                  styles.buttonDisabled,
              ]}
            >
              {sendingReply ? (
                <ActivityIndicator
                  color={C.white}
                  size="small"
                />
              ) : (
                <>
                  <Text
                    style={
                      styles.sendReplyText
                    }
                  >
                    Send Reply
                  </Text>

                  <Text
                    style={
                      styles.sendReplyArrow
                    }
                  >
                    →
                  </Text>
                </>
              )}
            </Pressable>

          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.cream,
  },

  container: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 70,
  },

  floatingLayer: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 0,
},

  /* ---------------------------------------------------
     TOP BAR
  --------------------------------------------------- */

  topBar: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  backArrow: {
    color: C.dark,
    fontSize: 23,
    marginTop: -2,
  },

  topBarLabel: {
    color: C.deepTeal,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.5,
  },

  topBarSpacer: {
    width: 42,
  },

  /* ---------------------------------------------------
     HEADER
  --------------------------------------------------- */

  eyebrow: {
    color: C.teal,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.2,
    marginBottom: 7,
  },

  title: {
    color: C.dark,
    fontSize: 37,
    fontWeight: "800",
    letterSpacing: -1.2,
    marginBottom: 9,
  },

  subtitle: {
    color: C.muted,
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 350,
  },

  /* ---------------------------------------------------
     COMMUNITY INFO
  --------------------------------------------------- */

  communityInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 18,
    marginBottom: 20,
  },

  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.paleTeal,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },

  infoDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.teal,
    marginRight: 7,
  },

  infoText: {
    color: C.deepTeal,
    fontSize: 11,
    fontWeight: "700",
  },

  safePill: {
    backgroundColor: C.white,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },

  safePillText: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "600",
  },

  /* ---------------------------------------------------
     CREATE CARD
  --------------------------------------------------- */

  createCard: {
    backgroundColor: C.white,
    borderRadius: 26,
    padding: 18,
    marginBottom: 31,
    shadowColor: "#164F52",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 3,
  },

  createHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  createTitle: {
    color: C.dark,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 4,
  },

  createSubtitle: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 18,
  },

  createSymbol: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.paleTeal,
    alignItems: "center",
    justifyContent: "center",
  },

  createSymbolText: {
    color: C.teal,
    fontSize: 25,
  },

  promptScroll: {
    paddingBottom: 13,
    gap: 8,
  },

  promptChip: {
    borderWidth: 1,
    borderColor: "#DDEBEA",
    backgroundColor: C.cream,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 17,
    marginRight: 7,
  },

  promptChipSelected: {
    backgroundColor: C.paleTeal,
    borderColor: C.teal,
  },

  promptText: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "600",
  },

  promptTextSelected: {
    color: C.deepTeal,
  },

  inputWrapper: {
    minHeight: 125,
    borderRadius: 17,
    backgroundColor: "#FAFCFA",
    borderWidth: 1,
    borderColor: "#E8EEEE",
    marginBottom: 12,
  },

  postInput: {
    minHeight: 105,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 25,
    color: C.dark,
    fontSize: 14,
    lineHeight: 21,
  },

  characterCount: {
    position: "absolute",
    right: 11,
    bottom: 8,
    color: C.muted,
    fontSize: 10,
  },

  shareButton: {
    minHeight: 49,
    borderRadius: 17,
    backgroundColor: C.yellow,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  shareButtonText: {
    color: C.dark,
    fontSize: 13,
    fontWeight: "800",
  },

  shareArrow: {
    color: C.dark,
    fontSize: 19,
    marginLeft: 9,
    marginTop: -2,
  },

  buttonPressed: {
    opacity: 0.88,
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  sharedMessage: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: C.paleTeal,
  },

  sharedMessageText: {
    textAlign: "center",
    color: C.deepTeal,
    fontSize: 11,
    fontWeight: "600",
  },

  /* ---------------------------------------------------
     FEED
  --------------------------------------------------- */

  feedHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  sectionEyebrow: {
    color: C.teal,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.8,
    marginBottom: 4,
  },

  feedTitle: {
    color: C.dark,
    fontSize: 14,
    fontWeight: "600",
  },

  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },

  countBadgeText: {
    color: C.deepTeal,
    fontSize: 11,
    fontWeight: "800",
  },

  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 38,
  },

  loadingText: {
    color: C.muted,
    fontSize: 12,
    marginTop: 10,
  },

  /* ---------------------------------------------------
     EMPTY
  --------------------------------------------------- */

  emptyCard: {
    backgroundColor: C.white,
    borderRadius: 25,
    padding: 27,
    alignItems: "center",
    marginBottom: 20,
  },

  emptyIllustration: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: C.paleTeal,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  emptyHeart: {
    color: C.teal,
    fontSize: 35,
  },

  emptyTitle: {
    color: C.dark,
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 7,
  },

  emptyText: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 290,
  },

  /* ---------------------------------------------------
     POST CARD
  --------------------------------------------------- */

  postCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 17,
    marginBottom: 13,
    shadowColor: "#164F52",
    shadowOpacity: 0.035,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },

  avatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: C.paleTeal,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  avatarText: {
    color: C.deepTeal,
    fontSize: 16,
    fontWeight: "800",
  },

  postIdentity: {
    flex: 1,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  postName: {
    color: C.dark,
    fontSize: 14,
    fontWeight: "800",
  },

  mamaBadge: {
    marginLeft: 7,
    backgroundColor: C.cream,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 7,
  },

  mamaBadgeText: {
    color: C.muted,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.7,
  },

  postTime: {
    color: C.muted,
    fontSize: 10,
    marginTop: 3,
  },

  postText: {
    color: C.dark,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 15,
  },

  postActions: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F0F3F2",
    paddingTop: 12,
  },

  supportButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingRight: 18,
  },

  supportButtonActive: {
    backgroundColor: C.paleTeal,
    paddingHorizontal: 9,
    borderRadius: 12,
  },

  supportIcon: {
    color: C.muted,
    fontSize: 19,
    marginRight: 5,
  },

  supportIconActive: {
    color: C.coral,
  },

  supportText: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "700",
  },

  supportTextActive: {
    color: C.deepTeal,
  },

  replyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 9,
  },

  replyIcon: {
    color: C.muted,
    fontSize: 18,
    marginRight: 5,
  },

  replyText: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "700",
  },

  actionCount: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "700",
    marginLeft: 5,
  },

  actionPressed: {
    opacity: 0.6,
  },

  supportSummary: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  supportMiniDots: {
    flexDirection: "row",
    marginRight: 7,
  },

  miniDotOne: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.yellow,
    borderWidth: 1,
    borderColor: C.white,
  },

  miniDotTwo: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.teal,
    borderWidth: 1,
    borderColor: C.white,
    marginLeft: -4,
  },

  miniDotThree: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.coral,
    borderWidth: 1,
    borderColor: C.white,
    marginLeft: -4,
  },

  supportSummaryText: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "600",
  },

  /* ---------------------------------------------------
     FOOTER
  --------------------------------------------------- */

  footer: {
    alignItems: "center",
    paddingTop: 25,
    paddingBottom: 15,
  },

  footerLine: {
    width: 45,
    height: 2,
    borderRadius: 1,
    backgroundColor: C.yellow,
    marginBottom: 20,
  },

  footerTitle: {
    color: C.dark,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 5,
  },

  footerText: {
    color: C.muted,
    fontSize: 11,
  },

  footerSymbol: {
    color: C.teal,
    fontSize: 23,
    marginTop: 13,
  },

  footerBrand: {
    color: C.deepTeal,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.3,
    marginTop: 3,
  },

  /* ---------------------------------------------------
     MODAL
  --------------------------------------------------- */

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },

  modalBackdrop: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(22,79,82,0.25)",
},
  replyModal: {
    backgroundColor: C.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 11,
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
    minHeight: 430,
  },

  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 3,
    backgroundColor: "#D8E4E3",
    alignSelf: "center",
    marginBottom: 20,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 17,
  },

  modalEyebrow: {
    color: C.teal,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.7,
    marginBottom: 5,
  },

  modalTitle: {
    color: C.dark,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 27,
    maxWidth: 300,
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.cream,
    alignItems: "center",
    justifyContent: "center",
  },

  closeButtonText: {
    color: C.dark,
    fontSize: 22,
    marginTop: -2,
  },

  replyPreview: {
    flexDirection: "row",
    backgroundColor: C.paleTeal,
    borderRadius: 16,
    padding: 12,
    marginBottom: 13,
  },

  replyPreviewAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  replyPreviewAvatarText: {
    color: C.deepTeal,
    fontSize: 12,
    fontWeight: "800",
  },

  replyPreviewContent: {
    flex: 1,
  },

  replyPreviewName: {
    color: C.deepTeal,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 3,
  },

  replyPreviewText: {
    color: C.dark,
    fontSize: 11,
    lineHeight: 17,
  },

  replyInputWrapper: {
    minHeight: 105,
    backgroundColor: "#FAFCFA",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E7EEEE",
  },

  replyInput: {
    minHeight: 85,
    paddingHorizontal: 13,
    paddingTop: 12,
    paddingBottom: 22,
    color: C.dark,
    fontSize: 13,
    lineHeight: 20,
  },

  replyCharacterCount: {
    position: "absolute",
    right: 10,
    bottom: 7,
    color: C.muted,
    fontSize: 9,
  },

  kindnessHint: {
    color: C.muted,
    fontSize: 10,
    marginTop: 9,
    marginBottom: 12,
  },

  sendReplyButton: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: C.deepTeal,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  sendReplyText: {
    color: C.white,
    fontSize: 13,
    fontWeight: "800",
  },

  sendReplyArrow: {
    color: C.white,
    fontSize: 18,
    marginLeft: 8,
  },

  pressedSmall: {
    opacity: 0.7,
  },
});