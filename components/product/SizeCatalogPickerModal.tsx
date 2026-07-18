import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useResponsive } from "@/hooks/useResponsive";
import {
  SIZE_CATALOG_ALL,
  buildSizeOptionGroups,
  formatSizeOptionLabel,
  type SizeCatalogFilterId,
} from "@/lib/sizeCatalogGroups";

const NAVY = "#1B2559";
const ORANGE = "#F28520";
const BORDER = "#E5E7EB";
const BG = "#F7F8FC";
const TEXT_MID = "#6B7280";
const TEXT_DARK = "#111827";
const NAVY_GHOST = "rgba(27,37,89,0.06)";

type SizeRow = { name: string; code: string };

type Props = {
  visible: boolean;
  title?: string;
  sizes: SizeRow[];
  /** Precomputed labels; if omitted, built from sizes */
  options?: string[];
  selected: string;
  onSelect: (label: string) => void;
  onClose: () => void;
};

export function SizeCatalogPickerModal({
  visible,
  title = "Select Size",
  sizes,
  options,
  selected,
  onSelect,
  onClose,
}: Props) {
  const { isDesktop } = useResponsive();
  const groups = useMemo(() => buildSizeOptionGroups(sizes), [sizes]);
  const allOptions = useMemo(() => {
    if (options?.length) return options;
    return groups.flatMap((g) => g.options);
  }, [options, groups]);

  const [filter, setFilter] = useState<SizeCatalogFilterId>(SIZE_CATALOG_ALL);

  useEffect(() => {
    if (!visible) return;
    // Prefer the group that contains the current selection
    if (selected) {
      const match = groups.find((g) =>
        g.options.some((o) => o === selected || o.startsWith(selected + " ("))
      );
      if (match) {
        setFilter(match.id);
        return;
      }
    }
    setFilter(SIZE_CATALOG_ALL);
  }, [visible, selected, groups]);

  const visibleOptions = useMemo(() => {
    if (filter === SIZE_CATALOG_ALL) return allOptions;
    return groups.find((g) => g.id === filter)?.options ?? [];
  }, [filter, allOptions, groups]);

  const totalAll = allOptions.length;

  return (
    <Modal visible={visible} transparent animationType={isDesktop ? "fade" : "slide"} onRequestClose={onClose}>
      <View style={[styles.overlay, isDesktop && styles.overlayCenter]}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, isDesktop && styles.popup]}>
          {!isDesktop && <View style={styles.drag} />}
          <View style={styles.hdr}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={18} color={TEXT_MID} />
            </TouchableOpacity>
          </View>

          {groups.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsRow}
              style={styles.tabsScroll}
            >
              <TouchableOpacity
                style={[styles.tab, filter === SIZE_CATALOG_ALL && styles.tabActive]}
                onPress={() => setFilter(SIZE_CATALOG_ALL)}
              >
                <Text style={[styles.tabTxt, filter === SIZE_CATALOG_ALL && styles.tabTxtActive]}>
                  All ({totalAll})
                </Text>
              </TouchableOpacity>
              {groups.map((g) => {
                const active = filter === g.id;
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[styles.tab, active && styles.tabActive]}
                    onPress={() => setFilter(g.id)}
                  >
                    <Text style={[styles.tabTxt, active && styles.tabTxtActive]}>
                      {g.label} ({g.options.length})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            style={[isDesktop ? styles.listDesktop : undefined]}
            contentContainerStyle={styles.listContent}
          >
            {filter === SIZE_CATALOG_ALL
              ? groups.map((g) => (
                  <View key={g.id}>
                    <Text style={styles.sectionLabel}>{g.label}</Text>
                    {g.options.map((opt, index) => {
                      const isOn = selected === opt || selected === opt.split(" (")[0];
                      return (
                        <TouchableOpacity
                          key={`${g.id}-${index}-${opt}`}
                          style={[styles.item, isOn && styles.itemOn]}
                          onPress={() => {
                            onSelect(opt);
                            onClose();
                          }}
                        >
                          <Text style={[styles.itemTxt, isOn && styles.itemTxtOn]}>{opt}</Text>
                          {isOn ? (
                            <View style={styles.chk}>
                              <Ionicons name="checkmark" size={13} color="#fff" />
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))
              : visibleOptions.map((opt, index) => {
                  const isOn = selected === opt || selected === opt.split(" (")[0];
                  return (
                    <TouchableOpacity
                      key={`${filter}-${index}-${opt}`}
                      style={[styles.item, isOn && styles.itemOn]}
                      onPress={() => {
                        onSelect(opt);
                        onClose();
                      }}
                    >
                      <Text style={[styles.itemTxt, isOn && styles.itemTxtOn]}>{opt}</Text>
                      {isOn ? (
                        <View style={styles.chk}>
                          <Ionicons name="checkmark" size={13} color="#fff" />
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
            {visibleOptions.length === 0 && filter !== SIZE_CATALOG_ALL ? (
              <Text style={styles.empty}>No sizes in this category</Text>
            ) : null}
            {allOptions.length === 0 ? (
              <Text style={styles.empty}>No sizes in catalog</Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Inline menu body for Drop (web) — category tabs + grouped list */
export function SizeCatalogInlineMenu({
  sizes,
  selected,
  onSelect,
}: {
  sizes: SizeRow[];
  selected: string;
  onSelect: (label: string) => void;
}) {
  const groups = useMemo(() => buildSizeOptionGroups(sizes), [sizes]);
  const [filter, setFilter] = useState<SizeCatalogFilterId>(SIZE_CATALOG_ALL);
  const allCount = groups.reduce((n, g) => n + g.options.length, 0);

  const visibleGroups =
    filter === SIZE_CATALOG_ALL ? groups : groups.filter((g) => g.id === filter);

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.inlineTabsRow}
        nestedScrollEnabled
      >
        <TouchableOpacity
          style={[styles.tab, styles.tabSm, filter === SIZE_CATALOG_ALL && styles.tabActive]}
          onPress={() => setFilter(SIZE_CATALOG_ALL)}
        >
          <Text style={[styles.tabTxt, styles.tabTxtSm, filter === SIZE_CATALOG_ALL && styles.tabTxtActive]}>
            All ({allCount})
          </Text>
        </TouchableOpacity>
        {groups.map((g) => {
          const active = filter === g.id;
          return (
            <TouchableOpacity
              key={g.id}
              style={[styles.tab, styles.tabSm, active && styles.tabActive]}
              onPress={() => setFilter(g.id)}
            >
              <Text style={[styles.tabTxt, styles.tabTxtSm, active && styles.tabTxtActive]}>
                {g.label} ({g.options.length})
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {visibleGroups.map((g) => (
        <View key={g.id}>
          {filter === SIZE_CATALOG_ALL ? <Text style={styles.inlineSection}>{g.label}</Text> : null}
          {g.options.map((opt, idx) => {
            const isOn = selected === opt || selected === opt.split(" (")[0];
            return (
              <TouchableOpacity
                key={`${g.id}-${idx}-${opt}`}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  backgroundColor: isOn ? NAVY_GHOST : "transparent",
                }}
                onPress={() => onSelect(opt)}
              >
                <Text
                  style={{
                    fontFamily: isOn ? "Outfit_600SemiBold" : "Outfit_500Medium",
                    fontSize: 13.5,
                    color: isOn ? NAVY : TEXT_MID,
                  }}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      {allCount === 0 ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <Text style={{ fontSize: 13, color: TEXT_MID }}>No sizes available</Text>
        </View>
      ) : null}
    </View>
  );
}

export { formatSizeOptionLabel, buildSizeOptionGroups };

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(30,40,90,0.22)" },
  overlayCenter: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "rgba(10,20,60,0.35)",
  },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "75%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 24,
  },
  popup: {
    position: "relative",
    bottom: undefined,
    left: undefined,
    right: undefined,
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
    borderRadius: 20,
    paddingBottom: 12,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 32,
    elevation: 28,
    zIndex: 2,
    overflow: "hidden",
  },
  drag: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: BORDER,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 6,
  },
  hdr: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  title: { fontFamily: "Outfit_700Bold", fontSize: 15, color: TEXT_DARK },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
  },
  tabsScroll: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: BORDER },
  tabsRow: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  inlineTabsRow: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 6, gap: 6 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
  },
  tabSm: { paddingHorizontal: 10, paddingVertical: 5 },
  tabActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  tabTxt: { fontFamily: "Outfit_500Medium", fontSize: 12, color: TEXT_MID },
  tabTxtSm: { fontSize: 11 },
  tabTxtActive: { fontFamily: "Outfit_600SemiBold", color: "#fff" },
  listDesktop: { maxHeight: 320 },
  listContent: { paddingBottom: 12 },
  sectionLabel: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 11,
    color: TEXT_MID,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  inlineSection: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 10,
    color: TEXT_MID,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 2,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  itemOn: { backgroundColor: NAVY_GHOST },
  itemTxt: { fontFamily: "Outfit_500Medium", fontSize: 14, color: TEXT_MID },
  itemTxtOn: { fontFamily: "Outfit_600SemiBold", color: NAVY },
  chk: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    fontFamily: "Outfit_500Medium",
    fontSize: 13,
    color: TEXT_MID,
    textAlign: "center",
    paddingVertical: 24,
  },
});
