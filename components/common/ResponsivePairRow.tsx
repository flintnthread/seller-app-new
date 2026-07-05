import React from "react";
import { View, StyleSheet } from "react-native";
import { useResponsive } from "@/hooks/useResponsive";

type PairRowProps = {
  children: React.ReactNode;
  gap?: number;
};

/** Side-by-side children on web >= 600px; stacked otherwise. */
export function ResponsivePairRow({ children, gap = 10 }: PairRowProps) {
  const { isWebWide } = useResponsive();
  if (!isWebWide) return <>{children}</>;
  return <View style={[styles.row, { gap }]}>{children}</View>;
}

/** Pairs children into two-column rows on web >= 600px. */
export function ResponsiveTwoColGrid({ children }: { children: React.ReactNode }) {
  const { isWebWide } = useResponsive();
  const childArray = React.Children.toArray(children);

  if (!isWebWide) return <>{childArray}</>;

  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < childArray.length; i += 2) {
    rows.push(childArray.slice(i, i + 2));
  }

  return (
    <>
      {rows.map((pair, rowIdx) => (
        <View key={rowIdx} style={styles.gridRow}>
          <View style={styles.gridCol}>{pair[0]}</View>
          {pair[1] ? <View style={styles.gridCol}>{pair[1]}</View> : <View style={styles.gridCol} />}
        </View>
      ))}
    </>
  );
}

/** Hook for column flex in pair rows. */
export function useWebWideColumnStyle() {
  const { isWebWide } = useResponsive();
  return isWebWide ? ({ flex: 1, minWidth: 0 } as const) : undefined;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  gridRow: {
    flexDirection: "row",
    gap: 16,
  },
  gridCol: {
    flex: 1,
    minWidth: 0,
  },
});
