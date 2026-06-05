import React, { useMemo } from "react";
import {
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
  const maxWidth = isWide ? 900 : undefined;

  const docKind = useMemo(
    () => (document.title.toLowerCase().includes("privacy") ? "privacy" : "terms"),
    [document.title]
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <LinearGradient colors={[NAVY, "#243b6e"]} style={styles.hero}>
        <View style={[styles.heroInner, maxWidth && { maxWidth, alignSelf: "center", width: "100%" }]}>
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

          <AppText weight="bold" size="xl" color="#fff" style={styles.heroTitle}>
            {document.title}
          </AppText>
          <AppText size="sm" color="rgba(255,255,255,0.85)" style={styles.heroSub}>
            {document.subtitle}
          </AppText>
          <View style={styles.heroMetaRow}>
            <AppText size="xs" color="rgba(255,255,255,0.75)">
              Effective: {document.effectiveDate}
            </AppText>
            <AppText size="xs" color="rgba(255,255,255,0.75)">
              Updated: {document.lastUpdated}
            </AppText>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          maxWidth && { maxWidth, alignSelf: "center", width: "100%" },
        ]}
        showsVerticalScrollIndicator
      >
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff7ed" },
  hero: { paddingBottom: 20 },
  heroInner: { paddingHorizontal: 20, paddingTop: 8 },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
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
  heroTitle: { marginBottom: 6 },
  heroSub: { lineHeight: 20, marginBottom: 10 },
  heroMetaRow: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 14 },
  platformCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#fed7aa",
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
