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
  Dimensions,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useNavigation } from "@react-navigation/native";
import { bulkImportProducts } from "@/services/productApi";

const { width: screenWidth } = Dimensions.get("window");

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

// ─── Inline Code block component ─────────────────────────────────────────────
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

// ─── Step Card component ──────────────────────────────────────────────────────
interface StepCardProps {
  number: number;
  title: string;
  description: React.ReactNode;
  icon: React.ReactNode;
  action?: React.ReactNode;
}

function StepCard({ number, title, description, icon, action }: StepCardProps) {
  return (
    <View style={stepCardStyles.card}>
      <View style={stepCardStyles.iconContainer}>{icon}</View>
      <Text style={stepCardStyles.title}>
        {number}. {title}
      </Text>
      <Text style={stepCardStyles.description}>{description}</Text>
      {action && <View style={stepCardStyles.action}>{action}</View>}
    </View>
  );
}

const stepCardStyles = StyleSheet.create({
  card: {
    backgroundColor: T.white,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: screenWidth > 600 ? 200 : "100%",
    marginBottom: screenWidth > 600 ? 0 : 16,
    shadowColor: T.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
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
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: T.textDark,
    marginBottom: 6,
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BulkUpload() {
  const navigation = useNavigation();

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
    } catch (err) {
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
      } catch (error) {
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
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={T.navy} />

      {/* Header */}
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section Heading */}
        <Text style={styles.sectionTitle}>How it works</Text>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          <StepCard
            number={1}
            title="Download template"
            icon={<Feather name="download" size={20} color={T.orange} />}
            description={
              <Text style={styles.stepDescriptionText}>
                Download the ZIP template which contains a formatted <Code>products.csv</Code> file
                and an empty <Code>images/</Code> folder.
              </Text>
            }
            action={
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={handleDownloadTemplate}
                activeOpacity={0.8}
              >
                <Feather name="download" size={14} color={T.orange} style={{ marginRight: 6 }} />
                <Text style={styles.downloadButtonText}>Download template</Text>
              </TouchableOpacity>
            }
          />
          <StepCard
            number={2}
            title="Fill data & images"
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
            icon={<MaterialCommunityIcons name="folder-zip-outline" size={20} color={T.orange} />}
            description={
              <Text style={styles.stepDescriptionText}>
                Compress the folder back into a <Code>.zip</Code> file and upload it below. Our
                system will auto-calculate taxes, commissions, and delivery slabs.
              </Text>
            }
          />
        </View>

        {/* Upload Card */}
        <View style={styles.uploadCard}>
          <Text style={styles.uploadCardTitle}>Upload ZIP file</Text>

          {/* Select Area */}
          <TouchableOpacity
            style={styles.dropZone}
            onPress={handleFileSelect}
            activeOpacity={0.8}
          >
            <View style={styles.cloudIconContainer}>
              <Feather name="upload-cloud" size={40} color={T.orange} />
            </View>
            <Text style={styles.dropZoneTitle}>Select ZIP file</Text>
            <Text style={styles.dropZoneSub}>Tap to browse from your device</Text>
          </TouchableOpacity>

          {/* File Preview */}
          {selectedFile && (
            <View style={styles.filePreview}>
              <Feather name="file" size={20} color={T.orange} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                {selectedFile.size !== undefined && (
                  <Text style={styles.fileSize}>{formatBytes(selectedFile.size)}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={handleRemoveFile}
                style={styles.removeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={18} color={T.textSoft} />
              </TouchableOpacity>
            </View>
          )}

          {/* Submit Button */}
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
      </ScrollView>

      {/* Toast Alert */}
      {toast.visible && (
        <View style={styles.toastContainer}>
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
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: {
    backgroundColor: T.navy,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 16 : 10,
    paddingBottom: 24,
    marginTop: 30,
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
  },
  headerSub: {
    fontSize: 13,
    color: T.textLight,
    marginLeft: 30,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: T.textDark,
    marginBottom: 16,
  },
  stepsContainer: {
    flexDirection: screenWidth > 600 ? "row" : "column",
    gap: 16,
    marginBottom: 24,
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
  },
  cloudIconContainer: {
    marginBottom: 12,
  },
  dropZoneTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: T.textDark,
    marginBottom: 4,
  },
  dropZoneSub: {
    fontSize: 12,
    color: T.textSoft,
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
  toast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.navy,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
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
  },
});