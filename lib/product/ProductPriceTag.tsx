import React from "react";
import { View, Text, StyleSheet, type TextStyle, type ViewStyle } from "react-native";

type Props = {
    price: number;
    mrpInclGst?: number;
    priceStyle?: TextStyle;
    mrpStyle?: TextStyle;
    containerStyle?: ViewStyle;
};

function formatAmount(value: number): string {
    return `₹${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function ProductPriceTag({
    price,
    mrpInclGst = 0,
    priceStyle,
    mrpStyle,
    containerStyle,
}: Props) {
    const showMrp = mrpInclGst > 0 && mrpInclGst > price;
    return (
        <View style={[styles.row, containerStyle]}>
            <Text style={[styles.price, priceStyle]}>{formatAmount(price)}</Text>
            {showMrp ? (
                <Text style={[styles.mrp, mrpStyle]}>{formatAmount(mrpInclGst)}</Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    row: { flexDirection: "row", alignItems: "baseline", gap: 6, flexWrap: "wrap" },
    price: { fontFamily: "Outfit_700Bold", fontSize: 14, color: "#1A2B6D" },
    mrp: {
        fontFamily: "Outfit_500Medium",
        fontSize: 12,
        color: "#9CA3AF",
        textDecorationLine: "line-through",
    },
});
