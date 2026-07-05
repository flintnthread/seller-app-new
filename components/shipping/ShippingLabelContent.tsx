import React from "react";
import { Image, ScrollView, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";

import type { ShippingLabelData } from "@/lib/shipping/shippingLabelData";
import { formatInr } from "@/lib/shipping/shippingLabelData";

const TABLE_MIN_WIDTH = 520;

function normalizeSvg(svg: string): string {
  return svg.replace(/<\?xml[^?]*\?>\s*/i, "").trim();
}

function SvgCode({ svg, width, height }: { svg: string; width: number; height: number }) {
  return <SvgXml xml={normalizeSvg(svg)} width={width} height={height} />;
}

type Props = {
  label: ShippingLabelData;
  styles: LabelStyles;
};

export type LabelStyles = {
  labelCard: object;
  labelTopHeader: object;
  logoImage: object;
  section: object;
  sectionTitle: object;
  shipToName: object;
  shipToAddress: object;
  shipToPinLabel: object;
  shipToPin: object;
  divider: object;
  metaSection: object;
  metaGrid: object;
  metaGridRow: object;
  metaKey: object;
  metaVal: object;
  tableHeader: object;
  th: object;
  tableRow: object;
  td: object;
  tdName: object;
  tdVariant: object;
  tdOrange: object;
  tdBold: object;
  tableTotalsRow: object;
  returnSection: object;
  returnInner: object;
  returnBiz: object;
  returnAddr: object;
  footer: object;
  footerGst: object;
  footerNote: object;
  footerPowered: object;
  shippingStrip: object;
  orangeBand: object;
  orangeBandText: object;
  courierRow: object;
  courierName: object;
  gstPill: object;
  gstText: object;
  barcodeSection: object;
  barcodeLeft: object;
  awbLabel: object;
  awbNumber: object;
  qrWrap: object;
};

function LabelCarrierStrip({ label, s }: { label: ShippingLabelData; s: LabelStyles }) {
  const courierLabel =
    label.courier && label.courier !== "—" && label.courier.toLowerCase() !== "courier"
      ? label.courier
      : "Courier";

  return (
    <View style={s.shippingStrip}>
      <View style={s.orangeBand}>
        <Text style={s.orangeBandText}>SHIPPING LABEL FOR FLINT & THREAD</Text>
      </View>
      <View style={s.courierRow}>
        <Text style={s.courierName}>{courierLabel}</Text>
        <View style={s.gstPill}>
          <Text style={s.gstText}>GST: {label.gstNumber}</Text>
        </View>
      </View>
      <View style={s.barcodeSection}>
        <View style={s.barcodeLeft}>
          <Text style={s.awbLabel}>AWB NUMBER</Text>
          <SvgCode svg={label.barcodeSvg} width={280} height={48} />
          <Text style={s.awbNumber}>{label.awb}</Text>
        </View>
        <View style={s.qrWrap}>
          <SvgCode svg={label.qrSvg} width={72} height={72} />
        </View>
      </View>
    </View>
  );
}

/** Logo → carrier strip → ship-to + details (matches PDF header) */
export function ShippingLabelContent({ label, styles: s }: Props) {
  return (
    <View style={s.labelCard}>
      <View style={s.labelTopHeader}>
        <Image
          source={require("../../assets/images/logo.jpg")}
          style={s.logoImage}
          resizeMode="contain"
        />
      </View>

      <LabelCarrierStrip label={label} s={s} />

      <View style={s.divider} />

      <View style={s.section}>
        <Text style={s.sectionTitle}>SHIP TO</Text>
        <Text style={s.shipToName}>{label.shipToName}</Text>
        <Text style={s.shipToAddress}>{label.shipToAddress}</Text>
        <Text style={s.shipToPinLabel}>
          PIN: <Text style={s.shipToPin}>{label.shipToPin}</Text>
        </Text>
        <View style={[s.metaSection, { paddingHorizontal: 0, paddingTop: 8, paddingBottom: 0 }]}>
          <View style={s.metaGrid}>
            {[
              { k: "Order #:", v: label.orderId },
              { k: "Invoice:", v: label.invoiceNo },
              { k: "Date:", v: label.orderDate },
              { k: "Payment:", v: label.paymentLine },
              { k: "Weight:", v: label.weight },
            ].map((row) => (
              <View key={row.k} style={s.metaGridRow}>
                <Text style={s.metaKey}>{row.k}</Text>
                <Text style={s.metaVal}>{row.v}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      <View style={s.divider} />

      <View style={s.section}>
        <Text style={s.sectionTitle}>PRODUCT DETAILS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ minWidth: TABLE_MIN_WIDTH }}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { width: 130 }]}>Item</Text>
              <Text style={[s.th, { width: 44, textAlign: "center" }]}>HSN</Text>
              <Text style={[s.th, { width: 24, textAlign: "center" }]}>Q</Text>
              <Text style={[s.th, { width: 58, textAlign: "right" }]}>Price</Text>
              <Text style={[s.th, { width: 54, textAlign: "right" }]}>CGST</Text>
              <Text style={[s.th, { width: 54, textAlign: "right" }]}>SGST</Text>
              <Text style={[s.th, { width: 48, textAlign: "right" }]}>IGST</Text>
              <Text style={[s.th, { width: 58, textAlign: "right" }]}>Total</Text>
            </View>
            {label.items.map((item, i) => (
              <View key={i} style={s.tableRow}>
                <View style={{ width: 130 }}>
                  <Text style={s.tdName}>{item.name}</Text>
                  {item.variant ? <Text style={s.tdVariant}>{item.variant}</Text> : null}
                </View>
                <Text style={[s.td, { width: 44, textAlign: "center" }]}>{item.hsn}</Text>
                <Text style={[s.td, { width: 24, textAlign: "center" }]}>{item.qty}</Text>
                <Text style={[s.td, { width: 58, textAlign: "right" }]}>{formatInr(item.basePrice)}</Text>
                <View style={{ width: 54, alignItems: "flex-end" }}>
                  <Text style={[s.td, { textAlign: "right" }]}>{item.cgstPct}</Text>
                  <Text style={[s.td, { textAlign: "right" }]}>
                    {item.cgstAmt > 0 ? formatInr(item.cgstAmt) : "—"}
                  </Text>
                </View>
                <View style={{ width: 54, alignItems: "flex-end" }}>
                  <Text style={[s.td, { textAlign: "right" }]}>{item.sgstPct}</Text>
                  <Text style={[s.td, { textAlign: "right" }]}>
                    {item.sgstAmt > 0 ? formatInr(item.sgstAmt) : "—"}
                  </Text>
                </View>
                <Text style={[s.tdOrange, { width: 48, textAlign: "right" }]}>
                  {item.igstAmt > 0 ? formatInr(item.igstAmt) : "—"}
                </Text>
                <Text style={[s.tdBold, { width: 58, textAlign: "right" }]}>{formatInr(item.lineTotal)}</Text>
              </View>
            ))}
            <View style={s.tableTotalsRow}>
              <Text style={[s.tdBold, { width: 256 }]}>TOTAL:</Text>
              <Text style={[s.td, { width: 54, textAlign: "right" }]}>{formatInr(label.totalCgst)}</Text>
              <Text style={[s.td, { width: 54, textAlign: "right" }]}>{formatInr(label.totalSgst)}</Text>
              <Text style={[s.tdOrange, { width: 48, textAlign: "right" }]}>{formatInr(label.totalIgst)}</Text>
              <Text style={[s.tdBold, { width: 58, textAlign: "right" }]}>{formatInr(label.grandTotal)}</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      <View style={s.divider} />

      <View style={s.returnSection}>
        <Text style={s.sectionTitle}>RETURN ADDRESS</Text>
        <View style={s.returnInner}>
          <Text style={s.returnBiz}>{label.returnBusinessName}</Text>
          <View style={s.gstPill}>
            <Text style={s.gstText}>GST: {label.gstNumber}</Text>
          </View>
        </View>
        <Text style={s.returnAddr}>
          {label.returnAddressLine} | Ph: {label.returnPhone}
        </Text>
      </View>

      <View style={s.footer}>
        <Text style={s.footerGst}>{label.taxSummaryLine}</Text>
        <Text style={s.footerNote}>AUTO-GENERATED LABEL — NO SIGNATURE REQUIRED</Text>
        <Text style={s.footerPowered}>Powered By: Flint & Thread</Text>
      </View>
    </View>
  );
}
