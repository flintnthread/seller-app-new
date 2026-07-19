import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
  Share,
  ActivityIndicator,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useNavigation } from "@react-navigation/native";
import { bulkImportProducts } from "@/services/productApi";
import { useResponsive } from "@/hooks/useResponsive";

interface ToastState {
  visible: boolean;
  message: string;
  type: "success" | "error";
}

const T = {
  navy: "#0F1F4B",
  navyMid: "#1A2F6A",
  navyLight: "#243580",
  orange: "#F97316",
  orangePale: "#FFF4EC",
  orangeSoft: "#FDE8D4",
  white: "#FFFFFF",
  bg: "#F4F6FB",
  cardBg: "#FFFFFF",
  border: "#DDE3F0",
  textDark: "#0A1533",
  textMid: "#3A4A72",
  textSoft: "#6B7A9E",
  textLight: "#9BA8C5",
  success: "#16A34A",
  error: "#DC2626",
};

const CSV_CONTENT = [
  "Product Handle,Title,Description,Price,Compare At Price,SKU,Barcode,Inventory,Weight,Weight Unit,Option1 Name,Option1 Value,Option2 Name,Option2 Value,Image Filename,Tags,Vendor,Product Type,Status",
  'sample-product,Sample Product,A sample product description,29.99,34.99,SKU-001,123456789,100,0.5,kg,Size,M,Color,Blue,product-image.jpg,"tag1,tag2",My Brand,Apparel,active',
  'sample-product,Sample Product,A sample product description,29.99,34.99,SKU-002,123456790,80,0.5,kg,Size,L,Color,Blue,product-image.jpg,"tag1,tag2",My Brand,Apparel,active',
  'another-product,Another Product,Another product description,49.99,,SKU-003,,50,1.2,kg,,,,,another-image.jpg,tag3,My Brand,Accessories,active',
].join("\n");

const README_CONTENT = `BULK UPLOAD TEMPLATE
====================

FOLDER STRUCTURE:
  template/
  ├── products.csv       ← Fill in your product data here
  └── images/            ← Place all product images here
      ├── product-image.jpg
      └── another-image.jpg

INSTRUCTIONS:
1. Fill out products.csv with your product data
2. Use the same Product Handle for product variants
3. Place all images in the images/ folder
4. Zip the entire template/ folder
5. Upload the .zip file on the import page

COLUMNS:
- Product Handle: Unique identifier. Same handle = variants of same product
- Title: Product name
- Description: Product description
- Price: Selling price (numeric)
- Compare At Price: Original price for sale display (optional)
- SKU: Stock keeping unit
- Barcode: EAN/UPC barcode (optional)
- Inventory: Stock quantity
- Weight: Product weight
- Weight Unit: kg or lb
- Option1/2 Name: Variant attribute name (e.g. Size, Color)
- Option1/2 Value: Variant attribute value (e.g. M, Blue)
- Image Filename: Name of image file in images/ folder
- Tags: Comma-separated tags (wrap in quotes)
- Vendor: Brand/supplier name
- Product Type: Category
- Status: active or draft`;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  if (Platform.OS === "web") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function Code({ children }: { children: string }) {
  return <Text style={codeStyles.text}>{children}</Text>;
}

const codeStyles = StyleSheet.create({
  text: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    color: T.orange,
    backgroundColor: T.orangePale,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    fontWeight: "600",
  },
});

interface StepCardProps {
  number: number;
  title: string;
  description: React.ReactNode;
  icon: React.ReactNode;
  action?: React.ReactNode;
  stacked: boolean;
}

function StepCard({ number, title, description, icon, action, stacked }: StepCardProps) {
  if (stacked) {
    return (
      <View style={[stepCardStyles.card, stepCardStyles.cardStacked]}>
        <View style={stepCardStyles.mobileHeader}>
          <Text style={[stepCardStyles.title, stepCardStyles.titleMobile]} numberOfLines={2}>
            {number}. {title}
          </Text>
          <View style={[stepCardStyles.iconContainer, stepCardStyles.iconMobile]}>{icon}</View>
        </View>
        <Text style={stepCardStyles.description}>{description}</Text>
        {action ? <View style={stepCardStyles.action}>{action}</View> : null}
      </View>
    );
  }

  return (
    <View style={[stepCardStyles.card, stepCardStyles.cardRow]}>
      <View style={stepCardStyles.iconContainer}>{icon}</View>
      <Text style={stepCardStyles.title} numberOfLines={2}>
        {number}. {title}
      </Text>
      <Text style={stepCardStyles.description}>{description}</Text>
      {action ? <View style={stepCardStyles.action}>{action}</View> : null}
    </View>
  );
}

const stepCardStyles = StyleSheet.create({
  card: {
    backgroundColor: T.white,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 14,
    shadowColor: T.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    minWidth: 0,
  },
  cardStacked: {
    width: "100%",
    marginBottom: 0,
  },
  cardRow: {
    flex: 1,
    minWidth: 0,
  },
  mobileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.orangePale,
    borderWidth: 1,
    borderColor: T.orangeSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  iconMobile: {
    marginBottom: 0,
    flexShrink: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: T.textDark,
    marginBottom: 6,
  },
  titleMobile: {
    flex: 1,
    minWidth: 0,
    marginBottom: 0,
  },
  description: {
    fontSize: 12,
    color: T.textSoft,
    lineHeight: 18,
  },
  action: {
    marginTop: 12,
  },
});

export default function BulkUpload() {
  const navigation = useNavigation();
  const { isWeb, isDesktop, isTablet, isCompact, width } = useResponsive();

  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size?: number | undefined;
    uri: string;
  } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [toast, setToast] = useState<ToastState>({
    visible: false,
    message: "",
    type: "success",
  });

  const stackSteps = !isWeb || width < 700;
  // WebLayout sets padding to 0 for bulkupload on narrow web (<768) — pad here instead.
  const contentPad = !isWeb ? 20 : width < 768 ? (isCompact ? 12 : 16) : 0;
  const maxContentWidth = isDesktop ? 960 : isTablet ? 720 : undefined;

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else if (Platform.OS === "web" && typeof window !== "undefined") {
      window.history.back();
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  };

  const handleSetFile = (file: { name: string; size?: number | undefined; uri: string }) => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      showToast("Please upload a valid .zip file", "error");
      return;
    }
    setSelectedFile(file);
  };

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/zip",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        handleSetFile({
          name: asset.name,
          size: asset.size,
          uri: asset.uri,
        });
      }
    } catch {
      showToast("Failed to select file", "error");
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleDownloadTemplate = async () => {
    if (Platform.OS === "web") {
      downloadFile(CSV_CONTENT, "products_template.csv", "text/csv");
      setTimeout(() => {
        downloadFile(README_CONTENT, "README.txt", "text/plain");
      }, 300);
      showToast("Template files downloaded!", "success");
    } else {
      try {
        await Share.share({
          message: `Products CSV Template Structure:\n\n${CSV_CONTENT}\n\nREADME Instructions:\n\n${README_CONTENT}`,
          title: "Bulk Import CSV Template",
        });
        showToast("Template details shared!", "success");
      } catch {
        Alert.alert("Error", "Failed to share template files");
      }
    }
  };

  const handleStartImport = async () => {
    if (!selectedFile) return;
    setIsImporting(true);
    try {
      const result = await bulkImportProducts(selectedFile.uri, selectedFile.name);
      const errNote =
        result.errors?.length > 0 ? ` (${result.errors.length} warning(s))` : "";
      showToast(
        `Imported ${result.productsCreated} product(s), ${result.variantsCreated} variant(s)${errNote}`,
        result.productsCreated > 0 ? "success" : "error"
      );
      if (result.productsCreated > 0) {
        setSelectedFile(null);
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Import failed", "error");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, isWeb && styles.rootWeb]}>
      {!isWeb ? <StatusBar barStyle="light-content" backgroundColor={T.navy} /> : null}

      {/* Native-only header — web uses DesktopHeader from WebLayout */}
      {!isWeb ? (
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Feather name="arrow-left" size={20} color={T.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Bulk Import Products</Text>
          </View>
          <Text style={styles.headerSub}>Upload products in bulk using ZIP templates</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: contentPad, paddingBottom: isWeb ? 32 : 40 },
          isWeb && styles.scrollContentWeb,
        ]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        <View
          style={[
            styles.inner,
            maxContentWidth != null && { maxWidth: maxContentWidth, alignSelf: "center", width: "100%" },
          ]}
        >
          {/* Web page intro */}
          {isWeb ? (
            <View style={[styles.webHero, isCompact && styles.webHeroCompact]}>
              <View style={styles.webHeroText}>
                <Text style={[styles.webTitle, isCompact && styles.webTitleCompact]}>
                  Bulk Import Products
                </Text>
                <Text style={styles.webSub}>
                  Upload products in bulk using ZIP templates
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.webDownloadBtn, isCompact && styles.webDownloadBtnFull]}
                onPress={handleDownloadTemplate}
                activeOpacity={0.85}
              >
                <Feather name="download" size={15} color={T.white} style={{ marginRight: 6 }} />
                <Text style={styles.webDownloadBtnText}>Download template</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <Text style={[styles.sectionTitle, isWeb && styles.sectionTitleWeb]}>How it works</Text>

          <View
            style={[
              styles.stepsContainer,
              stackSteps ? styles.stepsStacked : styles.stepsRow,
            ]}
          >
            <StepCard
              number={1}
              title="Download template"
              stacked={stackSteps}
              icon={<Feather name="download" size={20} color={T.orange} />}
              description={
                <Text style={styles.stepDescriptionText}>
                  Download the ZIP template which contains a formatted <Code>products.csv</Code> file
                  and an empty <Code>images/</Code> folder.
                </Text>
              }
              action={
                !isWeb ? (
                  <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={handleDownloadTemplate}
                    activeOpacity={0.8}
                  >
                    <Feather name="download" size={14} color={T.orange} style={{ marginRight: 6 }} />
                    <Text style={styles.downloadButtonText}>Download template</Text>
                  </TouchableOpacity>
                ) : null
              }
            />
            <StepCard
              number={2}
              title="Fill data & images"
              stacked={stackSteps}
              icon={<Feather name="edit-3" size={20} color={T.orange} />}
              description={
                <Text style={styles.stepDescriptionText}>
                  Fill out <Code>products.csv</Code>. Use the same <Code>Product Handle</Code> for
                  rows that are variants of the same product. Place all your images inside the{" "}
                  <Code>images/</Code> folder.
                </Text>
              }
            />
            <StepCard
              number={3}
              title="Zip & upload"
              stacked={stackSteps}
              icon={<MaterialCommunityIcons name="folder-zip-outline" size={20} color={T.orange} />}
              description={
                <Text style={styles.stepDescriptionText}>
                  Compress the folder back into a <Code>.zip</Code> file and upload it below. Our
                  system will auto-calculate taxes, commissions, and delivery slabs.
                </Text>
              }
            />
          </View>

          <View style={[styles.uploadCard, isCompact && styles.uploadCardCompact]}>
            <Text style={styles.uploadCardTitle}>Upload ZIP file</Text>

            <TouchableOpacity
              style={[styles.dropZone, isCompact && styles.dropZoneCompact]}
              onPress={handleFileSelect}
              activeOpacity={0.8}
            >
              <View style={styles.cloudIconContainer}>
                <Feather name="upload-cloud" size={isCompact ? 36 : 44} color={T.orange} />
              </View>
              <Text style={styles.dropZoneTitle}>Select ZIP file</Text>
              <Text style={styles.dropZoneSub}>
                {isWeb ? "Click to browse from your device" : "Tap to browse from your device"}
              </Text>
            </TouchableOpacity>

            {selectedFile ? (
              <View style={styles.filePreview}>
                <Feather name="file" size={20} color={T.orange} style={{ marginRight: 8 }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  {selectedFile.size !== undefined ? (
                    <Text style={styles.fileSize}>{formatBytes(selectedFile.size)}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={handleRemoveFile}
                  style={styles.removeButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="x" size={18} color={T.textSoft} />
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!selectedFile || isImporting) && styles.submitButtonDisabled,
              ]}
              onPress={handleStartImport}
              disabled={!selectedFile || isImporting}
              activeOpacity={0.8}
            >
              {isImporting ? (
                <ActivityIndicator color={T.white} size="small" />
              ) : (
                <>
                  <Feather name="upload" size={16} color={T.white} style={{ marginRight: 8 }} />
                  <Text style={styles.submitButtonText}>Start import</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {toast.visible ? (
        <View style={[styles.toastContainer, isWeb && styles.toastContainerWeb]}>
          <View style={styles.toast}>
            <Feather
              name={toast.type === "success" ? "check-circle" : "alert-circle"}
              size={16}
              color={toast.type === "success" ? T.success : T.error}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  rootWeb: {
    width: "100%",
    maxWidth: "100%",
    minWidth: 0,
    overflow: "hidden",
  },
  header: {
    backgroundColor: T.navy,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 16 : 10,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  backButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: T.white,
    flex: 1,
    minWidth: 0,
  },
  headerSub: {
    fontSize: 13,
    color: T.textLight,
    marginLeft: 30,
  },
  scroll: {
    flex: 1,
    width: "100%",
  },
  scrollContent: {
    paddingVertical: 20,
    flexGrow: 1,
  },
  scrollContentWeb: {
    paddingTop: 12,
  },
  inner: {
    width: "100%",
    minWidth: 0,
  },
  webHero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: T.navy,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  webHeroCompact: {
    flexDirection: "column",
    alignItems: "stretch",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  webHeroText: {
    flex: 1,
    minWidth: 0,
  },
  webTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: T.white,
  },
  webTitleCompact: {
    fontSize: 17,
  },
  webSub: {
    fontSize: 12,
    color: T.textLight,
    marginTop: 4,
    lineHeight: 18,
  },
  webDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.orange,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexShrink: 0,
  },
  webDownloadBtnFull: {
    width: "100%",
    marginTop: 4,
  },
  webDownloadBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: T.white,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: T.textDark,
    marginBottom: 16,
  },
  sectionTitleWeb: {
    marginBottom: 12,
  },
  stepsContainer: {
    marginBottom: 24,
    width: "100%",
  },
  stepsStacked: {
    flexDirection: "column",
    gap: 12,
  },
  stepsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 14,
  },
  stepDescriptionText: {
    fontSize: 12,
    color: T.textSoft,
    lineHeight: 18,
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: T.orange,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  downloadButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: T.orange,
  },
  uploadCard: {
    backgroundColor: T.white,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 16,
    padding: 20,
    shadowColor: T.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    width: "100%",
    maxWidth: "100%",
  },
  uploadCardCompact: {
    padding: 14,
    borderRadius: 14,
  },
  uploadCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: T.textDark,
    textAlign: "center",
    marginBottom: 16,
  },
  dropZone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: T.border,
    borderRadius: 12,
    paddingVertical: 36,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.bg,
    width: "100%",
  },
  dropZoneCompact: {
    paddingVertical: 28,
    paddingHorizontal: 12,
  },
  cloudIconContainer: {
    marginBottom: 12,
  },
  dropZoneTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: T.textDark,
    marginBottom: 4,
    textAlign: "center",
  },
  dropZoneSub: {
    fontSize: 12,
    color: T.textSoft,
    textAlign: "center",
  },
  filePreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.bg,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: T.border,
    width: "100%",
    minWidth: 0,
  },
  fileName: {
    fontSize: 13,
    fontWeight: "600",
    color: T.textDark,
  },
  fileSize: {
    fontSize: 11,
    color: T.textSoft,
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
    flexShrink: 0,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.orange,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 16,
    shadowColor: T.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    width: "100%",
  },
  submitButtonDisabled: {
    backgroundColor: T.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: T.white,
  },
  toastContainer: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  toastContainerWeb: {
    left: 12,
    right: 12,
    bottom: 16,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.navy,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    maxWidth: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  toastText: {
    fontSize: 13,
    color: T.white,
    fontWeight: "500",
    flexShrink: 1,
  },
});
