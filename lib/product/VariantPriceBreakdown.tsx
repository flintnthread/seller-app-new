import React from "react";
import { View, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppText } from "@/components/AppText";
import { fontFamilies } from "@/constants/fonts";
import {
    COMMISSION_PERCENT,
    formatInr,
    type DeliveryChargeInfo,
    type VariantPricingResult,
} from "@/lib/product/variantPricing";

function round2(value: number): number {
    return Math.round(value * 100) / 100;
}

const C = {
    navyLight: "#3D52A0",
    border: "#E8EBF4",
    textDark: "#0D1340",
    textMid: "#4B5680",
    textLight: "#9AA3C2",
    white: "#FFFFFF",
    red: "#E53E3E",
    green: "#2ECC71",
    greenText: "#1A9B52",
    orange: "#C47D0E",
    bg: "#F8F9FD",
};

type Props = {
    pricing: VariantPricingResult | null;
    delivery: DeliveryChargeInfo;
    hasWeight?: boolean;
    commissionPercent?: number;
};

function BreakdownRow({
    label,
    value,
    valueColor,
    bold,
    prefix,
}: {
    label: string;
    value: string;
    valueColor?: string;
    bold?: boolean;
    prefix?: string;
}) {
    return (
        <View style={pb.row}>
            <AppText style={[pb.rowLabel, bold && pb.rowLabelBold]}>{label}</AppText>
            <AppText style={[pb.rowValue, bold && pb.rowValueBold, valueColor ? { color: valueColor } : null]}>
                {prefix}{value}
            </AppText>
        </View>
    );
}

export function VariantPriceBreakdown({ pricing, delivery, hasWeight = true, commissionPercent }: Props) {
    if (!pricing) return null;

    const gstLabel = `GST (${pricing.gstPercent.toFixed(2)}%)`;
    const discountLabel = `Discount (${pricing.discountPercentage.toFixed(2)}%)`;
    const commissionPct = commissionPercent ?? COMMISSION_PERCENT;
    const showCommission = commissionPct > 0 && pricing.commissionAmount > 0;
    const subtotalWithGstAndCommission = round2(pricing.finalPrice + (showCommission ? pricing.commissionAmount : 0));
    const intraCharge = delivery.custom ? 0 : (pricing.intraCityCharge ?? delivery.intraCity);
    const metroCharge = delivery.custom ? 0 : (pricing.metroMetroCharge ?? delivery.metroMetro);
    const totalIntraCity = delivery.custom
        ? 0
        : (pricing.totalIntraCity ?? round2(subtotalWithGstAndCommission + intraCharge));
    const totalMetroMetro = delivery.custom
        ? 0
        : (pricing.totalMetroMetro ?? round2(subtotalWithGstAndCommission + metroCharge));

    return (
        <View style={pb.wrap}>
            <View style={pb.header}>
                <MaterialCommunityIcons name="calculator-variant-outline" size={16} color={C.navyLight} />
                <AppText style={pb.title}>Price Breakdown</AppText>
            </View>

            <View style={pb.card}>
                <BreakdownRow label="MRP (Excl. GST)" value={formatInr(pricing.mrpExcl)} />
                <BreakdownRow
                    label={discountLabel}
                    value={formatInr(pricing.discountAmount)}
                    valueColor={C.red}
                    prefix="- "
                />
                <BreakdownRow label="Selling Price (Excl. GST)" value={formatInr(pricing.sellingExcl)} />
                <BreakdownRow
                    label={gstLabel}
                    value={formatInr(pricing.taxAmount)}
                    valueColor={C.orange}
                    prefix="+ "
                />
                <View style={pb.divider} />
                <BreakdownRow
                    label="Selling Price (With GST)"
                    value={formatInr(pricing.finalPrice)}
                    valueColor={C.green}
                    bold
                />
                {showCommission ? (
                    <>
                        <BreakdownRow
                            label={`Commission (${commissionPct.toFixed(2)}% of SP w/ GST)`}
                            value={formatInr(pricing.commissionAmount)}
                            valueColor={C.orange}
                            prefix="+ "
                        />
                        <View style={pb.divider} />
                        <BreakdownRow
                            label="Selling Price (With GST) + Commission = Total"
                            value={formatInr(subtotalWithGstAndCommission)}
                            valueColor={C.navyLight}
                            bold
                        />
                    </>
                ) : null}
                <View style={pb.dividerDashed} />
                <BreakdownRow
                    label="MRP (With GST)"
                    value={formatInr(pricing.mrpInclGst)}
                    valueColor={C.orange}
                    bold
                />
            </View>

            <View style={pb.sectionDivider} />

            {delivery.custom ? (
                <View style={pb.customNote}>
                    <MaterialCommunityIcons name="information-outline" size={14} color={C.textMid} />
                    <AppText style={pb.customNoteTxt}>
                        Custom delivery pricing applies for this weight slab.
                    </AppText>
                </View>
            ) : (
                <>
                    <View style={[pb.header, { marginTop: 14 }]}>
                        <MaterialCommunityIcons name="truck-delivery-outline" size={16} color={C.orange} />
                        <AppText style={[pb.title, { color: C.orange }]}>Delivery Charges</AppText>
                    </View>
                    <View style={pb.deliveryRow}>
                        <View style={[pb.deliveryCard, pb.deliveryCardOrange]}>
                            <AppText style={pb.deliveryLabel}>Intra-City</AppText>
                            <AppText style={pb.deliveryValueOrange}>{formatInr(intraCharge)}</AppText>
                        </View>
                        <View style={[pb.deliveryCard, pb.deliveryCardGrey]}>
                            <AppText style={pb.deliveryLabel}>Metro-Metro</AppText>
                            <AppText style={pb.deliveryValueMetro}>{formatInr(metroCharge)}</AppText>
                        </View>
                    </View>
                    <View style={pb.deliveryHint}>
                        <MaterialCommunityIcons name="information-outline" size={12} color={C.textLight} />
                        <AppText style={pb.deliveryHintTxt}>
                            {hasWeight
                                ? "Delivery charges vary by location"
                                : "Enter product weight in Basic Info for accurate delivery charges"}
                        </AppText>
                    </View>

                    <View style={pb.totalsRow}>
                        <View style={[pb.totalCard, pb.totalCardGreen]}>
                            <AppText style={pb.totalLabelGreen}>Total (Intra-City)</AppText>
                            <AppText style={pb.totalValueGreen}>{formatInr(totalIntraCity)}</AppText>
                        </View>
                        <View style={[pb.totalCard, pb.totalCardOrange]}>
                            <AppText style={pb.totalLabelOrange}>Total (Metro)</AppText>
                            <AppText style={pb.totalValueOrange}>{formatInr(totalMetroMetro)}</AppText>
                        </View>
                    </View>
                </>
            )}
        </View>
    );
}

const pb = StyleSheet.create({
    wrap: { marginTop: 12 },
    header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
    title: { fontFamily: fontFamilies.bold, fontSize: 13, color: C.navyLight },
    card: {
        backgroundColor: C.bg,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: C.border,
        gap: 8,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    rowLabel: { fontFamily: fontFamilies.regular, fontSize: 12, color: C.textMid, flex: 1 },
    rowLabelBold: { fontFamily: fontFamilies.semiBold, color: C.textDark },
    rowValue: { fontFamily: fontFamilies.medium, fontSize: 12, color: C.textDark },
    rowValueBold: { fontFamily: fontFamilies.bold, fontSize: 13 },
    divider: { height: 1, backgroundColor: C.border, marginVertical: 4 },
    dividerDashed: {
        height: 1,
        borderStyle: "dashed",
        borderTopWidth: 1,
        borderColor: C.border,
        marginVertical: 4,
    },
    sectionDivider: {
        height: 1,
        backgroundColor: C.border,
        marginTop: 14,
        marginBottom: 4,
    },
    customNote: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 10,
        padding: 10,
        backgroundColor: C.bg,
        borderRadius: 10,
    },
    customNoteTxt: { fontFamily: fontFamilies.regular, fontSize: 11, color: C.textMid, flex: 1 },
    deliveryRow: { flexDirection: "row", gap: 10 },
    deliveryCard: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 12,
        alignItems: "center",
        borderWidth: 1,
    },
    deliveryCardOrange: { backgroundColor: "#FFF7ED", borderColor: "#FDBA74" },
    deliveryCardGrey: { backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" },
    deliveryLabel: { fontFamily: fontFamilies.semiBold, fontSize: 12, color: C.textMid, marginBottom: 6 },
    deliveryValueOrange: { fontFamily: fontFamilies.bold, fontSize: 16, color: C.orange },
    deliveryValueMetro: { fontFamily: fontFamilies.bold, fontSize: 16, color: "#92400E" },
    deliveryHint: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, marginBottom: 12 },
    deliveryHintTxt: { fontFamily: fontFamilies.regular, fontSize: 10, color: C.textLight },
    totalsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
    totalCard: { flex: 1, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 12, borderWidth: 1.5, alignItems: "center" },
    totalCardGreen: { backgroundColor: "#F0FDF4", borderColor: C.green },
    totalCardOrange: { backgroundColor: "#FFFBEB", borderColor: C.orange },
    totalLabelGreen: { fontFamily: fontFamilies.semiBold, fontSize: 11, color: C.greenText, marginBottom: 6 },
    totalLabelOrange: { fontFamily: fontFamilies.semiBold, fontSize: 11, color: C.orange, marginBottom: 6 },
    totalValueGreen: { fontFamily: fontFamilies.bold, fontSize: 17, color: C.greenText },
    totalValueOrange: { fontFamily: fontFamilies.bold, fontSize: 17, color: C.orange },
});
