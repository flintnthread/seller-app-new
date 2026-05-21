import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Linking,
  StatusBar,
  SafeAreaView,
  Animated,
  Image,
  BackHandler,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter, useNavigation } from "expo-router";
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from "@expo-google-fonts/outfit";

const { width: SW } = Dimensions.get("window");

// ─── Color Palette ─────────────────────────────────────────
const C = {
  navy:        "#1E3A6E",
  navyDeep:    "#152D5A",
  navyLight:   "#2A4F8F",
  orange:      "#F97316",
  orangeLight: "#FB923C",
  orangeDeep:  "#EA6000",
  orangePale:  "#FFF3E8",
  orangeGlow:  "rgba(249,115,22,0.13)",
  white:       "#FFFFFF",
  cream:       "#FAFAF8",
  lightGray:   "#F4F6FB",
  softBlue:    "#EEF3FF",
  textDark:    "#111827",
  textMid:     "#374151",
  textLight:   "#6B7280",
};

const URL = "https://flintnthread.in/seller/login";

// ─── Data ─────────────────────────────────────────────────
const SELLER_TYPES = [
  { icon: "account-tie",       title: "Individuals",    sub: "Artisans & Creators",  color: "#F97316", bg: "#FFF3E8" },
  { icon: "store-outline",     title: "Boutiques",      sub: "Curated Fashion",      color: "#7C3AED", bg: "#F5F3FF" },
  { icon: "shopping-outline",  title: "Retailers",      sub: "Multi-category Shops", color: "#0EA5E9", bg: "#F0F9FF" },
  { icon: "package-variant",   title: "Wholesalers",    sub: "Bulk & B2B",           color: "#10B981", bg: "#ECFDF5" },
  { icon: "hanger",            title: "Fashion Brands", sub: "Style & Lifestyle",    color: "#EC4899", bg: "#FDF2F8" },
  { icon: "factory",           title: "Manufacturers",  sub: "Scale Production",     color: "#1E3A6E", bg: "#EEF3FF" },
];

const WHY = [
  { icon: "cash-multiple",  title: "Up to 15% Commission",  desc: "Transparent commission on every order. Fair and competitive.",    tag: "FAIR PRICING" },
  { icon: "shield-check",   title: "Secure Payments",        desc: "PCI-compliant gateway — zero fraud risk for you or your buyers.", tag: "SAFE"         },
  { icon: "headset",        title: "24 / 7 Support",          desc: "Dedicated seller support, available whenever you need help.",    tag: "ALWAYS ON"    },
  { icon: "tag-outline",    title: "₹199 Registration",       desc: "One-time fee only — charged from the 20th of each month.",      tag: "LOW COST"     },
  { icon: "rocket-launch",  title: "B2B & B2C Ready",         desc: "Choose your model and reach the right buyers from day one.",    tag: "FLEXIBLE"     },
];

const STEPS = [
  { icon: "account-plus-outline",      title: "Register",            desc: "Sign up with basic info in under 2 minutes.",                  color: "#F97316" },
  { icon: "text-box-check-outline",    title: "Complete Profile",    desc: "Add business details, GSTIN & bank account.",                  color: "#7C3AED" },
  { icon: "store-cog-outline",         title: "Pick B2B or B2C",     desc: "Choose your seller model to reach the right audience.",        color: "#0EA5E9" },
  { icon: "file-document-outline",     title: "Submit Documents",    desc: "Upload GST certificate, PAN card & address proof for KYC.",    color: "#F59E0B" },
  { icon: "shield-account-outline",    title: "Admin Approval",      desc: "Our team approves your account within 24–48 hours.",           color: "#10B981" },
  { icon: "image-plus-outline",        title: "Upload Products",     desc: "Add listings through our simple seller panel.",                color: "#EC4899" },
  { icon: "check-decagram-outline",    title: "Product Review",      desc: "Every listing is reviewed for quality & compliance.",          color: "#F59E0B" },
  { icon: "storefront-outline",        title: "Go Live",             desc: "Your store opens to thousands of buyers across India.",        color: "#F97316" },
  { icon: "trending-up",              title: "Grow Fast",            desc: "Enable quick-order promos for visibility & fast fulfillment.", color: "#7C3AED" },
];

const STATS = [
  { val: "10K+", label: "Sellers",    icon: "account-group"           },
  { val: "50K+", label: "Products",   icon: "package-variant-closed"  },
  { val: "1M+",  label: "Customers",  icon: "heart-outline"           },
  { val: "48hr", label: "Approval",   icon: "clock-fast"              },
];

// ─── Animated Seller Card ──────────────────────────────────
const AnimatedSellerCard: React.FC<{
  item: typeof SELLER_TYPES[0];
  index: number;
  sectionVisible: boolean;
}> = ({ item, index, sectionVisible }) => {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (sectionVisible) {
      const delay = index * 80;
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 500, delay, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, delay, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 8, delay, useNativeDriver: true }),
      ]).start();
    }
  }, [sectionVisible]);

  return (
    <Animated.View
      style={[
        s.sellerCard,
        { borderTopColor: item.color, borderTopWidth: 3 },
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] },
      ]}
    >
      <View style={[s.sellerIconBox, { backgroundColor: item.bg }]}>
        <MaterialCommunityIcons name={item.icon as any} size={28} color={item.color} />
      </View>
      <Text style={[s.sellerCardTitle, { color: item.color }]}>{item.title}</Text>
      <Text style={s.sellerCardSub}>{item.sub}</Text>
    </Animated.View>
  );
};

// ─── Main ──────────────────────────────────────────────────
const SellerLanding: React.FC = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const scrollRef   = useRef<ScrollView>(null);
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(30)).current;

  const [sellerSectionVisible, setSellerSectionVisible] = React.useState(false);

  const [fontsLoaded] = useFonts({
    Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold,
    Outfit_700Bold, Outfit_800ExtraBold, Outfit_900Black,
  });



  useEffect(() => {
    if (fontsLoaded) {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 750, useNativeDriver: true }),
      ]).start();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: C.white }}>
      <StatusBar barStyle="light-content" backgroundColor={C.navyDeep} translucent={false} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        bounces={false}
        onScroll={(e) => {
          if (e.nativeEvent.contentOffset.y > 400 && !sellerSectionVisible) {
            setSellerSectionVisible(true);
          }
        }}
        scrollEventThrottle={16}
      >

        {/* ══════════════════════════════════
            HERO
        ══════════════════════════════════ */}
        <LinearGradient
          colors={[C.navyDeep, "#1d3258", "#241566"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.heroGrad}
        >
          {/* Decorative orbs */}
          <View style={[s.orb,       { width: 260, height: 260, top: -80,  right: -80, opacity: 0.07 }]} />
          <View style={[s.orb,       { width: 180, height: 180, bottom: 40, left: -60, opacity: 0.05 }]} />
          <View style={[s.orbOrange, { width: 130, height: 130, top: 110,  right: 24,  opacity: 0.13 }]} />

          <SafeAreaView>
            {/* ── Navbar: Centered logo with frosted pill background ── */}
            <View style={s.nav}>
              <View style={s.logoContainer}>
                <Image
                  source={require("../../assets/images/logo-removebg-preview.png")}
                  style={s.navLogo}
                  resizeMode="contain"
                />
              </View>
            </View>

            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

              {/* Live badge */}
              <View style={s.livePill}>
                <View style={s.liveDot} />
                <Text style={s.livePillText}>Now Onboarding Sellers Across India</Text>
              </View>

              {/* Headline */}
              <Text style={s.heroH1}>Your Business,{"\n"}<Text style={{ color: C.orange }}>Your Market.</Text></Text>
              <Text style={s.heroSub}>
                Join India&apos;s fastest-growing fashion marketplace. From local shops to global brands — sell smarter with Flint & Thread.
              </Text>

              {/* Chips */}
              <View style={s.chipRow}>
                {["Retailers", "Boutiques", "Designers", "Brands", "Manufacturers"].map((c) => (
                  <View key={c} style={s.chip}>
                    <Text style={s.chipText}>{c}</Text>
                  </View>
                ))}
              </View>

              {/* CTA buttons */}
              <View style={s.heroCtas}>
                <TouchableOpacity style={s.ctaPrimary} onPress={() => router.push("/(auth)/welcome")} activeOpacity={0.88}>
                  <LinearGradient colors={[C.orange, C.orangeLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaPrimaryGrad}>
                    <Text style={s.ctaPrimaryText}>Start Selling — Free</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.ctaSecondary}
                  onPress={() => scrollRef.current?.scrollTo({ y: 820, animated: true })}
                  activeOpacity={0.75}
                >
                  <Ionicons name="play-circle-outline" size={20} color="rgba(255,255,255,0.88)" />
                  <Text style={s.ctaSecondaryText}>How It Works</Text>
                </TouchableOpacity>
              </View>

              {/* Mini trust bar */}
              <View style={s.trustBar}>
                {[
                  { icon: "shield-check", text: "Secure Payments" },
                  { icon: "clock-fast",   text: "48hr Approval"   },
                  { icon: "tag",          text: "₹199 to Start"   },
                ].map((t) => (
                  <View key={t.text} style={s.trustItem}>
                    <MaterialCommunityIcons name={t.icon as any} size={14} color={C.orangeLight} />
                    <Text style={s.trustText}>{t.text}</Text>
                  </View>
                ))}
              </View>

            </Animated.View>
          </SafeAreaView>
        </LinearGradient>

        {/* ══════════════════════════════════
            FLOATING STATS CARD
        ══════════════════════════════════ */}
        <View style={s.statsStrip}>
          {STATS.map((st, i) => (
            <View key={st.label} style={[s.statBox, i < STATS.length - 1 && s.statBorder]}>
              <MaterialCommunityIcons name={st.icon as any} size={21} color={C.orange} style={{ marginBottom: 5 }} />
              <Text style={s.statVal}>{st.val}</Text>
              <Text style={s.statLbl}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* ══════════════════════════════════
            WHO WE SERVE
        ══════════════════════════════════ */}
        <View style={[s.section, { backgroundColor: C.cream }]}>
          <View style={s.eyebrowPill}>
            <Text style={s.eyebrowText}>WHO WE SERVE</Text>
          </View>
          <Text style={s.sectionH}>Built for Every Kind of Seller</Text>
          <Text style={s.sectionSub}>Whether you&apos;re a solo creator or a large manufacturer, we have tools tailored for you.</Text>

          <View style={s.sellerGrid}>
            {SELLER_TYPES.map((item, index) => (
              <AnimatedSellerCard
                key={item.title}
                item={item}
                index={index}
                sectionVisible={sellerSectionVisible}
              />
            ))}
          </View>
        </View>

        {/* ══════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════ */}
        <View style={[s.section, { backgroundColor: C.white }]}>
          <View style={[s.eyebrowPill, { backgroundColor: C.orangeGlow, borderColor: "rgba(249,115,22,0.25)" }]}>
            <Text style={[s.eyebrowText, { color: C.orange }]}>9-STEP JOURNEY</Text>
          </View>
          <Text style={s.sectionH}>From Sign-up{"\n"}to First Sale</Text>
          <Text style={s.sectionSub}>A clear, guided path to getting your store live and selling across India.</Text>

          <View style={s.timeline}>
            {STEPS.map((step, i) => {
              const isLeft = i % 2 === 0;
              return (
                <View key={step.title} style={s.tlRow}>

                  {isLeft ? (
                    <View style={[s.tlCard, s.tlCardLeft, { borderLeftColor: step.color, borderLeftWidth: 3 }]}>
                      <View style={[s.tlIconWrap, { backgroundColor: step.color + "1A" }]}>
                        <MaterialCommunityIcons name={step.icon as any} size={21} color={step.color} />
                      </View>
                      <Text style={s.tlTitle}>{step.title}</Text>
                      <Text style={s.tlDesc}>{step.desc}</Text>
                    </View>
                  ) : (
                    <View style={s.tlSpacer} />
                  )}

                  <View style={s.tlSpine}>
                    <LinearGradient colors={[step.color, step.color + "BB"]} style={s.tlNum}>
                      <Text style={s.tlNumText}>{i + 1}</Text>
                    </LinearGradient>
                    {i < STEPS.length - 1 && <View style={s.tlLine} />}
                  </View>

                  {!isLeft ? (
                    <View style={[s.tlCard, s.tlCardRight, { borderRightColor: step.color, borderRightWidth: 3 }]}>
                      <View style={[s.tlIconWrap, { backgroundColor: step.color + "1A" }]}>
                        <MaterialCommunityIcons name={step.icon as any} size={21} color={step.color} />
                      </View>
                      <Text style={s.tlTitle}>{step.title}</Text>
                      <Text style={s.tlDesc}>{step.desc}</Text>
                    </View>
                  ) : (
                    <View style={s.tlSpacer} />
                  )}

                </View>
              );
            })}
          </View>

          <TouchableOpacity onPress={() => router.push("/(auth)/welcome")} activeOpacity={0.88} style={s.stepsCtaWrap}>
            <LinearGradient colors={[C.orange, C.orangeLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.stepsCta}>
              <Text style={s.stepsCtaText}>Begin Your Journey Today</Text>
              <Ionicons name="arrow-forward-circle" size={22} color="#fff" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ══════════════════════════════════
            WHY CHOOSE US
        ══════════════════════════════════ */}
        <View style={[s.section, { backgroundColor: C.softBlue }]}>
          <View style={[s.eyebrowPill, { backgroundColor: "#EEF3FF", borderColor: "#C7D7FF" }]}>
            <Text style={[s.eyebrowText, { color: C.navyLight }]}>WHY CHOOSE US</Text>
          </View>
          <Text style={s.sectionH}>Everything You{"\n"}Need to Grow</Text>
          <Text style={s.sectionSub}>Tools, support, and reach — all in one platform designed for Indian sellers.</Text>

          {WHY.map((w) => (
            <View key={w.title} style={s.whyCard}>
              <View style={s.whyTag}>
                <Text style={s.whyTagText}>{w.tag}</Text>
              </View>
              <View style={s.whyBody}>
                <LinearGradient colors={[C.navy, C.navyLight]} style={s.whyIconBox}>
                  <MaterialCommunityIcons name={w.icon as any} size={23} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={s.whyTitle}>{w.title}</Text>
                  <Text style={s.whyDesc}>{w.desc}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* ══════════════════════════════════
            REGISTER CTA
        ══════════════════════════════════ */}
        <View style={[s.section, { backgroundColor: C.white }]}>
          <View style={s.regCard}>
            <LinearGradient colors={[C.orangeDeep, C.orange, C.orangeLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.regTopBar} />
            <View style={s.regBody}>
              <Text style={s.regEyebrow}>GET STARTED TODAY</Text>
              <Text style={s.regH}>Create Your{"\n"}Seller Account</Text>
              <Text style={s.regSub}>Join thousands of sellers reaching customers across India — B2B and B2C from day one.</Text>

              <View style={{ marginTop: 22, marginBottom: 24 }}>
                {[
                  { icon: "account-check-outline", text: "Sign up & verify your identity"       },
                  { icon: "store-check-outline",   text: "Add business details & bank account"  },
                  { icon: "file-document-outline", text: "Submit KYC documents for approval"    },
                  { icon: "image-plus-outline",    text: "Upload products through seller panel"  },
                  { icon: "rocket-launch-outline", text: "Go live and start taking orders"       },
                ].map((item) => (
                  <View key={item.text} style={s.regCheck}>
                    <View style={s.regCheckIcon}>
                      <MaterialCommunityIcons name={item.icon as any} size={17} color={C.orange} />
                    </View>
                    <Text style={s.regCheckText}>{item.text}</Text>
                  </View>
                ))}
              </View>

              <View style={s.feePill}>
                <MaterialCommunityIcons name="tag-outline" size={16} color={C.orange} />
                <Text style={s.feePillText}>  One-time fee: <Text style={{ fontFamily: "Outfit_800ExtraBold", color: C.orange }}>₹199 only</Text></Text>
              </View>

              <TouchableOpacity onPress={() => router.push("/(auth)/welcome")} activeOpacity={0.88} style={{ marginTop: 24 }}>
                <LinearGradient colors={[C.navyDeep, C.navyLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.regBtn}>
                  <Text style={s.regBtnText}>Register Now</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════
            FINAL CTA BANNER
        ══════════════════════════════════ */}
        <LinearGradient colors={[C.navyDeep, "#1E3A6E"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={s.finalBanner}>
          <LinearGradient colors={[C.orangeDeep, C.orange, C.orangeLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.bannerStrip} />
          <Text style={s.bannerH}>Ready to Grow{"\n"}Your Business?</Text>
          <Text style={s.bannerSub}>Thousands of sellers are already earning on Flint & Thread. Your store could be next.</Text>

          <View style={s.bannerStats}>
            {[{ val: "10K+", label: "Sellers" }, { val: "1M+", label: "Customers" }, { val: "50K+", label: "Products" }].map((st, i) => (
              <View key={st.label} style={[s.bannerStat, i < 2 && { borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.12)" }]}>
                <Text style={s.bannerStatVal}>{st.val}</Text>
                <Text style={s.bannerStatLabel}>{st.label}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity onPress={() => router.push("/(auth)/welcome")} activeOpacity={0.88} style={s.bannerCtaWrap}>
            <LinearGradient colors={[C.orange, C.orangeLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.bannerCta}>
              <Text style={s.bannerCtaText}>Start Selling Now</Text>
              <Ionicons name="arrow-forward-circle" size={22} color="#fff" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>

      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────
const s = StyleSheet.create({

  // Hero
  heroGrad: { paddingHorizontal: 22, paddingBottom: 52, paddingTop: 20, overflow: "hidden" },
  orb:       { position: "absolute", borderRadius: 999, backgroundColor: "#fff" },
  orbOrange: { position: "absolute", borderRadius: 999, backgroundColor: "#F97316" },

  // ── Navbar: full-width centered logo with frosted background ──
  nav: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  logoContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    // Frosted glass shimmer
    shadowColor: "#ffffff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  navLogo: {
    width: SW - 120,   // nearly full width minus padding
    height: 56,        // taller for better visibility
  },

  livePill: {
    flexDirection: "row", alignItems: "center", alignSelf: "flex-start",
    backgroundColor: "rgba(249,115,22,0.18)", borderWidth: 1, borderColor: "rgba(249,115,22,0.42)",
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50, marginBottom: 24, gap: 8,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4ade80" },
  livePillText: { fontFamily: "Outfit_600SemiBold", fontSize: 13, color: "rgba(255,255,255,0.92)" },

  heroH1: { fontFamily: "Outfit_900Black", fontSize: 43, color: "#fff", lineHeight: 51, marginBottom: 16 },
  heroSub: { fontFamily: "Outfit_400Regular", fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 25, marginBottom: 26 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 30 },
  chip: { backgroundColor: "rgba(255,255,255,0.10)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50 },
  chipText: { fontFamily: "Outfit_500Medium", fontSize: 13, color: "#fff" },

  heroCtas: { flexDirection: "row", gap: 12, marginBottom: 26 },
  ctaPrimary: { flex: 1, borderRadius: 50, overflow: "hidden" },
  ctaPrimaryGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15, borderRadius: 50 },
  ctaPrimaryText: { fontFamily: "Outfit_700Bold", fontSize: 15, color: "#fff" },
  ctaSecondary: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.30)", paddingHorizontal: 18, paddingVertical: 14, borderRadius: 50 },
  ctaSecondaryText: { fontFamily: "Outfit_600SemiBold", fontSize: 14, color: "#fff" },

  trustBar: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  trustText: { fontFamily: "Outfit_500Medium", fontSize: 12, color: "rgba(255,255,255,0.76)" },

  // Stats strip
  statsStrip: {
    flexDirection: "row", backgroundColor: "#fff",
    marginHorizontal: 20, marginTop: -26, borderRadius: 18,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 10,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.05)",
  },
  statBox: { flex: 1, paddingVertical: 18, alignItems: "center" },
  statBorder: { borderRightWidth: 1, borderRightColor: "#F0F0F0" },
  statVal: { fontFamily: "Outfit_900Black", fontSize: 19, color: "#111827" },
  statLbl: { fontFamily: "Outfit_400Regular", fontSize: 11, color: "#6B7280", textAlign: "center", marginTop: 2 },

  // Section
  section: { paddingHorizontal: 20, paddingTop: 52, paddingBottom: 52 },
  eyebrowPill: {
    alignSelf: "flex-start", backgroundColor: "rgba(249,115,22,0.13)",
    borderWidth: 1, borderColor: "rgba(249,115,22,0.25)",
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 50, marginBottom: 16,
  },
  eyebrowText: { fontFamily: "Outfit_700Bold", fontSize: 11, color: "#F97316", letterSpacing: 2 },
  sectionH: { fontFamily: "Outfit_900Black", fontSize: 30, color: "#111827", lineHeight: 38, marginBottom: 12 },
  sectionSub: { fontFamily: "Outfit_400Regular", fontSize: 15, color: "#6B7280", lineHeight: 23, marginBottom: 32 },

  // Seller grid
  sellerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  sellerCard: {
    width: (SW - 54) / 2, backgroundColor: "#fff", borderRadius: 16, padding: 18,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 10, elevation: 4,
  },
  sellerIconBox: { width: 54, height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  sellerCardTitle: { fontFamily: "Outfit_700Bold", fontSize: 15, marginBottom: 3 },
  sellerCardSub: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "#6B7280", lineHeight: 17 },

  // Timeline (steps)
  timeline: { marginTop: 4 },
  tlRow: { flexDirection: "row", alignItems: "flex-start", minHeight: 96 },

  tlSpine: { alignItems: "center", width: 46, zIndex: 10 },
  tlNum: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  tlNumText: { fontFamily: "Outfit_800ExtraBold", fontSize: 16, color: "#fff" },
  tlLine: { width: 2, flex: 1, backgroundColor: "#E8ECF4", marginTop: 4, minHeight: 48 },

  tlCard: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  tlCardLeft:  { marginRight: 8 },
  tlCardRight: { marginLeft: 8 },
  tlSpacer: { flex: 1, marginBottom: 14 },

  tlIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  tlTitle: { fontFamily: "Outfit_700Bold", fontSize: 14, color: "#111827", marginBottom: 4 },
  tlDesc: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "#6B7280", lineHeight: 17 },

  stepsCtaWrap: { borderRadius: 50, overflow: "hidden", marginTop: 24 },
  stepsCta: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 17, borderRadius: 50 },
  stepsCtaText: { fontFamily: "Outfit_700Bold", fontSize: 16, color: "#fff" },

  // Why cards
  whyCard: { backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  whyTag: { alignSelf: "flex-start", backgroundColor: "rgba(249,115,22,0.12)", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 50, marginBottom: 12, borderWidth: 1, borderColor: "rgba(249,115,22,0.20)" },
  whyTagText: { fontFamily: "Outfit_700Bold", fontSize: 10, color: "#F97316", letterSpacing: 1.5 },
  whyBody: { flexDirection: "row", alignItems: "flex-start" },
  whyIconBox: { width: 50, height: 50, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  whyTitle: { fontFamily: "Outfit_700Bold", fontSize: 16, color: "#111827", marginBottom: 4 },
  whyDesc: { fontFamily: "Outfit_400Regular", fontSize: 13, color: "#6B7280", lineHeight: 19 },

  // Register card
  regCard: { backgroundColor: "#fff", borderRadius: 22, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.10, shadowRadius: 20, elevation: 8, borderWidth: 1, borderColor: "#F0F0F0" },
  regTopBar: { height: 6 },
  regBody: { padding: 26 },
  regEyebrow: { fontFamily: "Outfit_700Bold", fontSize: 11, color: "#F97316", letterSpacing: 2, marginBottom: 10 },
  regH: { fontFamily: "Outfit_900Black", fontSize: 30, color: "#111827", lineHeight: 38, marginBottom: 10 },
  regSub: { fontFamily: "Outfit_400Regular", fontSize: 15, color: "#6B7280", lineHeight: 23 },
  regCheck: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  regCheckIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#FFF3E8", alignItems: "center", justifyContent: "center", marginRight: 14 },
  regCheckText: { fontFamily: "Outfit_500Medium", fontSize: 15, color: "#374151", flex: 1 },
  feePill: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF3E8", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "rgba(249,115,22,0.20)" },
  feePillText: { fontFamily: "Outfit_500Medium", fontSize: 14, color: "#374151" },
  regBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 17, borderRadius: 50 },
  regBtnText: { fontFamily: "Outfit_700Bold", fontSize: 16, color: "#fff" },

  // Final banner
  finalBanner: { paddingHorizontal: 22, paddingBottom: 50, alignItems: "center" },
  bannerStrip: { width: "100%", height: 5, marginBottom: 38 },
  bannerH: { fontFamily: "Outfit_900Black", fontSize: 30, color: "#fff", textAlign: "center", lineHeight: 38, marginBottom: 14 },
  bannerSub: { fontFamily: "Outfit_400Regular", fontSize: 15, color: "rgba(255,255,255,0.70)", textAlign: "center", lineHeight: 23, marginBottom: 32 },
  bannerStats: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 16, padding: 16, width: "100%", marginBottom: 32, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  bannerStat: { flex: 1, alignItems: "center", paddingVertical: 4 },
  bannerStatVal: { fontFamily: "Outfit_900Black", fontSize: 28, color: "#F97316" },
  bannerStatLabel: { fontFamily: "Outfit_500Medium", fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  bannerCtaWrap: { borderRadius: 50, overflow: "hidden", width: "100%" },
  bannerCta: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 17, borderRadius: 50 },
  bannerCtaText: { fontFamily: "Outfit_700Bold", fontSize: 16, color: "#fff" },
});

export default SellerLanding;
