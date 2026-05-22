import React, { useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  useWindowDimensions,
  Platform,
  Linking,
  StatusBar,
  SafeAreaView,
  Animated,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthFlow } from "@/hooks/useAuthFlow";
import { useResponsive } from "@/hooks/useResponsive";
import {
  useFonts,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
} from "@expo-google-fonts/outfit";

const CONTENT_MAX = 1200;

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

const HEADER_NAV = [
  { label: "About Us",     icon: "information-outline" as const, key: "about"    },
  { label: "Key Features", icon: "star-outline" as const,        key: "features" },
  { label: "Now Active",   icon: "calendar-month-outline" as const, key: "active" },
  { label: "How It Works", icon: "cog-outline" as const,         key: "steps"    },
];

type SectionKey = "about" | "features" | "active" | "steps";

const DetailsDesktopHeader: React.FC<{
  onNavPress: (key: SectionKey) => void;
  onStartSelling: () => void;
}> = ({ onNavPress, onStartSelling }) => (
  <View style={hs.wrap}>
    <View style={hs.inner}>
      <View style={hs.brand}>
        <Image
          source={require("../../assets/images/logo-removebg-preview.png")}
          style={hs.brandLogo}
          resizeMode="contain"
        />
        <View style={hs.brandText}>
          <Text style={hs.brandTitle}>FLINT & THREAD</Text>
          <Text style={hs.brandTagline}>The Infinity and Vanguard</Text>
        </View>
      </View>

      <View style={hs.navRight}>
        {HEADER_NAV.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={hs.navLink}
            onPress={() => onNavPress(item.key as SectionKey)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name={item.icon} size={17} color={C.textMid} />
            <Text style={hs.navLinkText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={hs.headerCta} onPress={onStartSelling} activeOpacity={0.88}>
          <LinearGradient
            colors={[C.orange, C.orangeLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={hs.headerCtaGrad}
          >
            <Text style={hs.headerCtaText}>Start Selling</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

const FOOTER_QUICK_LINKS: { label: string; icon: string; key?: SectionKey }[] = [
  { label: "Home",             icon: "home-outline",             key: "active"    },
  { label: "About Us",         icon: "information-outline",    key: "about"     },
  { label: "Key Features",     icon: "star-outline",             key: "features"  },
  { label: "Now Active",       icon: "calendar-month-outline",   key: "active"    },
  { label: "How It Works",     icon: "cog-outline",              key: "steps"     },
];

const FOOTER_BUSINESS = [
  { label: "Become a Seller",    icon: "store-outline" },
  { label: "Promotions with Us", icon: "bullhorn-outline" },
];

const FOOTER_SOCIAL = [
  { icon: "facebook",  color: "#1877F2" },
  { icon: "twitter",   color: "#000000" },
  { icon: "instagram", color: "#E4405F" },
  { icon: "linkedin",  color: "#0A66C2" },
  { icon: "youtube",   color: "#FF0000" },
  { icon: "whatsapp",  color: "#25D366" },
] as const;

const DetailsFooter: React.FC<{
  isDesktop: boolean;
  onNavPress: (key: SectionKey) => void;
  onStartSelling: () => void;
}> = ({ isDesktop, onNavPress, onStartSelling }) => (
  <View style={[fs.wrap, isDesktop && fs.wrapDesktop]}>
    <View style={[fs.inner, isDesktop && fs.innerDesktop]}>
      <View style={[fs.col, isDesktop && fs.colBrand]}>
        <View style={fs.footerBrand}>
          <Image
            source={require("../../assets/images/logo-removebg-preview.png")}
            style={fs.footerLogo}
            resizeMode="contain"
          />
          <View>
            <Text style={fs.footerBrandTitle}>FLINT & THREAD</Text>
            <Text style={fs.footerBrandTag}>The Infinity and Vanguard</Text>
          </View>
        </View>
        <Text style={fs.footerDesc}>
          The ultimate shopping destination for the future of e-commerce. Shop with trusted sellers and explore a truly next-generation experience.
        </Text>
        <View style={fs.socialRow}>
          {FOOTER_SOCIAL.map((s) => (
            <View key={s.icon} style={[fs.socialBtn, { backgroundColor: "rgba(255,255,255,0.12)" }]}>
              <MaterialCommunityIcons name={s.icon as any} size={18} color="#fff" />
            </View>
          ))}
        </View>
      </View>

      <View style={[fs.col, isDesktop && fs.colLinks]}>
        <Text style={fs.colHeading}>Quick Links</Text>
        {FOOTER_QUICK_LINKS.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={fs.footerLink}
            onPress={() => item.key && onNavPress(item.key)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name={item.icon as any} size={16} color={C.orange} />
            <Text style={fs.footerLinkText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[fs.col, isDesktop && fs.colLinks]}>
        <Text style={fs.colHeading}>Business Opportunities</Text>
        {FOOTER_BUSINESS.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={fs.footerLink}
            onPress={
              item.label === "Become a Seller"
                ? onStartSelling
                : () => onNavPress("features")
            }
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name={item.icon as any} size={16} color={C.orange} />
            <Text style={fs.footerLinkText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[fs.col, isDesktop && fs.colContact]}>
        <Text style={fs.colHeading}>Contact Info</Text>
        <TouchableOpacity
          style={fs.footerLink}
          onPress={() => Linking.openURL("mailto:support@flintnthread.in")}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="email-outline" size={16} color={C.orange} />
          <Text style={fs.footerLinkText}>support@flintnthread.in</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={fs.footerLink}
          onPress={() => Linking.openURL("tel:+919063499092")}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="phone-outline" size={16} color={C.orange} />
          <Text style={fs.footerLinkText}>+91 9063499092</Text>
        </TouchableOpacity>
      </View>
    </View>

    <View style={fs.copyrightBar}>
      <Text style={fs.copyright}>
        © 2025-2026 Flint & Thread (India) Private Limited. All rights reserved.
      </Text>
    </View>
  </View>
);

// ─── 9-Step journey card (desktop / laptop grid) ───────────
const StepJourneyCard: React.FC<{
  step: (typeof STEPS)[0];
  index: number;
  showStepNumber?: boolean;
  cardStyle?: object | object[];
  titleStyle?: object | undefined;
  descStyle?: object | undefined;
}> = ({ step, index, showStepNumber = true, cardStyle, titleStyle, descStyle }) => (
  <View
    style={[
      ss.stepCard,
      ss.stepCardGrid,
      !showStepNumber && ss.stepCardGridNoNum,
      cardStyle,
      { borderTopColor: step.color },
    ]}
  >
    {showStepNumber && (
      <LinearGradient
        colors={[step.color, step.color + "BB"]}
        style={[ss.stepNumCorner, { shadowColor: step.color }]}
      >
        <Text style={ss.stepNumText}>{index + 1}</Text>
      </LinearGradient>
    )}
    <View
      style={[
        showStepNumber ? ss.stepIconCorner : ss.stepIconInline,
        { backgroundColor: step.color + "1A" },
      ]}
    >
      <MaterialCommunityIcons name={step.icon as any} size={22} color={step.color} />
    </View>
    <View style={ss.stepCardBody}>
      <Text style={[ss.stepTitle, titleStyle]}>{step.title}</Text>
      <Text style={[ss.stepDesc, descStyle]}>{step.desc}</Text>
    </View>
  </View>
);

// ─── Animated Seller Card ──────────────────────────────────
const AnimatedSellerCard: React.FC<{
  item: typeof SELLER_TYPES[0];
  index: number;
  sectionVisible: boolean;
  cardWidth: number;
  useGrid?: boolean;
}> = ({ item, index, sectionVisible, cardWidth, useGrid }) => {
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
        useGrid && s.sellerCardGrid,
        {
          width: useGrid ? ("100%" as const) : cardWidth,
          borderTopColor: item.color,
          borderTopWidth: 3,
        },
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
  const { isDesktop, isTablet, width: winWidth } = useResponsive();
  const { isMobileAuthFlow, welcomeRoute, loginRoute, preLoginWelcomeParams } =
    useAuthFlow();
  const goToSelling = () => {
    if (isMobileAuthFlow) {
      router.push({ pathname: welcomeRoute, params: preLoginWelcomeParams });
    } else {
      router.push(loginRoute);
    }
  };
  const { height: winHeight } = useWindowDimensions();
  const SW = Dimensions.get("window").width;
  const contentWidth = Math.min(winWidth, CONTENT_MAX);
  const desktopHeroMinH = Math.max(520, Math.min(winHeight - 100, 720));
  const isStepsGrid = isDesktop || (Platform.OS === "web" && isTablet);
  const isWhyGrid = isStepsGrid;
  const isSellerGrid = isStepsGrid;
  const stepsSectionPad = isStepsGrid ? 96 : 40;
  const sellerSectionPad = isSellerGrid ? 96 : 40;
  const sellerGap = 20;
  const sellerGridInnerW = Math.min(winWidth, CONTENT_MAX) - sellerSectionPad;
  const sellerColCount = isDesktop ? 3 : 2;
  const sellerCardWidthGrid = Math.floor(
    (sellerGridInnerW - sellerGap * (sellerColCount - 1)) / sellerColCount
  );
  const whySectionPad = isWhyGrid ? 96 : 40;
  const whyGap = 20;
  const whyGridInnerW = Math.min(winWidth, CONTENT_MAX) - whySectionPad;
  const whyCardWidth = Math.floor((whyGridInnerW - whyGap) / 2);
  const stepsGap = 20;
  const stepsGridInnerW = Math.min(winWidth, CONTENT_MAX) - stepsSectionPad;
  const stepsColCount = isDesktop ? 3 : 2;
  const stepCardWidth = Math.floor(
    (stepsGridInnerW - stepsGap * (stepsColCount - 1)) / stepsColCount
  );

  const scrollRef   = useRef<ScrollView>(null);
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const slideAnim   = useRef(new Animated.Value(30)).current;
  const sectionOffsets = useRef<Partial<Record<SectionKey, number>>>({});

  const [sellerSectionVisible, setSellerSectionVisible] = React.useState(false);

  const recordSectionOffset = (key: SectionKey, y: number) => {
    sectionOffsets.current[key] = y;
  };

  const scrollToSection = (key: SectionKey) => {
    const y = sectionOffsets.current[key];
    if (y != null) {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true });
    }
  };

  const ds = useMemo(
    () =>
      isDesktop
        ? StyleSheet.create({
            page: { width: "100%" as const, alignItems: "stretch" as const },
            content: { width: "100%", maxWidth: CONTENT_MAX, alignSelf: "center" as const },
            heroWrap: { width: "100%", alignSelf: "stretch" as const },
            heroGrad: {
              width: "100%",
              paddingHorizontal: 0,
              paddingBottom: 72,
              paddingTop: 40,
              minHeight: desktopHeroMinH,
              overflow: "visible" as const,
            },
            heroInner: {
              width: "100%",
              maxWidth: CONTENT_MAX,
              alignSelf: "center" as const,
              paddingHorizontal: 56,
              paddingBottom: 24,
            },
            heroRow: {
              flexDirection: "row" as const,
              alignItems: "flex-start" as const,
              justifyContent: "space-between" as const,
              gap: 48,
              width: "100%",
            },
            heroLeft: { flex: 1, maxWidth: 620, minWidth: 320, flexShrink: 1 },
            heroRight: { flex: 1, alignItems: "flex-end" as const, justifyContent: "center" as const, maxWidth: 440 },
            heroStatPanel: {
              width: "100%",
              maxWidth: 400,
              backgroundColor: "rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: 28,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.14)",
            },
            heroStatGrid: {
              flexDirection: "row" as const,
              flexWrap: "wrap" as const,
              marginTop: 20,
              gap: 12,
            },
            heroStatItem: { width: "47%" as const, alignItems: "center" as const, paddingVertical: 8 },
            heroH1: { fontSize: 52, lineHeight: 60 },
            heroSub: { fontSize: 18, lineHeight: 28, maxWidth: 540 },
            heroCtas: {
              flexDirection: "row" as const,
              alignItems: "center" as const,
              alignSelf: "flex-start" as const,
              flexWrap: "wrap" as const,
              gap: 14,
              marginBottom: 26,
              marginTop: 4,
              width: "100%" as const,
              maxWidth: 540,
              zIndex: 20,
              ...(Platform.OS === "web" ? { position: "relative" as const } : {}),
            },
            desktopCtaPrimary: {
              borderRadius: 50,
              overflow: "hidden",
              minWidth: 200,
              flexShrink: 0,
              backgroundColor: C.orange,
            },
            desktopCtaPrimaryGrad: {
              flexDirection: "row" as const,
              alignItems: "center" as const,
              justifyContent: "center" as const,
              paddingHorizontal: 32,
              paddingVertical: 16,
              minHeight: 52,
              minWidth: 200,
              borderRadius: 50,
            },
            desktopCtaSecondary: {
              flexDirection: "row" as const,
              alignItems: "center" as const,
              justifyContent: "center" as const,
              gap: 8,
              flexShrink: 0,
              borderWidth: 1.5,
              borderColor: "rgba(255,255,255,0.35)",
              backgroundColor: "rgba(255,255,255,0.06)",
              paddingHorizontal: 26,
              paddingVertical: 16,
              minHeight: 52,
              minWidth: 180,
              borderRadius: 50,
            },
            chipRow: { maxWidth: 540 },
            trustBar: { maxWidth: 540, alignSelf: "flex-start" as const, width: "100%" as const },
            statsStrip: { maxWidth: CONTENT_MAX, marginHorizontal: "auto" as const, width: "92%" as const },
            section: { paddingHorizontal: 48, paddingTop: 64, paddingBottom: 64 },
            sectionHeader: { maxWidth: 720, alignSelf: "center" as const, width: "100%" as const, alignItems: "center" as const },
            sectionH: { fontSize: 36, lineHeight: 44, textAlign: "center" as const },
            stepsSectionH: {
              fontSize: 36,
              lineHeight: 44,
              textAlign: "center" as const,
              ...(Platform.OS === "web" ? ({ whiteSpace: "nowrap" } as object) : {}),
            },
            sectionSub: { fontSize: 17, textAlign: "center" as const, maxWidth: 640 },
            eyebrowPill: { alignSelf: "center" as const },
            sellerSection: { width: "100%" as const, alignItems: "center" as const },
            sellerSectionHeader: {
              maxWidth: 720,
              alignSelf: "center" as const,
              width: "100%" as const,
              alignItems: "center" as const,
              marginBottom: 40,
            },
            sellerSectionH: {
              fontSize: 36,
              lineHeight: 44,
              textAlign: "center" as const,
              ...(Platform.OS === "web" ? ({ whiteSpace: "nowrap" } as object) : {}),
            },
            sellerGrid: {
              width: "100%" as const,
              maxWidth: CONTENT_MAX - sellerSectionPad,
              alignSelf: "center" as const,
              gap: sellerGap,
              ...(Platform.OS === "web"
                ? ({
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                  } as object)
                : {
                    flexDirection: "row" as const,
                    flexWrap: "wrap" as const,
                    justifyContent: "center" as const,
                  }),
            },
            stepsSection: {
              width: "100%" as const,
              alignItems: "center" as const,
            },
            stepsSectionHeader: {
              maxWidth: 720,
              alignSelf: "center" as const,
              width: "100%" as const,
              alignItems: "center" as const,
              marginBottom: 40,
            },
            stepsGrid: {
              width: "100%" as const,
              maxWidth: CONTENT_MAX - stepsSectionPad,
              alignSelf: "center" as const,
              gap: stepsGap,
              ...(Platform.OS === "web"
                ? ({
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                  } as object)
                : {
                    flexDirection: "row" as const,
                    flexWrap: "wrap" as const,
                    justifyContent: "center" as const,
                  }),
            },
            stepsGridLaptop: Platform.OS === "web"
              ? ({ gridTemplateColumns: "repeat(3, minmax(260px, 1fr))" } as object)
              : {},
            stepCardDesktop: {
              width: Platform.OS === "web" ? ("100%" as const) : stepCardWidth,
              minHeight: 158,
            },
            stepTitle: { fontSize: 15 },
            stepDesc: { fontSize: 13, lineHeight: 20 },
            stepsCtaWrap: { alignSelf: "center" as const, minWidth: 320, marginTop: 36 },
            whySection: { width: "100%" as const, alignItems: "center" as const },
            whySectionHeader: {
              maxWidth: 720,
              alignSelf: "center" as const,
              width: "100%" as const,
              alignItems: "center" as const,
              marginBottom: 40,
            },
            whySectionH: {
              fontSize: 36,
              lineHeight: 44,
              textAlign: "center" as const,
              ...(Platform.OS === "web" ? ({ whiteSpace: "nowrap" } as object) : {}),
            },
            whyGrid: {
              width: "100%" as const,
              maxWidth: CONTENT_MAX - whySectionPad,
              alignSelf: "center" as const,
              gap: whyGap,
              ...(Platform.OS === "web"
                ? ({
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                  } as object)
                : {
                    flexDirection: "row" as const,
                    flexWrap: "wrap" as const,
                    justifyContent: "center" as const,
                  }),
            },
            whyCard: {
              width: Platform.OS === "web" ? ("100%" as const) : whyCardWidth,
              marginBottom: 0,
            },
            regSection: { flexDirection: "row" as const, alignItems: "stretch" as const, gap: 0 },
            regCard: { flex: 1, maxWidth: CONTENT_MAX - 96 },
            regBodyRow: { flexDirection: "row" as const, gap: 40, padding: 36 },
            regLeft: { flex: 1 },
            regRight: { flex: 1, justifyContent: "center" as const },
            finalBanner: {
              width: "100%",
              alignSelf: "stretch" as const,
              paddingHorizontal: 0,
              paddingBottom: 0,
              alignItems: "stretch" as const,
            },
            finalBannerInner: {
              width: "100%",
              maxWidth: CONTENT_MAX,
              alignSelf: "center" as const,
              paddingHorizontal: 56,
              paddingBottom: 64,
            },
            finalBannerRow: {
              flexDirection: "row" as const,
              alignItems: "center" as const,
              justifyContent: "space-between" as const,
              gap: 40,
              width: "100%",
            },
            finalBannerLeft: { flex: 1, alignItems: "flex-start" as const, maxWidth: 640 },
            finalBannerRight: {
              flexShrink: 0,
              alignItems: "flex-end" as const,
              justifyContent: "center" as const,
              alignSelf: "center" as const,
            },
            bannerH: { fontSize: 36, lineHeight: 44, textAlign: "left" as const },
            bannerSub: { fontSize: 17, maxWidth: 520, textAlign: "left" as const, marginBottom: 24 },
            bannerStats: { marginBottom: 0, maxWidth: 480, alignSelf: "flex-start" as const },
            bannerCtaWrap: {
              alignSelf: "flex-end" as const,
              width: "auto" as const,
              minWidth: 220,
              flexShrink: 0,
            },
          })
        : null,
    [
      isDesktop,
      contentWidth,
      desktopHeroMinH,
      stepCardWidth,
      stepsGap,
      stepsSectionPad,
      whyCardWidth,
      whyGap,
      whySectionPad,
      sellerCardWidthGrid,
      sellerGap,
      sellerSectionPad,
    ]
  );

  const tabletDs = useMemo(
    () =>
      isTablet && Platform.OS === "web"
        ? StyleSheet.create({
            section: { paddingHorizontal: 40, paddingTop: 52, paddingBottom: 52 },
            content: { width: "100%", maxWidth: CONTENT_MAX, alignSelf: "center" },
            stepsSection: { width: "100%", alignItems: "center" },
            stepsGrid: {
              width: "100%",
              maxWidth: CONTENT_MAX - stepsSectionPad,
              alignSelf: "center",
              gap: stepsGap,
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
            } as object,
            stepCardDesktop: { width: "100%", minHeight: 150 },
            stepsSectionHeader: {
              maxWidth: 640,
              alignSelf: "center",
              width: "100%",
              alignItems: "center",
              marginBottom: 32,
            },
            sectionH: { fontSize: 30, lineHeight: 38, textAlign: "center" },
            stepsSectionH: {
              fontSize: 30,
              lineHeight: 38,
              textAlign: "center",
              ...(Platform.OS === "web" ? ({ whiteSpace: "nowrap" } as object) : {}),
            },
            sectionSub: { fontSize: 16, textAlign: "center", maxWidth: 520 },
            eyebrowPill: { alignSelf: "center" },
            stepsCtaWrap: { alignSelf: "center", marginTop: 28 },
            whySection: { width: "100%", alignItems: "center" },
            whySectionHeader: {
              maxWidth: 640,
              alignSelf: "center",
              width: "100%",
              alignItems: "center",
              marginBottom: 32,
            },
            whySectionH: {
              fontSize: 30,
              lineHeight: 38,
              textAlign: "center",
              ...(Platform.OS === "web" ? ({ whiteSpace: "nowrap" } as object) : {}),
            },
            whyGrid: {
              width: "100%",
              maxWidth: CONTENT_MAX - whySectionPad,
              alignSelf: "center",
              gap: whyGap,
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
            } as object,
            whyCard: { width: "100%", marginBottom: 0 },
            sellerSection: { width: "100%", alignItems: "center" },
            sellerSectionHeader: {
              maxWidth: 640,
              alignSelf: "center",
              width: "100%",
              alignItems: "center",
              marginBottom: 32,
            },
            sellerSectionH: {
              fontSize: 30,
              lineHeight: 38,
              textAlign: "center",
              ...(Platform.OS === "web" ? ({ whiteSpace: "nowrap" } as object) : {}),
            },
            sellerGrid: {
              width: "100%",
              maxWidth: CONTENT_MAX - sellerSectionPad,
              alignSelf: "center",
              gap: sellerGap,
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
            } as object,
          })
        : null,
    [isTablet, stepsSectionPad, stepsGap, whySectionPad, whyGap, sellerSectionPad, sellerGap]
  );

  const sellerCardWidth = isSellerGrid
    ? sellerCardWidthGrid
    : (SW - 54) / 2;

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

  const scrollToSteps = () =>
    scrollRef.current?.scrollTo({ y: isDesktop ? 700 : 820, animated: true });

  const HeroContainer = isDesktop ? View : SafeAreaView;

  return (
    <View style={[{ flex: 1, backgroundColor: C.white, width: "100%" }, isDesktop && ds?.page]}>
      <StatusBar
        barStyle={isDesktop ? "dark-content" : "light-content"}
        backgroundColor={isDesktop ? C.white : C.navyDeep}
        translucent={false}
      />

      {isDesktop && (
        <DetailsDesktopHeader
          onNavPress={scrollToSection}
          onStartSelling={goToSelling}
        />
      )}

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
        contentContainerStyle={isDesktop ? ds?.page : undefined}
      >

        {/* ══════════════════════════════════
            HERO
        ══════════════════════════════════ */}
        <View
          style={ds?.heroWrap}
          onLayout={(e) => recordSectionOffset("active", e.nativeEvent.layout.y)}
        >
        <LinearGradient
          colors={[C.navyDeep, "#1d3258", "#241566"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[s.heroGrad, ds?.heroGrad]}
        >
          {/* Decorative orbs */}
          <View style={[s.orb,       { width: isDesktop ? 360 : 260, height: isDesktop ? 360 : 260, top: -80,  right: -80, opacity: 0.07 }]} />
          <View style={[s.orb,       { width: isDesktop ? 240 : 180, height: isDesktop ? 240 : 180, bottom: 40, left: -60, opacity: 0.05 }]} />
          <View style={[s.orbOrange, { width: isDesktop ? 180 : 130, height: isDesktop ? 180 : 130, top: 110,  right: isDesktop ? 80 : 24,  opacity: 0.13 }]} />

          <HeroContainer style={isDesktop ? ds?.heroInner : undefined}>
            {!isDesktop && (
              <View style={s.nav}>
                <View style={s.logoContainer}>
                  <Image
                    source={require("../../assets/images/logo-removebg-preview.png")}
                    style={s.navLogo}
                    resizeMode="contain"
                  />
                </View>
              </View>
            )}

            <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, isDesktop && ds?.heroRow]}>
              <View style={isDesktop ? ds?.heroLeft : undefined}>
              {/* Live badge */}
              <View style={s.livePill}>
                <View style={s.liveDot} />
                <Text style={s.livePillText}>Now Onboarding Sellers Across India</Text>
              </View>

              {/* Headline */}
              <Text style={[s.heroH1, ds?.heroH1]}>Your Business,{"\n"}<Text style={{ color: C.orange }}>Your Market.</Text></Text>
              <Text style={[s.heroSub, ds?.heroSub]}>
                Join India&apos;s fastest-growing fashion marketplace. From local shops to global brands — sell smarter with Flint & Thread.
              </Text>

              {/* Chips */}
              <View style={[s.chipRow, ds?.chipRow]}>
                {["Retailers", "Boutiques", "Designers", "Brands", "Manufacturers"].map((c) => (
                  <View key={c} style={s.chip}>
                    <Text style={s.chipText}>{c}</Text>
                  </View>
                ))}
              </View>

              {/* CTA buttons */}
              <View style={isDesktop ? ds?.heroCtas : s.heroCtas}>
                <TouchableOpacity
                  style={isDesktop ? ds?.desktopCtaPrimary : s.ctaPrimary}
                  onPress={() => goToSelling()}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={[C.orange, C.orangeLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={isDesktop ? ds?.desktopCtaPrimaryGrad : s.ctaPrimaryGrad}
                  >
                    <Text style={s.ctaPrimaryText}>Start Selling</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                  style={isDesktop ? ds?.desktopCtaSecondary : s.ctaSecondary}
                  onPress={scrollToSteps}
                  activeOpacity={0.75}
                >
                  <Ionicons name="play-circle-outline" size={20} color="rgba(255,255,255,0.88)" />
                  <Text style={s.ctaSecondaryText}>How It Works</Text>
                </TouchableOpacity>
              </View>

              {/* Mini trust bar */}
              <View style={[s.trustBar, ds?.trustBar]}>
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
              </View>

              {isDesktop && (
                <View style={ds?.heroRight}>
                  <View style={ds?.heroStatPanel}>
                    <Text style={{ fontFamily: "Outfit_700Bold", fontSize: 13, color: "rgba(255,255,255,0.7)", letterSpacing: 1.5 }}>
                      TRUSTED MARKETPLACE
                    </Text>
                    <Text style={{ fontFamily: "Outfit_900Black", fontSize: 26, color: "#fff", marginTop: 8, lineHeight: 32 }}>
                      Grow your store with Flint & Thread
                    </Text>
                    <View style={ds?.heroStatGrid}>
                      {STATS.map((st) => (
                        <View key={st.label} style={ds?.heroStatItem}>
                          <Text style={{ fontFamily: "Outfit_900Black", fontSize: 28, color: C.orange }}>{st.val}</Text>
                          <Text style={{ fontFamily: "Outfit_500Medium", fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>{st.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              )}

            </Animated.View>
          </HeroContainer>
        </LinearGradient>
        </View>

        {/* ══════════════════════════════════
            FLOATING STATS CARD
        ══════════════════════════════════ */}
        <View style={[s.statsStrip, ds?.statsStrip, ds?.content]}>
          {STATS.map((st, i) => (
            <View key={st.label} style={[s.statBox, i < STATS.length - 1 && s.statBorder]}>
              <MaterialCommunityIcons name={st.icon as any} size={isDesktop ? 24 : 21} color={C.orange} style={{ marginBottom: 5 }} />
              <Text style={[s.statVal, isDesktop && { fontSize: 22 }]}>{st.val}</Text>
              <Text style={s.statLbl}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* ══════════════════════════════════
            WHO WE SERVE
        ══════════════════════════════════ */}
        <View
          style={[
            s.section,
            isSellerGrid && (ds?.section ?? tabletDs?.section),
            isSellerGrid && (ds?.content ?? tabletDs?.content),
            isSellerGrid && (ds?.sellerSection ?? tabletDs?.sellerSection),
            { backgroundColor: C.cream },
          ]}
          onLayout={(e) => recordSectionOffset("about", e.nativeEvent.layout.y)}
        >
          <View
            style={
              isSellerGrid
                ? [ds?.sellerSectionHeader, tabletDs?.sellerSectionHeader]
                : undefined
            }
          >
            <View style={[s.eyebrowPill, isSellerGrid && { alignSelf: "center" }]}>
              <Text style={s.eyebrowText}>WHO WE SERVE</Text>
            </View>
            <Text
              style={[
                s.sectionH,
                isSellerGrid && (ds?.sellerSectionH ?? tabletDs?.sellerSectionH),
                isSellerGrid && { textAlign: "center" },
              ]}
            >
              Built for Every Kind of Seller
            </Text>
            <Text
              style={[
                s.sectionSub,
                isSellerGrid && (ds?.sectionSub ?? tabletDs?.sectionSub),
                isSellerGrid && { textAlign: "center", alignSelf: "center" },
              ]}
            >
              Whether you&apos;re a solo creator or a large manufacturer, we have tools tailored for you.
            </Text>
          </View>

          <View style={isSellerGrid ? [ds?.sellerGrid, tabletDs?.sellerGrid] : s.sellerGrid}>
            {SELLER_TYPES.map((item, index) => (
              <AnimatedSellerCard
                key={item.title}
                item={item}
                index={index}
                sectionVisible={sellerSectionVisible || isSellerGrid}
                cardWidth={sellerCardWidth}
                useGrid={isSellerGrid}
              />
            ))}
          </View>
        </View>

        {/* ══════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════ */}
        <View
          style={[
            s.section,
            isStepsGrid && (ds?.section ?? tabletDs?.section),
            isStepsGrid && (ds?.content ?? tabletDs?.content),
            isStepsGrid && (ds?.stepsSection ?? tabletDs?.stepsSection),
            { backgroundColor: C.white },
          ]}
          onLayout={(e) => recordSectionOffset("steps", e.nativeEvent.layout.y)}
        >
          <View
            style={
              isStepsGrid
                ? [ds?.stepsSectionHeader, tabletDs?.stepsSectionHeader]
                : undefined
            }
          >
            <View
              style={[
                s.eyebrowPill,
                isStepsGrid && { alignSelf: "center" },
                { backgroundColor: C.orangeGlow, borderColor: "rgba(249,115,22,0.25)" },
              ]}
            >
              <Text style={[s.eyebrowText, { color: C.orange }]}>9-STEP JOURNEY</Text>
            </View>
            <Text
              style={[
                s.sectionH,
                isStepsGrid && (ds?.stepsSectionH ?? tabletDs?.stepsSectionH),
                isStepsGrid && { textAlign: "center" },
              ]}
            >
              {isStepsGrid ? "From Sign-up to First Sale" : "From Sign-up\nto First Sale"}
            </Text>
            <Text
              style={[
                s.sectionSub,
                ds?.sectionSub,
                tabletDs?.sectionSub,
                isStepsGrid && { textAlign: "center", alignSelf: "center" },
              ]}
            >
              A clear, guided path to getting your store live and selling across India.
            </Text>
          </View>

          {isStepsGrid ? (
            <View
              style={[
                ds?.stepsGrid,
                tabletDs?.stepsGrid,
                isDesktop && ds?.stepsGridLaptop,
              ]}
            >
              {STEPS.map((step, i) => (
                <StepJourneyCard
                  key={step.title}
                  step={step}
                  index={i}
                  showStepNumber={isDesktop}
                  cardStyle={[ds?.stepCardDesktop, tabletDs?.stepCardDesktop]}
                  titleStyle={ds?.stepTitle}
                  descStyle={ds?.stepDesc}
                />
              ))}
            </View>
          ) : (
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
                      <View style={[s.tlDot, { backgroundColor: step.color }]} />
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
          )}

          <TouchableOpacity
            onPress={() => goToSelling()}
            activeOpacity={0.88}
            style={[s.stepsCtaWrap, ds?.stepsCtaWrap, tabletDs?.stepsCtaWrap]}
          >
            <LinearGradient colors={[C.orange, C.orangeLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.stepsCta}>
              <Text style={s.stepsCtaText}>Begin Your Journey Today</Text>
              <Ionicons name="arrow-forward-circle" size={22} color="#fff" style={{ marginLeft: 8 }} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ══════════════════════════════════
            WHY CHOOSE US
        ══════════════════════════════════ */}
        <View
          style={[
            s.section,
            isWhyGrid && (ds?.section ?? tabletDs?.section),
            isWhyGrid && (ds?.content ?? tabletDs?.content),
            isWhyGrid && (ds?.whySection ?? tabletDs?.whySection),
            { backgroundColor: C.softBlue },
          ]}
          onLayout={(e) => recordSectionOffset("features", e.nativeEvent.layout.y)}
        >
          <View
            style={
              isWhyGrid
                ? [ds?.whySectionHeader, tabletDs?.whySectionHeader]
                : undefined
            }
          >
            <View
              style={[
                s.eyebrowPill,
                isWhyGrid && { alignSelf: "center" },
                { backgroundColor: "#EEF3FF", borderColor: "#C7D7FF" },
              ]}
            >
              <Text style={[s.eyebrowText, { color: C.navyLight }]}>WHY CHOOSE US</Text>
            </View>
            <Text
              style={[
                s.sectionH,
                isWhyGrid && (ds?.whySectionH ?? tabletDs?.whySectionH),
                isWhyGrid && { textAlign: "center" },
              ]}
            >
              {isWhyGrid ? "Everything You Need to Grow" : "Everything You\nNeed to Grow"}
            </Text>
            <Text
              style={[
                s.sectionSub,
                isWhyGrid && (ds?.sectionSub ?? tabletDs?.sectionSub),
                isWhyGrid && { textAlign: "center", alignSelf: "center" },
              ]}
            >
              Tools, support, and reach — all in one platform designed for Indian sellers.
            </Text>
          </View>

          <View style={isWhyGrid ? [ds?.whyGrid, tabletDs?.whyGrid] : undefined}>
            {WHY.map((w) => (
              <View
                key={w.title}
                style={[s.whyCard, isWhyGrid && (ds?.whyCard ?? tabletDs?.whyCard)]}
              >
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
        </View>

        {/* ══════════════════════════════════
            REGISTER CTA
        ══════════════════════════════════ */}
        <View style={[s.section, ds?.section, ds?.content, { backgroundColor: C.white }]}>
          <View style={[s.regCard, ds?.regCard]}>
            <LinearGradient colors={[C.orangeDeep, C.orange, C.orangeLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.regTopBar} />
            <View style={[s.regBody, isDesktop && ds?.regBodyRow]}>
              <View style={isDesktop ? ds?.regLeft : undefined}>
                <Text style={s.regEyebrow}>GET STARTED TODAY</Text>
                <Text style={[s.regH, isDesktop && { fontSize: 34 }]}>Create Your{"\n"}Seller Account</Text>
                <Text style={s.regSub}>Join thousands of sellers reaching customers across India — B2B and B2C from day one.</Text>

                <View style={{ marginTop: 22, marginBottom: isDesktop ? 0 : 24 }}>
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
              </View>

              <View style={isDesktop ? ds?.regRight : undefined}>
                <View style={s.feePill}>
                  <MaterialCommunityIcons name="tag-outline" size={16} color={C.orange} />
                  <Text style={s.feePillText}>  One-time fee: <Text style={{ fontFamily: "Outfit_800ExtraBold", color: C.orange }}>₹199 only</Text></Text>
                </View>

                <TouchableOpacity onPress={() => goToSelling()} activeOpacity={0.88} style={{ marginTop: 24 }}>
                  <LinearGradient colors={[C.navyDeep, C.navyLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.regBtn}>
                    <Text style={s.regBtnText}>Register Now</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════
            FINAL CTA BANNER
        ══════════════════════════════════ */}
        <LinearGradient
          colors={[C.navyDeep, "#1E3A6E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[s.finalBanner, ds?.finalBanner, isDesktop && { alignItems: "stretch" }]}
        >
          <LinearGradient colors={[C.orangeDeep, C.orange, C.orangeLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.bannerStrip} />

          {isDesktop ? (
            <View style={ds?.finalBannerInner}>
              <View style={ds?.finalBannerRow}>
                <View style={ds?.finalBannerLeft}>
                  <Text style={[s.bannerH, ds?.bannerH]}>Ready to Grow{"\n"}Your Business?</Text>
                  <Text style={[s.bannerSub, ds?.bannerSub]}>
                    Thousands of sellers are already earning on Flint & Thread. Your store could be next.
                  </Text>
                  <View style={[s.bannerStats, ds?.bannerStats]}>
                    {[{ val: "10K+", label: "Sellers" }, { val: "1M+", label: "Customers" }, { val: "50K+", label: "Products" }].map((st, i) => (
                      <View key={st.label} style={[s.bannerStat, i < 2 && { borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.12)" }]}>
                        <Text style={s.bannerStatVal}>{st.val}</Text>
                        <Text style={s.bannerStatLabel}>{st.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={ds?.finalBannerRight}>
                  <TouchableOpacity
                    onPress={() => goToSelling()}
                    activeOpacity={0.88}
                    style={[s.bannerCtaWrap, ds?.bannerCtaWrap]}
                  >
                    <LinearGradient colors={[C.orange, C.orangeLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.bannerCtaDesktop}>
                      <Text style={s.bannerCtaText}>Start Selling Now</Text>
                      <Ionicons name="arrow-forward-circle" size={22} color="#fff" style={{ marginLeft: 8 }} />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <>
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
              <TouchableOpacity onPress={() => goToSelling()} activeOpacity={0.88} style={s.bannerCtaWrap}>
                <LinearGradient colors={[C.orange, C.orangeLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.bannerCta}>
                  <Text style={s.bannerCtaText}>Start Selling Now</Text>
                  <Ionicons name="arrow-forward-circle" size={22} color="#fff" style={{ marginLeft: 8 }} />
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </LinearGradient>

        {isDesktop && (
          <DetailsFooter
            isDesktop
            onNavPress={scrollToSection}
            onStartSelling={goToSelling}
          />
        )}

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
    width: Dimensions.get("window").width - 120,
    height: 56,
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
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  sellerCardGrid: {
    minHeight: 168,
  },
  sellerIconBox: { width: 54, height: 54, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  sellerCardTitle: { fontFamily: "Outfit_700Bold", fontSize: 15, marginBottom: 3 },
  sellerCardSub: { fontFamily: "Outfit_400Regular", fontSize: 12, color: "#6B7280", lineHeight: 17 },

  // Timeline (steps)
  timeline: { marginTop: 4 },
  tlRow: { flexDirection: "row", alignItems: "flex-start", minHeight: 96 },

  tlSpine: { alignItems: "center", width: 46, zIndex: 10 },
  tlDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
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
  bannerCtaDesktop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 17,
    paddingHorizontal: 32,
    borderRadius: 50,
    minWidth: 220,
  },
  bannerCtaText: { fontFamily: "Outfit_700Bold", fontSize: 16, color: "#fff" },
});

const ss = StyleSheet.create({
  stepCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderTopWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  stepCardGrid: {
    position: "relative",
    paddingTop: 58,
    paddingHorizontal: 18,
    paddingBottom: 20,
    minHeight: 158,
  },
  stepCardGridNoNum: {
    paddingTop: 20,
    minHeight: 140,
  },
  stepIconInline: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  stepNumCorner: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  stepNumText: {
    fontFamily: "Outfit_800ExtraBold",
    fontSize: 17,
    color: "#fff",
  },
  stepIconCorner: {
    position: "absolute",
    top: 16,
    left: 66,
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  stepCardBody: {
    width: "100%",
  },
  stepTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: "#111827",
    marginBottom: 6,
  },
  stepDesc: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 18,
  },
});

const fs = StyleSheet.create({
  wrap: {
    backgroundColor: C.navyDeep,
    width: "100%",
    paddingTop: 48,
    paddingBottom: 0,
  },
  wrapDesktop: {
    paddingTop: 56,
  },
  inner: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 32,
  },
  innerDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    maxWidth: CONTENT_MAX,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 56,
    gap: 24,
  },
  col: {
    marginBottom: 8,
  },
  colBrand: {
    flex: 1.4,
    minWidth: 260,
    maxWidth: 340,
  },
  colLinks: {
    flex: 1,
    minWidth: 160,
  },
  colContact: {
    flex: 1,
    minWidth: 200,
  },
  footerBrand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  footerLogo: {
    width: 48,
    height: 48,
  },
  footerBrandTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: "#fff",
    letterSpacing: 1,
  },
  footerBrandTag: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
  },
  footerDesc: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    lineHeight: 22,
    marginBottom: 20,
  },
  socialRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  socialBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  colHeading: {
    fontFamily: "Outfit_700Bold",
    fontSize: 16,
    color: C.orange,
    marginBottom: 16,
  },
  footerLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    paddingVertical: 2,
  },
  footerLinkText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
  },
  copyrightBar: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  copyright: {
    fontFamily: "Outfit_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
  },
});

const hs = StyleSheet.create({
  wrap: {
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: "#E8ECF4",
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 4,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: CONTENT_MAX,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexShrink: 1,
  },
  brandLogo: {
    width: 52,
    height: 52,
  },
  brandText: {
    justifyContent: "center",
  },
  brandTitle: {
    fontFamily: "Outfit_700Bold",
    fontSize: 17,
    color: C.textDark,
    letterSpacing: 1.2,
  },
  brandTagline: {
    fontFamily: "Outfit_400Regular",
    fontSize: 11,
    color: C.textLight,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  navRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  navLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navLinkText: {
    fontFamily: "Outfit_500Medium",
    fontSize: 14,
    color: C.textMid,
  },
  headerCta: {
    marginLeft: 8,
    borderRadius: 50,
    overflow: "hidden",
  },
  headerCtaGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 50,
  },
  headerCtaText: {
    fontFamily: "Outfit_700Bold",
    fontSize: 14,
    color: "#fff",
  },
});

export default SellerLanding;
