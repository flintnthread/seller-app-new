import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  Image,
  SafeAreaView,
} from "react-native";
import {
  useFonts,
  Outfit_700Bold,
} from "@expo-google-fonts/outfit";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width: SW, height: SH } = Dimensions.get("window");

const CARD_COUNT = 4;           // ← was 5; card "B" (registration fee) removed
const AUTO_SCROLL_MS = 3000;
const PRIMARY_COLOR = "#1E3A8A";

// Slide-in distance (px) for the incoming card — tweak to taste
const SLIDE_OFFSET = 30;

interface CardData {
  id: string;
  bgImage: any;
}

// Card "B" (registration fee.png) has been removed
const CARDS: CardData[] = [
  { id: "A", bgImage: require("../../assets/images/Refer.png") },
  { id: "B", bgImage: require("../../assets/images/Secure Payments.png") },
  { id: "C", bgImage: require("../../assets/images/Support.png") },
  { id: "D", bgImage: require("../../assets/images/es.png") },
];

const KickstartLanding: React.FC = () => {
  const router = useRouter();
  const [fontsLoaded] = useFonts({ Outfit_700Bold });

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [prevIndex, setPrevIndex] = useState<number>(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRef = useRef<boolean>(false);

  // Per-card animated values
  const opacities = useRef(
    CARDS.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))
  ).current as Animated.Value[];

  // translateY for each card — incoming slides up from +SLIDE_OFFSET to 0
  const translates = useRef(
    CARDS.map(() => new Animated.Value(0))
  ).current as Animated.Value[];

  // Dot indicator animated values
  const dotWidths = useRef(
    CARDS.map((_, i) => new Animated.Value(i === 0 ? 24 : 8))
  ).current as Animated.Value[];

  const dotOpacities = useRef(
    CARDS.map((_, i) => new Animated.Value(i === 0 ? 1 : 0.45))
  ).current as Animated.Value[];

  const transition = (from: number, to: number): void => {
    const fromOpacity = opacities[from];
    const toOpacity = opacities[to];

    const fromTranslate = translates[from];
    const toTranslate = translates[to];

    const fromDotWidth = dotWidths[from];
    const toDotWidth = dotWidths[to];

    const fromDotOpacity = dotOpacities[from];
    const toDotOpacity = dotOpacities[to];

    if (
      !fromOpacity ||
      !toOpacity ||
      !fromTranslate ||
      !toTranslate ||
      !fromDotWidth ||
      !toDotWidth ||
      !fromDotOpacity ||
      !toDotOpacity
    ) {
      return;
    }

    // Prepare incoming card
    toOpacity.setValue(0);
    toTranslate.setValue(SLIDE_OFFSET);

    // Animate cards
    Animated.parallel([
      Animated.timing(toOpacity, {
        toValue: 1,
        duration: 480,
        useNativeDriver: true,
      }),

      Animated.timing(toTranslate, {
        toValue: 0,
        duration: 480,
        useNativeDriver: true,
      }),

      Animated.sequence([
        Animated.delay(240),

        Animated.timing(fromOpacity, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      fromTranslate.setValue(0);
    });

    // Animate dots
    Animated.parallel([
      Animated.timing(fromDotWidth, {
        toValue: 8,
        duration: 250,
        useNativeDriver: false,
      }),

      Animated.timing(fromDotOpacity, {
        toValue: 0.45,
        duration: 250,
        useNativeDriver: false,
      }),

      Animated.timing(toDotWidth, {
        toValue: 24,
        duration: 300,
        useNativeDriver: false,
      }),

      Animated.timing(toDotOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };
  const goToIndex = (index: number): void => {
    if (index === activeIndex) return;
    setPrevIndex(activeIndex);
    transition(activeIndex, index);
    setActiveIndex(index);
    pausedRef.current = true;
    setTimeout(() => { pausedRef.current = false; }, 5000);
  };

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (!pausedRef.current) {
        setActiveIndex((prev) => {
          const next = (prev + 1) % CARD_COUNT;
          setPrevIndex(prev);
          transition(prev, next);
          return next;
        });
      }
    }, AUTO_SCROLL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!fontsLoaded) return null;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/*
        Layer order (bottom → top):
        1. prevIndex card — always at full opacity, no gap ever
        2. All animated layers — incoming card fades in + slides up on top
        Result: seamless crossfade with a gentle upward motion, zero black flash
      */}

      {/* Base layer: previous card, always fully visible */}
      <View style={StyleSheet.absoluteFill}>
        <Image
          source={
            CARDS?.[prevIndex]?.bgImage
              ? typeof CARDS[prevIndex].bgImage === "string"
                ? { uri: CARDS[prevIndex].bgImage }
                : CARDS[prevIndex].bgImage
              : require("../../assets/images/Refer.png")
          }
          style={s.bgImage}
          resizeMode="cover"
        />
      </View>

      {/* Animated fade + slide layers */}
      {CARDS.map((card, i) => (
        <Animated.View
          key={card.id}
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: opacities[i],
              transform: [{ translateY: translates[i] || 0 }],
            },
          ]}
        >
          <Image
            source={typeof card.bgImage === "string" ? { uri: card.bgImage } : card.bgImage}
            style={s.bgImage}
            resizeMode="cover"
          />
        </Animated.View>
      ))}

      {/* ── Bottom: Dots + CTA Button ── */}
      <SafeAreaView style={s.safeBottom} pointerEvents="box-none">
        <View style={s.dotsContainer}>
          {CARDS.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => goToIndex(i)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            >
              <Animated.View
                style={[
                  s.dot,
                  {
                    width: dotWidths[i],
                    opacity: dotOpacities[i],
                    backgroundColor: "#fff",
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={s.startBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/(auth)/details')}
        >
          <Text style={s.startBtnText}>Start Here</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" style={s.arrowIcon} />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  bgImage: {
    width: "100%",
    height: "100%",
  },

  safeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },

  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },

  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PRIMARY_COLOR,
    marginHorizontal: 24,
    marginBottom: 32,
    height: 54,
    borderRadius: 27,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  startBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Outfit_700Bold",
    letterSpacing: 0.5,
  },
  arrowIcon: {
    marginLeft: 8,
  },
});

export default KickstartLanding;
