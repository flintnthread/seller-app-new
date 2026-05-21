import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Platform,
  Text,
} from 'react-native';
import { AppText } from '@/components/AppText';
import { Colors, palette } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { fontSizes, fontFamilies } from '@/constants/fonts';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ProductDetails = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // For now, using mock data based on reference. In a real app, you'd fetch this by ID.
  const product = {
    name: "New AJRAKH Heavy marsh melon self JEQURD viewing saree",
    status: "Approved",
    category: "Ethnic Wear",
    price: "2,060.04",
    stock: "10",
    description: "Add elegance and cultural charm to your ethnic wardrobe with this beautifully crafted purple woven silk saree. Featuring rich zari work and vibrant traditional motifs, this saree is perfect for festive occasions, weddings, and special celebrations.",
    subcategory: "Sarees",
    hsnCode: "50072010",
    gst: "5.00%",
    created: "08 Feb, 2026 at 03:17 PM",
    adminNotes: "Product approved. Minor adjustments suggested for future listings (image clarity, description format, pricing alignment).",
    images: [
      "https://images.unsplash.com/photo-1610030469983-98e6f2494cce?w=800",
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800",
      "https://images.unsplash.com/photo-1610030469668-93510ec22f97?w=800",
      "https://images.unsplash.com/photo-1610030469915-03077f24dec6?w=800",
    ],
    variants: [
      { color: "Beige", size: "Free Size", sku: "SAR-BEFR-9841", stock: "2 units", mrp: "3,999.00", discount: "60.49%", sellingPrice: "1,580.00", gstAmount: "189.60", gstRate: "12%", spWithGst: "1,769.60", commission: "265.44", commissionRate: "15%", intraCity: "20.00", metroMetro: "25.00", totalIntra: "2,055.04", totalMetro: "2,060.04" },
      { color: "Brown", size: "Free Size", sku: "SAR-BRFR-4088", stock: "2 units", mrp: "3,999.00", discount: "60.49%", sellingPrice: "1,580.00", gstAmount: "189.60", gstRate: "12%", spWithGst: "1,769.60", commission: "265.44", commissionRate: "15%", intraCity: "20.00", metroMetro: "25.00", totalIntra: "2,055.04", totalMetro: "2,060.04" },
      { color: "Magenta", size: "Free Size", sku: "SAR-MAFR-5429", stock: "2 units", mrp: "3,999.00", discount: "60.49%", sellingPrice: "1,580.00", gstAmount: "189.60", gstRate: "12%", spWithGst: "1,769.60", commission: "265.44", commissionRate: "15%", intraCity: "20.00", metroMetro: "25.00", totalIntra: "2,055.04", totalMetro: "2,060.04" },
      { color: "Maroon", size: "Free Size", sku: "SAR-MAFR-9915", stock: "2 units", mrp: "3,999.00", discount: "60.49%", sellingPrice: "1,580.00", gstAmount: "189.60", gstRate: "12%", spWithGst: "1,769.60", commission: "265.44", commissionRate: "15%", intraCity: "20.00", metroMetro: "25.00", totalIntra: "2,055.04", totalMetro: "2,060.04" },
      { color: "Purple", size: "Free Size", sku: "SAR-PUFR-5206", stock: "2 units", mrp: "3,999.00", discount: "60.49%", sellingPrice: "1,580.00", gstAmount: "189.60", gstRate: "12%", spWithGst: "1,769.60", commission: "265.44", commissionRate: "15%", intraCity: "20.00", metroMetro: "25.00", totalIntra: "2,055.04", totalMetro: "2,060.04" },
    ],
    weight: "0.800 kg",
    intraCityCharge: "20.00",
    metroMetroCharge: "25.00",
    dimensions: { length: "20.00 cm", width: "20.00 cm", height: "15.00 cm" },
    fragile: "No",
    returnPolicy: "Products marked as final sale are not eligible for returns.",
    deliveryInfo: "Delivery Time: 5 - 10 days\nFree delivery for orders above ₹499",
    warranty: "No warranty for this product",
    careInstructions: "Hand Wash",
    fullDescription: "This stunning purple saree is made from premium-quality silk blend fabric and showcases intricate golden zari weaving along the borders and pallu. The colorful traditional motif panel adds a unique and artistic touch, enhancing the overall appeal.\n\nPaired with a matching unstitched blouse piece with rich brocade detailing, this saree reflects timeless beauty and traditional craftsmanship. Lightweight yet luxurious, it offers both comfort and sophistication",
  };

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeader}>
      <AppText weight="bold" color={isDark ? palette.white : Colors.light.text} style={styles.sectionTitle}>{title}</AppText>
      <View style={styles.sectionDivider} />
    </View>
  );

  const renderInfoRow = (label: string, value: string) => (
    <View style={styles.infoRow}>
      <AppText size="sm" color={Colors.light.textSecondary} style={styles.infoLabel}>{label}</AppText>
      <AppText size="sm" weight="semiBold" color={isDark ? Colors.dark.text : Colors.light.text} style={styles.infoValue}>{value}</AppText>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={isDark ? '#fff' : '#1e293b'} />
        </TouchableOpacity>
        <AppText size="lg" weight="bold" style={styles.headerTitle}>Product Details</AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Breadcrumbs Placeholder */}
        <View style={styles.breadcrumbs}>
          <AppText size="xs" color={Colors.light.textMuted} style={styles.breadcrumbText}>Dashboard</AppText>
          <Ionicons name="chevron-forward" size={12} color="#94a3b8" style={{ marginHorizontal: 4 }} />
          <AppText size="xs" color={Colors.light.textMuted} style={styles.breadcrumbText}>Products</AppText>
          <Ionicons name="chevron-forward" size={12} color="#94a3b8" style={{ marginHorizontal: 4 }} />
          <AppText size="xs" weight="bold" color={Colors.light.primary} style={styles.breadcrumbText}>Details</AppText>
        </View>

        {/* Title and Status */}
        <View style={styles.titleSection}>
          <AppText size="xxl" weight="bold" style={styles.productName}>{product.name}</AppText>
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <AppText size="xs" weight="bold" color={Colors.light.success} style={styles.statusText}>{product.status}</AppText>
          </View>
          <AppText color={Colors.light.textSecondary} style={styles.productCategory}>{product.category}</AppText>
        </View>

        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          <ScrollView 
            horizontal 
            snapToInterval={SCREEN_WIDTH}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.imageGallery}
          >
            {product.images.map((img, index) => (
              <Image 
                key={index} 
                source={{ uri: img }} 
                style={styles.galleryImage} 
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        </View>

        {/* Main Info */}
        <View style={styles.mainInfo}>
          <View style={styles.priceContainer}>
            <AppText weight="bold" color={Colors.light.primary} style={styles.currency}>₹</AppText>
            <AppText size="title" weight="bold" style={styles.priceValue}>{product.price}</AppText>
            <AppText size="xs" color={Colors.light.textMuted} style={styles.priceSubtext}>(Metro City Price)</AppText>
          </View>
          
          <View style={styles.stockBadge}>
            <AppText size="xs" color={Colors.light.textMuted} style={styles.stockLabel}>Total Stock:</AppText>
            <AppText weight="bold" style={styles.stockValue}>{product.stock} units available</AppText>
          </View>
        </View>

        {/* Description Section */}
        <View style={styles.card}>
          {renderSectionHeader("Description")}
          <AppText color={Colors.light.textSecondary} style={styles.descriptionText}>
            {product.description}
          </AppText>

          <View style={styles.metaGrid}>
            {renderInfoRow("Category:", product.category)}
            {renderInfoRow("Subcategory:", product.subcategory)}
            {renderInfoRow("HSN Code:", product.hsnCode)}
            {renderInfoRow("GST:", product.gst)}
            {renderInfoRow("Created:", product.created)}
          </View>
          
          <View style={styles.adminNotes}>
            <AppText size="sm" weight="bold" color={palette.warning} style={styles.adminNotesTitle}>Admin Notes:</AppText>
            <AppText size="xs" style={styles.adminNotesText}>{product.adminNotes}</AppText>
          </View>
        </View>

        {/* Product Variants - Table Style */}
        <View style={styles.card}>
          {renderSectionHeader(`Product Variants (${product.variants.length})`)}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.table}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                {['Color', 'Size', 'SKU', 'Stock', 'MRP', 'Disc.', 'Selling Price', 'GST', 'SP (GST)', 'Comm.', 'Total (M)'].map((h, i) => (
                  <View key={i} style={[styles.tableCell, { width: i === 6 || i === 8 ? 120 : 80 }]}>
                    <Text style={styles.tableHeaderText}>{h}</Text>
                  </View>
                ))}
              </View>
              {/* Table Body */}
              {product.variants.map((v, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowEven]}>
                  <View style={[styles.tableCell, { width: 80 }]}><AppText size="xs" style={styles.tableCellText}>{v.color}</AppText></View>
                  <View style={[styles.tableCell, { width: 80 }]}><AppText size="xs" style={styles.tableCellText}>{v.size}</AppText></View>
                  <View style={[styles.tableCell, { width: 80 }]}><AppText size="xs" style={styles.tableCellText}>{v.sku}</AppText></View>
                  <View style={[styles.tableCell, { width: 80 }]}><AppText size="xs" style={styles.tableCellText}>{v.stock}</AppText></View>
                  <View style={[styles.tableCell, { width: 80 }]}><AppText size="xs" style={styles.tableCellText}>₹{v.mrp}</AppText></View>
                  <View style={[styles.tableCell, { width: 80 }]}><AppText size="xs" color={Colors.light.error} style={styles.tableCellText}>{v.discount}</AppText></View>
                  <View style={[styles.tableCell, { width: 120 }]}><AppText size="xs" style={styles.tableCellText}>₹{v.sellingPrice}</AppText></View>
                  <View style={[styles.tableCell, { width: 80 }]}><AppText size="xs" style={styles.tableCellText}>{v.gstRate}</AppText></View>
                  <View style={[styles.tableCell, { width: 120 }]}><AppText size="xs" style={styles.tableCellText}>₹{v.spWithGst}</AppText></View>
                  <View style={[styles.tableCell, { width: 80 }]}><AppText size="xs" style={styles.tableCellText}>{v.commissionRate}</AppText></View>
                  <View style={[styles.tableCell, { width: 80 }]}><AppText size="xs" weight="bold" color={Colors.light.primary} style={styles.tableCellText}>₹{v.totalMetro}</AppText></View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Delivery & Weight */}
        <View style={styles.row}>
          <View style={[styles.card, { flex: 1, marginRight: 8 }]}>
            {renderSectionHeader("Weight & Delivery")}
            {renderInfoRow("Weight", product.weight)}
            {renderInfoRow("Intra-City", `₹${product.intraCityCharge}`)}
            {renderInfoRow("Metro-Metro", `₹${product.metroMetroCharge}`)}
          </View>
          <View style={[styles.card, { flex: 1, marginLeft: 8 }]}>
            {renderSectionHeader("Dimensions")}
            {renderInfoRow("Length", product.dimensions.length)}
            {renderInfoRow("Width", product.dimensions.width)}
            {renderInfoRow("Height", product.dimensions.height)}
            {renderInfoRow("Fragile", product.fragile)}
          </View>
        </View>

        {/* Policies */}
        <View style={styles.card}>
          {renderSectionHeader("Policies & Info")}
          <View style={styles.policyRow}>
            <Ionicons name="refresh-circle-outline" size={20} color={Colors.light.primary} />
            <View style={styles.policyContent}>
              <AppText weight="bold" style={styles.policyTitle}>Return Policy</AppText>
              <AppText size="sm" color={Colors.light.textSecondary} style={styles.policyText}>{product.returnPolicy}</AppText>
            </View>
          </View>
          <View style={styles.policyRow}>
            <Ionicons name="time-outline" size={20} color={Colors.light.primary} />
            <View style={styles.policyContent}>
              <AppText weight="bold" style={styles.policyTitle}>Delivery Information</AppText>
              <AppText size="sm" color={Colors.light.textSecondary} style={styles.policyText}>{product.deliveryInfo}</AppText>
            </View>
          </View>
          <View style={styles.policyRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color={Colors.light.primary} />
            <View style={styles.policyContent}>
              <AppText weight="bold" style={styles.policyTitle}>Warranty</AppText>
              <AppText size="sm" color={Colors.light.textSecondary} style={styles.policyText}>{product.warranty}</AppText>
            </View>
          </View>
          <View style={styles.policyRow}>
            <Ionicons name="color-palette-outline" size={20} color={Colors.light.primary} />
            <View style={styles.policyContent}>
              <AppText weight="bold" style={styles.policyTitle}>Care Instructions</AppText>
              <AppText size="sm" color={Colors.light.textSecondary} style={styles.policyText}>{product.careInstructions}</AppText>
            </View>
          </View>
        </View>

        {/* Full Description */}
        <View style={styles.card}>
          {renderSectionHeader("Full Description")}
          <AppText color={Colors.light.textSecondary} style={styles.descriptionText}>
            {product.fullDescription}
          </AppText>
        </View>

        {/* Specifications */}
        <View style={styles.card}>
          {renderSectionHeader("Specifications")}
          <View style={styles.specGrid}>
            {renderInfoRow("Fabric", "Silk Blend")}
            {renderInfoRow("Pattern", "AJRAKH Heavy")}
            {renderInfoRow("Occasion", "Festive, Wedding")}
            {renderInfoRow("Work", "Zari Weaving")}
          </View>
        </View>


        {/* Footer */}
        <View style={styles.footer}>
          <AppText size="xs" color={Colors.light.textMuted} style={styles.footerText}>2026 © Flintnthread (India) Privated Limited.</AppText>
          <AppText size="xs" weight="bold" color={Colors.light.primary} style={styles.footerSubtext}>Crafted by Flintnthread</AppText>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  containerDark: {
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.bold,
  },
  breadcrumbText: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.medium,
  },
  productName: {
    fontSize: fontSizes.xxl,
    fontFamily: fontFamilies.bold,
    marginBottom: spacing.xs,
  },
  statusText: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.semiBold,
  },
  productCategory: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.medium,
  },
  currency: {
    fontSize: fontSizes.lg,
    fontFamily: fontFamilies.bold,
  },
  priceValue: {
    fontSize: fontSizes.title,
    fontFamily: fontFamilies.bold,
  },
  priceSubtext: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.regular,
  },
  stockLabel: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.regular,
  },
  stockValue: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.bold,
  },
  sectionTitle: {
    fontSize: fontSizes.md,
    fontFamily: fontFamilies.bold,
  },
  descriptionText: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.regular,
    lineHeight: 22,
  },
  infoLabel: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.regular,
  },
  infoValue: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.semiBold,
  },
  adminNotesTitle: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.bold,
  },
  adminNotesText: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.regular,
    fontStyle: 'italic',
  },
  tableHeaderText: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.bold,
  },
  tableCellText: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.regular,
  },
  policyTitle: {
    fontSize: fontSizes.sm,
    fontFamily: fontFamilies.bold,
  },
  policyText: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.regular,
    lineHeight: 18,
  },
  footerText: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.regular,
  },
  footerSubtext: {
    fontSize: fontSizes.xs,
    fontFamily: fontFamilies.bold,
  },
  backButton: { padding: 8 },
  breadcrumbs: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  titleSection: { paddingHorizontal: 16, marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.light.success, marginRight: 6 },
  imageContainer: { height: 300, backgroundColor: '#fff', marginBottom: 16 },
  imageGallery: { alignItems: 'center' },
  galleryImage: { width: SCREEN_WIDTH, height: 300 },
  mainInfo: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline' },
  stockBadge: { alignItems: 'flex-end' },
  card: { backgroundColor: '#fff', padding: 16, marginHorizontal: 16, marginBottom: 16, borderRadius: 12 },
  sectionDivider: { height: 1, backgroundColor: '#e2e8f0', marginTop: 12 },
  metaGrid: { marginTop: 16, gap: 8 },
  adminNotes: { marginTop: 16, padding: 12, backgroundColor: '#fef3c7', borderRadius: 8 },
  table: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableCell: { paddingHorizontal: 12, justifyContent: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  tableRowEven: { backgroundColor: '#f8fafc' },
  row: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  policyRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  policyContent: { marginLeft: 12, flex: 1 },
  specGrid: { gap: 8 },
  footer: { alignItems: 'center', padding: 24, paddingBottom: 40 },
  sectionHeader: { marginBottom: 12 },
});


export default ProductDetails;
