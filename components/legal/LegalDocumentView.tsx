import React, { useMemo, useEffect } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import type { LegalDocument, LegalSection } from "@/constants/sellerLegalContent";

const NAVY = "#1a2b5e";
const ORANGE = "#f97316";
const CONTAINER_MAX_WIDTH = 920;

type Props = {
  document: LegalDocument;
};

function isPartTitle(title: string) {
  return /^PART\s+[IVXLC]+/i.test(title);
}

function splitBodyParagraphs(body: string): string[] {
  if (!body?.trim()) return [];
  const byClause = body
    .split(/(?=\s\d+\.\d+(?:\.\d+)?\s)/)
    .map((c) => c.trim())
    .filter(Boolean);
  if (byClause.length > 1) return byClause;
  const byParagraph = body.split(/\n\n+/).map((c) => c.trim()).filter(Boolean);
  if (byParagraph.length > 1) return byParagraph;
  return [body.trim()];
}

function splitLongBullet(text: string): string[] {
  const parts = text
    .split(/(?=\s\d+\.\d+(?:\.\d+)?\s)/)
    .map((c) => c.trim())
    .filter(Boolean);
  return parts.length > 1 ? parts : [text];
}

function SectionBlock({ section, index }: { section: LegalSection; index: number }) {
  const isPart = isPartTitle(section.title);
  const paragraphs = splitBodyParagraphs(section.body);

  return (
    <View style={[styles.sectionCard, isPart && styles.sectionCardPart]}>
      <View style={styles.sectionHeaderRow}>
        {isPart ? (
          <View style={styles.partBadge}>
            <AppText size="xs" weight="bold" color="#fff">
              {section.title.match(/PART\s+[IVXLC]+/i)?.[0] ?? "PART"}
            </AppText>
          </View>
        ) : (
          <View style={styles.sectionIndex}>
            <AppText size="xs" weight="bold" color={NAVY}>
              {index + 1}
            </AppText>
          </View>
        )}
        <AppText
          weight="bold"
          size={isPart ? "md" : "sm"}
          style={[styles.sectionTitle, isPart && styles.sectionTitlePart]}
        >
          {section.title}
        </AppText>
      </View>

      {paragraphs.map((para, i) => (
        <AppText key={`${section.title}-p-${i}`} size="sm" style={styles.paragraph}>
          {para}
        </AppText>
      ))}

      {section.bullets?.flatMap((bullet) =>
        splitLongBullet(bullet).map((part, bi) => (
          <View key={`${section.title}-b-${bi}-${part.slice(0, 20)}`} style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <AppText size="sm" style={styles.bulletText}>
              {part}
            </AppText>
          </View>
        ))
      )}
    </View>
  );
}

export function LegalDocumentView({ document }: Props) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const docKind = useMemo(
    () => (document.title.toLowerCase().includes("privacy") ? "privacy" : "terms"),
    [document.title]
  );

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const dom = globalThis.document;
    if (!dom) return;
    const styleId = "legal-document-scrollbar-hide";
    if (dom.getElementById(styleId)) return;
    const style = dom.createElement("style");
    style.id = styleId;
    style.textContent = `
      #legal-document-scroll::-webkit-scrollbar { display: none; width: 0; height: 0; }
      #legal-document-scroll { -ms-overflow-style: none; scrollbar-width: none; }
    `;
    dom.head.appendChild(style);
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <LinearGradient colors={[NAVY, "#243b6e"]} style={styles.hero}>
        <View style={styles.container}>
          <View style={styles.heroInner}>
            <View style={styles.heroTopRow}>
              <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
                <AppText weight="semiBold" size="sm" color="#fff" style={{ marginLeft: 4 }}>
                  Back
                </AppText>
              </Pressable>
              <View style={styles.docTypePill}>
                <Ionicons
                  name={docKind === "privacy" ? "shield-checkmark-outline" : "document-text-outline"}
                  size={14}
                  color="#fff"
                />
                <AppText size="xs" weight="bold" color="#fff" style={{ marginLeft: 6 }}>
                  {docKind === "privacy" ? "Privacy" : "Terms"}
                </AppText>
              </View>
            </View>

            <View style={styles.heroBrandRow}>
              <LinearGradient
                colors={["#EF7B1A", "#F97316"]}
                style={styles.logoRing}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Image
                  source={require("../../assets/images/logo.jpg")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </LinearGradient>
              <View style={styles.heroBrandText}>
                <AppText weight="bold" size="xl" color="#fff" style={styles.heroTitle}>
                  {document.title}
                </AppText>
                <AppText size="sm" color="rgba(255,255,255,0.85)" style={styles.heroSub}>
                  {document.subtitle}
                </AppText>
              </View>
            </View>

            <View style={styles.effectiveDatePill}>
              <Ionicons name="calendar-outline" size={14} color="#fff" />
              <AppText size="xs" weight="semiBold" color="#fff" style={{ marginLeft: 6 }}>
                Effective Date: {document.effectiveDate}
              </AppText>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        nativeID="legal-document-scroll"
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <View style={styles.container}>
          {document.platformMeta && document.platformMeta.length > 0 && (
            <View style={styles.platformCard}>
              <View style={styles.platformCardHeader}>
                <Ionicons name="information-circle" size={20} color={ORANGE} />
                <AppText weight="bold" size="sm" style={styles.platformCardTitle}>
                  Key Platform Details
                </AppText>
              </View>
              <View style={isWide ? styles.platformGridWide : styles.platformGrid}>
                {document.platformMeta.map((item) => (
                  <View key={item.label} style={[styles.platformRow, isWide && styles.platformRowWide]}>
                    <AppText size="xs" weight="bold" color={NAVY} style={styles.platformLabel}>
                      {item.label}
                    </AppText>
                    <AppText size="sm" style={styles.platformValue}>
                      {item.value}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {document.sections.map((section, index) => (
            <SectionBlock key={`${section.title}-${index}`} section={section} index={index} />
          ))}

          <View style={styles.footerNote}>
            <Ionicons name="alert-circle-outline" size={18} color={ORANGE} />
            <AppText size="xs" style={styles.footerNoteText}>
              By registering as a seller on Flint & Thread, you agree to these policies. Please read
              them carefully before accepting.
            </AppText>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const webScrollHidden = Platform.OS === "web"
  ? ({
      scrollbarWidth: "none",
      msOverflowStyle: "none",
    } as object)
  : {};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff7ed", width: "100%" },
  container: {
    width: "100%",
    maxWidth: CONTAINER_MAX_WIDTH,
    alignSelf: "center",
    ...(Platform.OS === "web" ? ({ marginHorizontal: "auto" } as object) : {}),
  },
  hero: { paddingBottom: 20, width: "100%" },
  heroInner: { paddingHorizontal: 20, paddingTop: 8, width: "100%" },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  backBtn: { flexDirection: "row", alignItems: "center" },
  docTypePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  heroBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  logoRing: {
    width: 173,
    height: 55,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
    flexShrink: 0,
  },
  logoImage: {
    width: 170,
    height: 50,
    borderRadius: 5,
    backgroundColor: "#ffffff",
  },
  heroBrandText: { flex: 1, minWidth: 0 },
  heroTitle: { marginBottom: 4 },
  heroSub: { lineHeight: 20 },
  effectiveDatePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  scroll: { flex: 1, width: "100%", ...webScrollHidden },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, width: "100%" },
  platformCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#fed7aa",
    marginBottom: 14,
    ...Platform.select({
      web: { boxShadow: "0 4px 20px rgba(26,43,94,0.08)" },
      default: {
        shadowColor: NAVY,
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
      },
    }),
  },
  platformCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  platformCardTitle: { color: NAVY },
  platformGrid: { gap: 10 },
  platformGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  platformRow: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  platformRowWide: { width: "48%", minWidth: 280 },
  platformLabel: { marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 },
  platformValue: { color: "#334155", lineHeight: 20 },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
  },
  sectionCardPart: {
    borderColor: "#fdba74",
    borderLeftWidth: 4,
    borderLeftColor: ORANGE,
    backgroundColor: "#fffaf5",
  },
  sectionHeaderRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  sectionIndex: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  partBadge: {
    backgroundColor: NAVY,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 2,
  },
  sectionTitle: { flex: 1, color: NAVY, lineHeight: 22 },
  sectionTitlePart: { fontSize: 16 },
  paragraph: { color: "#475569", lineHeight: 22, marginBottom: 10 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8 },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ORANGE,
    marginTop: 8,
  },
  bulletText: { flex: 1, color: "#475569", lineHeight: 22 },
  footerNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#fff7ed",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#fed7aa",
    marginTop: 4,
  },
  footerNoteText: { flex: 1, color: "#64748b", lineHeight: 18 },
});
