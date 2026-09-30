import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { router } from "expo-router";

const { width, height } = Dimensions.get("window");

/* -------------------------------------------------------
   MAMAMIND COLOUR PALETTE
------------------------------------------------------- */

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

/* -------------------------------------------------------
   FLOATING ELEMENTS
   Same floating system as the dashboard
------------------------------------------------------- */

type FloatType =
  | "circle"
  | "dot"
  | "ring"
  | "heart"
  | "star"
  | "bubble";

type FloatDefinition = {
  type: FloatType;
  left: number;
  top: number;
  size: number;
  color: string;
};

type FloatItem = {
  x: Animated.Value;
  y: Animated.Value;
  scale: Animated.Value;
  rotate: Animated.Value;
};

const floatingDefinitions: FloatDefinition[] = [
  {
    type: "bubble",
    left: 0.04,
    top: 0.12,
    size: 45,
    color: C.yellow,
  },
  {
    type: "dot",
    left: 0.88,
    top: 0.08,
    size: 17,
    color: C.coral,
  },
  {
    type: "heart",
    left: 0.08,
    top: 0.30,
    size: 35,
    color: C.teal,
  },
  {
    type: "ring",
    left: 0.91,
    top: 0.29,
    size: 34,
    color: C.yellow,
  },
  {
    type: "star",
    left: 0.03,
    top: 0.53,
    size: 31,
    color: C.coral,
  },
  {
    type: "bubble",
    left: 0.91,
    top: 0.52,
    size: 48,
    color: C.teal,
  },
  {
    type: "dot",
    left: 0.18,
    top: 0.70,
    size: 14,
    color: C.yellow,
  },
  {
    type: "ring",
    left: 0.82,
    top: 0.73,
    size: 26,
    color: C.coral,
  },
  {
    type: "heart",
    left: 0.08,
    top: 0.86,
    size: 29,
    color: C.yellow,
  },
  {
    type: "dot",
    left: 0.94,
    top: 0.90,
    size: 13,
    color: C.teal,
  },
];

/* -------------------------------------------------------
   POST TYPE
------------------------------------------------------- */

type CommunityPost = {
  name: string;
  text: string;
  supports: number;
  replies: number;
  supported: boolean;
};

/* -------------------------------------------------------
   FLOATING SHAPE
------------------------------------------------------- */

const FloatingShape = ({
  definition,
  item,
}: {
  definition: FloatDefinition;
  item: FloatItem;
}) => {
  const renderShape = () => {
    switch (definition.type) {
      case "heart":
        return (
          <Text
            style={[
              styles.floatHeart,
              {
                color: definition.color,
                fontSize: definition.size,
              },
            ]}
          >
            ♡
          </Text>
        );

      case "star":
        return (
          <Text
            style={[
              styles.floatStar,
              {
                color: definition.color,
                fontSize: definition.size,
              },
            ]}
          >
            ✦
          </Text>
        );

      case "ring":
        return (
          <View
            style={{
              width: definition.size,
              height: definition.size,
              borderRadius: definition.size / 2,
              borderWidth: 3,
              borderColor: definition.color,
            }}
          />
        );

      case "dot":
        return (
          <View
            style={{
              width: definition.size,
              height: definition.size,
              borderRadius: definition.size / 2,
              backgroundColor: definition.color,
            }}
          />
        );

      case "bubble":
        return (
          <View
            style={{
              width: definition.size,
              height: definition.size,
              borderRadius:
                definition.size * 0.38,
              backgroundColor:
                definition.color,
              opacity: 0.9,
            }}
          />
        );

      case "circle":
        return (
          <View
            style={{
              width: definition.size,
              height: definition.size,
              borderRadius:
                definition.size / 2,
              backgroundColor:
                definition.color,
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.floatingElement,
        {
          left:
            width * definition.left,
          top:
            height * definition.top,
          transform: [
            {
              translateX: item.x,
            },
            {
              translateY: item.y,
            },
            {
              scale: item.scale,
            },
            {
              rotate:
                item.rotate.interpolate({
                  inputRange: [-1, 1],
                  outputRange: [
                    "-10deg",
                    "10deg",
                  ],
                }),
            },
          ],
        },
      ]}
    >
      {renderShape()}
    </Animated.View>
  );
};

/* -------------------------------------------------------
   COMMUNITY
------------------------------------------------------- */

export default function Community() {
  const [post, setPost] = useState("");

  const [posts, setPosts] = useState<
    CommunityPost[]
  >([
    {
      name: "Ananya",
      text: "Today I finally got a little time for myself. It felt really good. ♡",
      supports: 12,
      replies: 3,
      supported: false,
    },
    {
      name: "Meera",
      text: "Does anyone have a simple bedtime routine that works for their little one?",
      supports: 8,
      replies: 5,
      supported: false,
    },
    {
      name: "Priya",
      text: "A reminder for every mama: you are doing enough. 🌿",
      supports: 15,
      replies: 2,
      supported: false,
    },
  ]);

  /* -------------------------------------------------------
     REPLY
  ------------------------------------------------------- */

  const [replyModalVisible, setReplyModalVisible] =
    useState(false);

  const [replyText, setReplyText] =
    useState("");

  const [replyPostIndex, setReplyPostIndex] =
    useState<number | null>(null);

  /* -------------------------------------------------------
     EXTRA INTERACTION STATES
  ------------------------------------------------------- */

  const [sharedMessage, setSharedMessage] =
    useState(false);

  const [selectedPrompt, setSelectedPrompt] =
    useState<string | null>(null);

  const shareScale =
    useRef(new Animated.Value(1)).current;

  const replyScale =
    useRef(new Animated.Value(1)).current;

  const promptScale =
    useRef(new Animated.Value(1)).current;

  const cardScales = useRef<
    Animated.Value[]
  >([]);

  /* -------------------------------------------------------
     FLOATING ITEMS
  ------------------------------------------------------- */

  const floatingItems = useRef<FloatItem[]>(
    floatingDefinitions.map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      scale: new Animated.Value(1),
      rotate: new Animated.Value(0),
    }))
  ).current;

  const animations = useRef<
    Animated.CompositeAnimation[]
  >([]).current;

  /* -------------------------------------------------------
     WRITING PROMPTS
  ------------------------------------------------------- */

  const writingPrompts = [
    "Something I am proud of today is...",
    "Something that made me smile today...",
    "One thing I wish someone told me...",
    "Right now, I need...",
  ];

  /* -------------------------------------------------------
     FLOATING ANIMATION
  ------------------------------------------------------- */

  useEffect(() => {
    floatingItems.forEach(
      (item, index) => {
        const move = () => {
          const xDistance =
            18 + Math.random() * 35;

          const yDistance =
            15 + Math.random() * 35;

          const xDirection =
            Math.random() > 0.5
              ? 1
              : -1;

          const yDirection =
            Math.random() > 0.5
              ? 1
              : -1;

          const duration =
            5000 +
            Math.random() * 3500;

          const animation =
            Animated.parallel([
              Animated.timing(item.x, {
                toValue:
                  xDistance *
                  xDirection,
                duration,
                easing:
                  Easing.inOut(
                    Easing.sin
                  ),
                useNativeDriver: true,
              }),

              Animated.timing(item.y, {
                toValue:
                  yDistance *
                  yDirection,
                duration,
                easing:
                  Easing.inOut(
                    Easing.sin
                  ),
                useNativeDriver: true,
              }),

              Animated.sequence([
                Animated.timing(
                  item.scale,
                  {
                    toValue: 1.06,
                    duration:
                      duration / 2,
                    easing:
                      Easing.inOut(
                        Easing.sin
                      ),
                    useNativeDriver: true,
                  }
                ),

                Animated.timing(
                  item.scale,
                  {
                    toValue: 1,
                    duration:
                      duration / 2,
                    easing:
                      Easing.inOut(
                        Easing.sin
                      ),
                    useNativeDriver: true,
                  }
                ),
              ]),

              Animated.timing(
                item.rotate,
                {
                  toValue:
                    Math.random() >
                    0.5
                      ? 1
                      : -1,
                  duration,
                  easing:
                    Easing.inOut(
                      Easing.sin
                    ),
                  useNativeDriver: true,
                }
              ),
            ]);

          animations[index] =
            animation;

          animation.start(
            ({ finished }) => {
              if (finished) {
                item.x.setValue(0);
                item.y.setValue(0);
                item.rotate.setValue(
                  0
                );

                move();
              }
            }
          );
        };

        setTimeout(
          () => {
            move();
          },
          index * 250
        );
      }
    );

    return () => {
      animations.forEach(
        (animation) =>
          animation?.stop()
      );
    };
  }, []);

  /* -------------------------------------------------------
     TOUCH / MOUSE INTERACTION
     Floating elements repel from cursor/finger
  ------------------------------------------------------- */

  const repelFloatingElements = (
    x: number,
    y: number
  ) => {
    floatingDefinitions.forEach(
      (definition, index) => {
        const item =
          floatingItems[index];

        const elementX =
          width *
          definition.left;

        const elementY =
          height *
          definition.top;

        const distanceX =
          elementX - x;

        const distanceY =
          elementY - y;

        const distance =
          Math.sqrt(
            distanceX *
              distanceX +
              distanceY *
                distanceY
          );

        const interactionRadius =
          150;

        if (
          distance <
          interactionRadius
        ) {
          const strength =
            (interactionRadius -
              distance) /
            interactionRadius;

          const pushX =
            (distanceX /
              (distance || 1)) *
            45 *
            strength;

          const pushY =
            (distanceY /
              (distance || 1)) *
            45 *
            strength;

          Animated.parallel([
            Animated.spring(item.x, {
              toValue: pushX,
              tension: 45,
              friction: 7,
              useNativeDriver: true,
            }),

            Animated.spring(item.y, {
              toValue: pushY,
              tension: 45,
              friction: 7,
              useNativeDriver: true,
            }),
          ]).start();
        }
      }
    );
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder:
          () => true,

        onMoveShouldSetPanResponder:
          () => true,

        onPanResponderMove: (
          _,
          gesture
        ) => {
          repelFloatingElements(
            gesture.moveX,
            gesture.moveY
          );
        },

        onPanResponderRelease: () => {
          floatingItems.forEach(
            (item) => {
              Animated.spring(item.x, {
                toValue: 0,
                tension: 35,
                friction: 8,
                useNativeDriver: true,
              }).start();

              Animated.spring(item.y, {
                toValue: 0,
                tension: 35,
                friction: 8,
                useNativeDriver: true,
              }).start();
            }
          );
        },
      }),
    []
  );

  /* -------------------------------------------------------
     ADD POST
  ------------------------------------------------------- */

  const addPost = () => {
    if (!post.trim()) return;

    setPosts((previous) => [
      {
        name: "You",
        text: post.trim(),
        supports: 0,
        replies: 0,
        supported: false,
      },
      ...previous,
    ]);

    setPost("");
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
  };

  /* -------------------------------------------------------
     SUPPORT POST
  ------------------------------------------------------- */

  const toggleSupport = (index: number) => {
    setPosts((previous) =>
      previous.map(
        (item, itemIndex) => {
          if (itemIndex !== index) {
            return item;
          }

          return {
            ...item,
            supported:
              !item.supported,
            supports:
              item.supported
                ? Math.max(
                    0,
                    item.supports - 1
                  )
                : item.supports + 1,
          };
        }
      )
    );
  };

  /* -------------------------------------------------------
     OPEN REPLY
  ------------------------------------------------------- */

  const openReply = (index: number) => {
    setReplyPostIndex(index);
    setReplyText("");
    setReplyModalVisible(true);

    Animated.sequence([
      Animated.spring(replyScale, {
        toValue: 0.94,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),

      Animated.spring(replyScale, {
        toValue: 1,
        friction: 5,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  };

  /* -------------------------------------------------------
     SEND REPLY
  ------------------------------------------------------- */

  const sendReply = () => {
    if (
      !replyText.trim() ||
      replyPostIndex === null
    ) {
      return;
    }

    setPosts((previous) =>
      previous.map(
        (item, index) =>
          index === replyPostIndex
            ? {
                ...item,
                replies:
                  item.replies + 1,
              }
            : item
      )
    );

    setReplyText("");
    setReplyModalVisible(false);
    setReplyPostIndex(null);
  };

  /* -------------------------------------------------------
     CLOSE REPLY
  ------------------------------------------------------- */

  const closeReply = () => {
    setReplyModalVisible(false);
    setReplyText("");
    setReplyPostIndex(null);
  };

  /* -------------------------------------------------------
     DAILY PROMPT
  ------------------------------------------------------- */

  const addDailyPrompt = () => {
    const randomPrompt =
      writingPrompts[
        Math.floor(
          Math.random() *
            writingPrompts.length
        )
      ];

    setSelectedPrompt(
      randomPrompt
    );

    setPost(randomPrompt + " ");

    Animated.sequence([
      Animated.spring(promptScale, {
        toValue: 0.95,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),

      Animated.spring(promptScale, {
        toValue: 1,
        friction: 5,
        tension: 90,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View
      style={styles.screen}
      {...panResponder.panHandlers}
    >
      {/* -------------------------------------------------------
         FLOATING BACKGROUND
      ------------------------------------------------------- */}

      <View
        pointerEvents="none"
        style={styles.floatingLayer}
      >
        {floatingDefinitions.map(
          (
            definition,
            index
          ) => (
            <FloatingShape
              key={index}
              definition={
                definition
              }
              item={
                floatingItems[
                  index
                ]
              }
            />
          )
        )}
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={
          styles.content
        }
        showsVerticalScrollIndicator={
          false
        }
        keyboardShouldPersistTaps="handled"
      >
        {/* BACK */}

        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed &&
              styles.smallPressed,
          ]}
          onPress={() =>
            router.back()
          }
        >
          <Text
            style={styles.backText}
          >
            ← Back
          </Text>
        </Pressable>

        {/* HEADER */}

        <Text style={styles.label}>
          MOTHER TO MOTHER
        </Text>

        <Text style={styles.title}>
          Your Village
        </Text>

        <Text
          style={styles.subtitle}
        >
          A gentle space to share, listen and remind each
          other that none of us has to do this alone.
        </Text>

        {/* -------------------------------------------------------
           CREATE POST
        ------------------------------------------------------- */}

        <View
          style={styles.createCard}
        >
          <View
            style={
              styles.createHeader
            }
          >
            <View
              style={
                styles.createHeaderText
              }
            >
              <Text
                style={
                  styles.createTitle
                }
              >
                Share something with the village
              </Text>

              <Text
                style={
                  styles.createSubtitle
                }
              >
                A thought, a question or a little win.
              </Text>
            </View>

            {/* DAILY PROMPT */}

            <Animated.View
              style={{
                transform: [
                  {
                    scale:
                      promptScale,
                  },
                ],
              }}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.promptButton,
                  pressed &&
                    styles.smallPressed,
                ]}
                onPress={
                  addDailyPrompt
                }
              >
                <Text
                  style={
                    styles.promptButtonIcon
                  }
                >
                  ✦
                </Text>

                <Text
                  style={
                    styles.promptButtonText
                  }
                >
                  Prompt
                </Text>
              </Pressable>
            </Animated.View>
          </View>

          <TextInput
            value={post}
            onChangeText={setPost}
            placeholder="Write a thought, question or little win..."
            placeholderTextColor="#82A1A1"
            multiline
            maxLength={500}
            style={styles.input}
            textAlignVertical="top"
          />

          <View
            style={
              styles.inputFooter
            }
          >
            <Text
              style={
                styles.privacyText
              }
            >
              Share only what feels comfortable.
            </Text>

            <Text
              style={
                styles.characterCount
              }
            >
              {post.length}/500
            </Text>
          </View>

          {/* SELECTED PROMPT */}

          {selectedPrompt && (
            <View
              style={
                styles.selectedPrompt
              }
            >
              <Text
                style={
                  styles.selectedPromptIcon
                }
              >
                ✦
              </Text>

              <Text
                style={
                  styles.selectedPromptText
                }
              >
                {selectedPrompt}
              </Text>
            </View>
          )}

          {/* SHARE */}

          <Animated.View
            style={{
              transform: [
                {
                  scale:
                    shareScale,
                },
              ],
            }}
          >
            <Pressable
              style={({ pressed }) => [
                styles.postButton,
                !post.trim() &&
                  styles.disabled,
                pressed &&
                  post.trim() &&
                  styles.buttonPressed,
              ]}
              onPress={addPost}
              disabled={!post.trim()}
            >
              <Text
                style={
                  styles.postButtonText
                }
              >
                Share with the Village
              </Text>

              <Text
                style={
                  styles.postArrow
                }
              >
                →
              </Text>
            </Pressable>
          </Animated.View>
        </View>

        {/* -------------------------------------------------------
           SHARE CONFIRMATION
        ------------------------------------------------------- */}

        {sharedMessage && (
          <Animated.View
            style={
              styles.sharedMessage
            }
          >
            <View
              style={
                styles.sharedIcon
              }
            >
              <Text
                style={
                  styles.sharedIconText
                }
              >
                ✓
              </Text>
            </View>

            <Text
              style={
                styles.sharedText
              }
            >
              Shared with your village ♡
            </Text>
          </Animated.View>
        )}

        {/* COMMUNITY POSTS */}

        <View
          style={
            styles.sectionHeader
          }
        >
          <View>
            <Text
              style={
                styles.sectionTitle
              }
            >
              From the community
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Little reminders from other mamas.
            </Text>
          </View>

          <View
            style={
              styles.postCountBadge
            }
          >
            <Text
              style={
                styles.postCountText
              }
            >
              {posts.length}
            </Text>
          </View>
        </View>

        {posts.map(
          (item, index) => {
            if (!cardScales.current[index]) {
              cardScales.current[index] =
                new Animated.Value(
                  1
                );
            }

            return (
              <Animated.View
                key={`${item.name}-${index}`}
                style={[
                  styles.postCard,
                  {
                    transform: [
                      {
                        scale:
                          cardScales
                            .current[
                            index
                          ],
                      },
                    ],
                  },
                ]}
              >
                {/* AVATAR */}

                <View
                  style={styles.avatar}
                >
                  <Text
                    style={
                      styles.avatarText
                    }
                  >
                    {item.name.charAt(
                      0
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.postContent
                  }
                >
                  {/* NAME */}

                  <View
                    style={
                      styles.nameRow
                    }
                  >
                    <Text
                      style={
                        styles.name
                      }
                    >
                      {item.name}
                    </Text>

                    {item.name ===
                      "You" && (
                      <View
                        style={
                          styles.youBadge
                        }
                      >
                        <Text
                          style={
                            styles.youBadgeText
                          }
                        >
                          YOU
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* POST */}

                  <Text
                    style={
                      styles.postText
                    }
                  >
                    {item.text}
                  </Text>

                  {/* REACTIONS */}

                  <View
                    style={
                      styles.reactionRow
                    }
                  >
                    {/* SUPPORT */}

                    <Pressable
                      style={({ pressed }) => [
                        styles.reactionButton,
                        pressed &&
                          styles.smallPressed,
                      ]}
                      onPress={() =>
                        toggleSupport(
                          index
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.reaction,
                          item.supported &&
                            styles.reactionActive,
                        ]}
                      >
                        {item.supported
                          ? "♥ Supported"
                          : "♡ Support"}
                      </Text>

                      {item.supports >
                        0 && (
                        <View
                          style={
                            styles.reactionCount
                          }
                        >
                          <Text
                            style={
                              styles.reactionCountText
                            }
                          >
                            {item.supports}
                          </Text>
                        </View>
                      )}
                    </Pressable>

                    {/* REPLY */}

                    <Pressable
                      style={({ pressed }) => [
                        styles.reactionButton,
                        pressed &&
                          styles.smallPressed,
                      ]}
                      onPress={() =>
                        openReply(
                          index
                        )
                      }
                    >
                      <Text
                        style={
                          styles.reaction
                        }
                      >
                        Reply
                      </Text>

                      {item.replies >
                        0 && (
                        <View
                          style={
                            styles.reactionCount
                          }
                        >
                          <Text
                            style={
                              styles.reactionCountText
                            }
                          >
                            {item.replies}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            );
          }
        )}

        {/* BOTTOM MESSAGE */}

        <View
          style={
            styles.bottomMessage
          }
        >
          <View
            style={
              styles.bottomHeartCircle
            }
          >
            <Text
              style={
                styles.bottomHeart
              }
            >
              ♡
            </Text>
          </View>

          <Text
            style={styles.bottomTitle}
          >
            There is room for every story here.
          </Text>

          <Text
            style={styles.bottomText}
          >
            Share only what feels comfortable.
          </Text>

          <View
            style={
              styles.bottomBadge
            }
          >
            <Text
              style={
                styles.bottomBadgeText
              }
            >
              Mamas supporting mamas
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* -------------------------------------------------------
         REPLY MODAL
      ------------------------------------------------------- */}

      <Modal
        visible={replyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={
          closeReply
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          <View
            style={styles.modalCard}
          >
            <View
              style={
                styles.modalHandle
              }
            />

            <Text
              style={
                styles.modalTitle
              }
            >
              Join the conversation
            </Text>

            <Text
              style={
                styles.modalSubtitle
              }
            >
              A little kindness can mean a lot.
            </Text>

            {replyPostIndex !==
              null && (
              <View
                style={
                  styles.replyPreview
                }
              >
                <Text
                  style={
                    styles.replyPreviewName
                  }
                >
                  {
                    posts[
                      replyPostIndex
                    ]?.name
                  }
                </Text>

                <Text
                  numberOfLines={3}
                  style={
                    styles.replyPreviewText
                  }
                >
                  {
                    posts[
                      replyPostIndex
                    ]?.text
                  }
                </Text>
              </View>
            )}

            <TextInput
              value={replyText}
              onChangeText={
                setReplyText
              }
              placeholder="Write a gentle reply..."
              placeholderTextColor="#82A1A1"
              multiline
              maxLength={250}
              style={
                styles.replyInput
              }
              textAlignVertical="top"
              autoFocus
            />

            <View
              style={
                styles.replyCharacterRow
              }
            >
              <Text
                style={
                  styles.replyHint
                }
              >
                Kind words are always welcome.
              </Text>

              <Text
                style={
                  styles.characterCount
                }
              >
                {replyText.length}/250
              </Text>
            </View>

            <View
              style={
                styles.modalButtons
              }
            >
              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed &&
                    styles.smallPressed,
                ]}
                onPress={
                  closeReply
                }
              >
                <Text
                  style={
                    styles.cancelText
                  }
                >
                  Cancel
                </Text>
              </Pressable>

              <Animated.View
                style={{
                  transform: [
                    {
                      scale:
                        replyScale,
                    },
                  ],
                }}
              >
                <Pressable
                  style={({ pressed }) => [
                    styles.replyButton,
                    !replyText.trim() &&
                      styles.replyDisabled,
                    pressed &&
                      replyText.trim() &&
                      styles.buttonPressed,
                  ]}
                  onPress={
                    sendReply
                  }
                  disabled={
                    !replyText.trim()
                  }
                >
                  <Text
                    style={
                      styles.replyButtonText
                    }
                  >
                    Send Reply
                  </Text>

                  <Text
                    style={
                      styles.replyButtonArrow
                    }
                  >
                    →
                  </Text>
                </Pressable>
              </Animated.View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* -------------------------------------------------------
   STYLES
------------------------------------------------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.cream,
  },

  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  content: {
    padding: 22,
    paddingBottom: 60,
  },

  /* -------------------------------------------------------
     FLOATING
  ------------------------------------------------------- */

  floatingLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },

  floatingElement: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },

  floatHeart: {
    fontWeight: "800",
  },

  floatStar: {
    fontWeight: "800",
  },

  /* -------------------------------------------------------
     BACK
  ------------------------------------------------------- */

  backButton: {
    marginTop: 45,
    marginBottom: 28,
  },

  backText: {
    fontSize: 15,
    color: C.muted,
    fontWeight: "600",
  },

  smallPressed: {
    opacity: 0.72,
  },

  /* -------------------------------------------------------
     HEADER
  ------------------------------------------------------- */

  label: {
    fontSize: 11,
    letterSpacing: 2,
    color: C.deepTeal,
    fontWeight: "700",
  },

  title: {
    fontSize: 38,
    fontWeight: "700",
    color: C.dark,
    marginTop: 10,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: C.muted,
    marginTop: 12,
    marginBottom: 24,
  },

  /* -------------------------------------------------------
     CREATE CARD
  ------------------------------------------------------- */

  createCard: {
    backgroundColor: C.paleTeal,
    borderRadius: 25,
    padding: 20,
    borderWidth: 1,
    borderColor: "#CDEDE9",

    shadowColor: C.dark,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 3,
  },

  createHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  createHeaderText: {
    flex: 1,
    paddingRight: 10,
  },

  createTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: C.dark,
  },

  createSubtitle: {
    fontSize: 12,
    color: C.muted,
    marginTop: 4,
  },

  promptButton: {
    backgroundColor: C.yellow,
    borderRadius: 16,
    minHeight: 34,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  promptButtonIcon: {
    fontSize: 13,
    color: C.deepTeal,
    marginRight: 4,
  },

  promptButtonText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.dark,
  },

  input: {
    backgroundColor: C.white,
    borderRadius: 17,
    minHeight: 110,
    padding: 15,
    marginTop: 14,
    fontSize: 15,
    lineHeight: 21,
    color: C.dark,
    textAlignVertical: "top",

    borderWidth: 1,
    borderColor: "#D5ECE9",
  },

  inputFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },

  privacyText: {
    fontSize: 10,
    color: C.muted,
    flex: 1,
  },

  characterCount: {
    fontSize: 10,
    color: C.muted,
  },

  selectedPrompt: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: C.white,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  selectedPromptIcon: {
    fontSize: 16,
    color: C.coral,
    marginRight: 7,
  },

  selectedPromptText: {
    flex: 1,
    fontSize: 11,
    color: C.deepTeal,
    fontWeight: "600",
  },

  /* SHARE BUTTON */

  postButton: {
    backgroundColor: C.deepTeal,
    borderRadius: 28,
    minHeight: 52,
    paddingLeft: 18,
    paddingRight: 7,
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row",
    marginTop: 14,

    shadowColor: C.deepTeal,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 3,
  },

  disabled: {
    opacity: 0.35,
  },

  buttonPressed: {
    transform: [{ scale: 0.97 }],
  },

  postButtonText: {
    color: C.white,
    fontWeight: "700",
    fontSize: 13,
    marginLeft: 4,
  },

  postArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.yellow,
    color: C.deepTeal,
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center",
    textAlignVertical: "center",
  },

  /* -------------------------------------------------------
     SHARED MESSAGE
  ------------------------------------------------------- */

  sharedMessage: {
    backgroundColor: C.white,
    borderRadius: 17,
    padding: 11,
    marginTop: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    borderWidth: 1,
    borderColor: "#D5ECE9",
  },

  sharedIcon: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  sharedIconText: {
    color: C.white,
    fontSize: 14,
    fontWeight: "800",
  },

  sharedText: {
    color: C.deepTeal,
    fontSize: 12,
    fontWeight: "700",
  },

  /* -------------------------------------------------------
     SECTION
  ------------------------------------------------------- */

  sectionHeader: {
    marginTop: 30,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    fontSize: 23,
    fontWeight: "700",
    color: C.dark,
  },

  sectionSubtitle: {
    fontSize: 11,
    color: C.muted,
    marginTop: 3,
  },

  postCountBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.yellow,
    alignItems: "center",
    justifyContent: "center",
  },

  postCountText: {
    color: C.dark,
    fontSize: 13,
    fontWeight: "800",
  },

  /* -------------------------------------------------------
     POST CARD
  ------------------------------------------------------- */

  postCard: {
    backgroundColor: C.white,
    borderRadius: 22,
    padding: 18,
    marginBottom: 13,
    flexDirection: "row",

    borderWidth: 1,
    borderColor: "#E2EFED",

    shadowColor: C.dark,
    shadowOpacity: 0.04,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 2,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.paleTeal,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: C.deepTeal,
  },

  postContent: {
    flex: 1,
    marginLeft: 13,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  name: {
    fontSize: 15,
    fontWeight: "700",
    color: C.dark,
  },

  youBadge: {
    marginLeft: 7,
    backgroundColor: C.yellow,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },

  youBadgeText: {
    fontSize: 7,
    color: C.dark,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  postText: {
    fontSize: 14,
    lineHeight: 21,
    color: C.muted,
    marginTop: 7,
  },

  /* -------------------------------------------------------
     REACTIONS
  ------------------------------------------------------- */

  reactionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 13,
  },

  reactionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 18,
  },

  reaction: {
    fontSize: 12,
    color: "#7B9090",
    fontWeight: "600",
  },

  reactionActive: {
    color: C.coral,
  },

  reactionCount: {
    marginLeft: 5,
    minWidth: 20,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.paleTeal,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  reactionCountText: {
    fontSize: 9,
    color: C.deepTeal,
    fontWeight: "800",
  },

  /* -------------------------------------------------------
     BOTTOM
  ------------------------------------------------------- */

  bottomMessage: {
    backgroundColor: C.paleTeal,
    borderRadius: 24,
    padding: 25,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,

    borderWidth: 1,
    borderColor: "#D1ECE9",
  },

  bottomHeartCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
  },

  bottomHeart: {
    fontSize: 38,
    color: C.coral,
  },

  bottomTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: C.dark,
    textAlign: "center",
    marginTop: 10,
  },

  bottomText: {
    fontSize: 13,
    color: C.muted,
    marginTop: 6,
  },

  bottomBadge: {
    marginTop: 13,
    backgroundColor: C.yellow,
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },

  bottomBadgeText: {
    fontSize: 10,
    color: C.dark,
    fontWeight: "800",
  },

  /* -------------------------------------------------------
     MODAL
  ------------------------------------------------------- */

  modalOverlay: {
    flex: 1,
    backgroundColor:
      "rgba(14, 124, 134, 0.28)",
    justifyContent: "center",
    padding: 22,
  },

  modalCard: {
    backgroundColor: C.white,
    borderRadius: 27,
    padding: 23,

    shadowColor: C.dark,
    shadowOpacity: 0.15,
    shadowRadius: 22,
    shadowOffset: {
      width: 0,
      height: 10,
    },

    elevation: 8,
  },

  modalHandle: {
    width: 38,
    height: 5,
    borderRadius: 5,
    backgroundColor: C.paleTeal,
    alignSelf: "center",
    marginBottom: 17,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: C.dark,
  },

  modalSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: C.muted,
    marginTop: 6,
    marginBottom: 15,
  },

  replyPreview: {
    backgroundColor: C.paleTeal,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },

  replyPreviewName: {
    fontSize: 12,
    color: C.deepTeal,
    fontWeight: "800",
  },

  replyPreviewText: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 18,
    marginTop: 4,
  },

  replyInput: {
    backgroundColor: C.cream,
    borderWidth: 1,
    borderColor: "#D5ECE9",
    borderRadius: 16,
    minHeight: 105,
    padding: 14,
    fontSize: 15,
    color: C.dark,
    textAlignVertical: "top",
  },

  replyCharacterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 7,
  },

  replyHint: {
    flex: 1,
    fontSize: 10,
    color: C.muted,
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 18,
  },

  cancelButton: {
    paddingVertical: 13,
    paddingHorizontal: 17,
    marginRight: 7,
  },

  cancelText: {
    color: C.muted,
    fontWeight: "700",
  },

  replyButton: {
    backgroundColor: C.deepTeal,
    borderRadius: 24,
    minHeight: 46,
    paddingLeft: 17,
    paddingRight: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  replyDisabled: {
    opacity: 0.35,
  },

  replyButtonText: {
    color: C.white,
    fontSize: 12,
    fontWeight: "700",
  },

  replyButtonArrow: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: C.yellow,
    color: C.deepTeal,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
    textAlignVertical: "center",
    marginLeft: 10,
  },
});