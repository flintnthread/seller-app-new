/**
 * Shared Reusable Components for Seller Onboarding Screens
 * Premium, modern, and production-ready components
 */

import React, { useState, useRef } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Image,
  ScrollView,
  type LayoutChangeEvent,
} from "react-native";
import { AppText } from "@/components/AppText";
import { fontFamilies, fontSizes } from "@/constants/fonts";
import * as ImagePicker from "expo-image-picker";
import {
  PRIMARY,
  PRIMARY_L,
  ORANGE,
  TEXT,
  TEXT_SEC,
  BORDER,
  INPUT_BG,
  SUCCESS,
  ERROR,
  SPACING,
  BORDER_RADIUS,
  FONT_SIZES,
} from "./_sellerDesignTokens";

// ─── Types ────────────────────────────────────────────────────────────────────

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  secureTextEntry?: boolean;
  rightElement?: React.ReactNode;
  leftIcon?: React.ReactNode;
  editable?: boolean;
  error?: string | undefined;
  inputRef?: React.RefObject<TextInput | null>;
  onLayout?: (event: LayoutChangeEvent) => void;
  onBlur?: () => void;
  maxLength?: number;
  inputStyle?: object;
  isValid?: boolean;
  customLabel?: React.ReactNode;
}

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  size?: "normal" | "small";
}

interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  size?: "normal" | "small";
}

interface UploadBoxProps {
  image: string | null;
  onPickImage: () => void;
  label?: string;
  size?: number;
}

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  completedFields?: number;
  totalFields?: number;
}

interface SectionTitleProps {
  title: string;
  subtitle?: string;
}

// ─── InputField ───────────────────────────────────────────────────────────────

export const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  secureTextEntry = false,
  rightElement,
  leftIcon,
  editable = true,
  error,
  inputRef,
  onLayout,
  onBlur,
  maxLength,
  inputStyle,
  isValid,
  customLabel,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (error) return ERROR;
    if (isValid) return SUCCESS;
    if (isFocused) return ORANGE;
    return BORDER;
  };

  return (
    <View style={styles.fieldWrapper} onLayout={onLayout}>
      {customLabel ? customLabel : <AppText style={styles.label}>{label}</AppText>}
      <View
        style={[
          styles.inputRow,
          !editable && styles.inputRowDisabled,
          { borderColor: getBorderColor(), borderWidth: error ? 2 : 1.5 },
        ]}
      >
        {leftIcon && <View style={styles.inputLeft}>{leftIcon}</View>}
        <TextInput
          ref={inputRef}
          style={[styles.input, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#999999"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          editable={editable}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={maxLength}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            if (onBlur) onBlur();
          }}
        />
        {rightElement && (
          <View style={styles.inputRight}>{rightElement}</View>
        )}
        {isValid && !rightElement && (
          <View style={styles.inputRight}>
            <AppText style={styles.checkmark}>✓</AppText>
          </View>
        )}
      </View>
      {error && <AppText style={styles.errorText}>{error}</AppText>}
    </View>
  );
};

// ─── PrimaryButton ───────────────────────────────────────────────────────────

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  isLoading = false,
  size = "normal",
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => spring(0.97)}
        onPressOut={() => spring(1)}
        disabled={disabled || isLoading}
        activeOpacity={1}
        style={[
          styles.primaryBtn,
          size === "small" && styles.primaryBtnSmall,
          disabled && styles.primaryBtnDisabled,
          isLoading && styles.primaryBtnLoading,
        ]}
      >
        <AppText
          style={[
            styles.primaryBtnText, 
            disabled && styles.primaryBtnTextDisabled
          ]}
        >
          {title}
        </AppText>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── SecondaryButton ─────────────────────────────────────────────────────────

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  size = "normal",
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => spring(0.97)}
        onPressOut={() => spring(1)}
        disabled={disabled}
        activeOpacity={1}
        style={[
          styles.secondaryBtn,
          size === "small" && styles.secondaryBtnSmall,
          disabled && styles.secondaryBtnDisabled,
        ]}
      >
        <AppText style={styles.secondaryBtnText}>{title}</AppText>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── UploadBox ───────────────────────────────────────────────────────────────

export const UploadBox: React.FC<UploadBoxProps> = ({
  image,
  onPickImage,
  label = "Upload Photo",
  size = 120,
}) => {
  return (
    <TouchableOpacity
      style={[styles.uploadBox, { width: size, height: size, borderRadius: size / 2 }]}
      onPress={onPickImage}
      activeOpacity={0.8}
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.uploadedImage} />
      ) : (
        <View style={styles.uploadContent}>
          <AppText style={styles.uploadLabel}>{label}</AppText>
          <AppText style={styles.uploadSublabel}>Tap to upload</AppText>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── ProgressBar ─────────────────────────────────────────────────────────────

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentStep,
  totalSteps,
  completedFields = 0,
  totalFields = 1,
}) => {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Calculate base progress from completed steps (previous steps are 100% complete)
    const baseProgress = (currentStep - 1) / totalSteps;
    
    // Calculate current step progress from field completion
    const currentStepProgress = totalFields > 0 ? completedFields / totalFields : 0;
    
    // Add current step progress to base progress
    const stepProgress = currentStepProgress / totalSteps;
    
    // Total progress = base progress + current step field progress
    const totalProgress = baseProgress + stepProgress;
    const progressPercentage = totalProgress * 100;
    
    Animated.timing(animatedWidth, {
      toValue: progressPercentage,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [currentStep, totalSteps, completedFields, totalFields]);

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <Animated.View
          style={[styles.progressFill, { width: animatedWidth }]}
        />
      </View>
      <AppText style={styles.stepText}>
        Step {currentStep} of {totalSteps}
      </AppText>
    </View>
  );
};

// ─── SectionTitle ────────────────────────────────────────────────────────────

export const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  subtitle,
}) => {
  return (
    <View style={styles.sectionTitleContainer}>
      <AppText style={styles.sectionTitle}>{title}</AppText>
      {subtitle && <AppText style={styles.sectionSubtitle}>{subtitle}</AppText>}
    </View>
  );
};

// ─── DocumentUploadBox ───────────────────────────────────────────────────────

interface DocumentUploadBoxProps {
  label: string;
  subtitle: string;
  uploaded: boolean;
  onPress: () => void;
}

export const DocumentUploadBox: React.FC<DocumentUploadBoxProps> = ({
  label,
  subtitle,
  uploaded,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.docUploadBox, uploaded && styles.docUploadBoxUploaded]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.docUploadContent}>
        <View style={[styles.docIcon, uploaded && styles.docIconUploaded]}>
          <AppText style={styles.docIconText}>
            {uploaded ? "✓" : "↑"}
          </AppText>
        </View>
        <View style={styles.docTextContainer}>
          <AppText style={[styles.docLabel, uploaded && styles.docLabelUploaded]}>
            {label}
          </AppText>
          <AppText style={styles.docSubtitle}>{subtitle}</AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Checkbox ────────────────────────────────────────────────────────────────

interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
  accentColor?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onToggle,
  label,
  accentColor = PRIMARY_L,
}) => {
  return (
    <TouchableOpacity
      style={styles.checkboxRow}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={[styles.checkbox, { borderColor: accentColor }, checked && [styles.checkboxChecked, { backgroundColor: accentColor, borderColor: accentColor }]]}>
        {checked && <AppText style={styles.checkboxCheckmark}>✓</AppText>}
      </View>
      <AppText style={styles.checkboxLabel}>{label}</AppText>
    </TouchableOpacity>
  );
};

// ─── Dropdown ────────────────────────────────────────────────────────────────

interface DropdownProps {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  label,
  value,
  options,
  onSelect,
  placeholder,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (isOpen) return ORANGE;
    if (isFocused) return ORANGE;
    return BORDER;
  };

  return (
    <View style={styles.fieldWrapper}>
      <AppText style={styles.label}>{label}</AppText>
      <TouchableOpacity
        style={[styles.dropdown, { borderColor: getBorderColor() }]}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.8}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        <AppText style={[styles.dropdownText, !value && styles.dropdownPlaceholder]}>
          {value || placeholder || "Select an option"}
        </AppText>
        <AppText style={styles.dropdownArrow}>{isOpen ? "▲" : "▼"}</AppText>
      </TouchableOpacity>
      {isOpen && (
        <View style={styles.dropdownOptions}>
          <ScrollView
            style={styles.dropdownScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.dropdownOption}
                onPress={() => {
                  onSelect(option);
                  setIsOpen(false);
                }}
              >
                <AppText style={styles.dropdownOptionText}>{option}</AppText>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Input Field Styles
  fieldWrapper: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT_SIZES.xs,
    fontFamily: fontFamilies.bold,
    color: TEXT_SEC,
    marginBottom: SPACING.sm,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  capitalizedLabel: {
    fontSize: FONT_SIZES.xs,
    fontFamily: fontFamilies.bold,
    color: TEXT_SEC,
    marginBottom: SPACING.sm,
    letterSpacing: 0.6,
    textTransform: "capitalize",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: INPUT_BG,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    paddingHorizontal: SPACING.lg,
    minHeight: 54,
  },
  inputRowDisabled: {
    opacity: 0.55,
  },
  inputLeft: {
    marginRight: 10,
    opacity: 0.75,
  },
  input: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: TEXT,
    paddingVertical: 12,
    paddingRight: 40, // Ensure space for checkmark
  },
  inputRight: {
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    fontSize: 18,
    fontFamily: fontFamilies.bold,
    color: SUCCESS,
  },
  errorText: {
    fontSize: FONT_SIZES.sm,
    color: ERROR,
    marginTop: SPACING.xs,
  },

  // Primary Button Styles
  primaryBtn: {
    backgroundColor: ORANGE,
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryBtnDisabled: {
    backgroundColor: ORANGE,
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.6,
  },
  primaryBtnLoading: {
    backgroundColor: ORANGE,
  },
  primaryBtnText: {
    color: "#FFF",
    fontSize: FONT_SIZES.base,
    fontFamily: fontFamilies.bold,
  },
  primaryBtnTextLoading: {
    color: ORANGE,
  },
  primaryBtnTextDisabled: {
    color: "#FFF",
  },
  primaryBtnSmall: {
    paddingVertical: SPACING.md,
  },

  // Secondary Button Styles
  secondaryBtn: {
    backgroundColor: "transparent",
    borderRadius: BORDER_RADIUS.xl,
    paddingVertical: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: ORANGE,
  },
  secondaryBtnDisabled: {
    opacity: 0.6,
  },
  secondaryBtnSmall: {
    paddingVertical: SPACING.md,
  },
  secondaryBtnText: {
    color: ORANGE,
    fontSize: FONT_SIZES.base,
    fontFamily: fontFamilies.bold,
  },

  // Upload Box Styles
  uploadBox: {
    borderWidth: 2,
    borderColor: PRIMARY_L,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    overflow: "hidden",
    backgroundColor: INPUT_BG,
  },
  uploadedImage: {
    width: "100%",
    height: "100%",
  },
  uploadContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  uploadLabel: {
    color: PRIMARY_L,
    fontFamily: fontFamilies.bold,
    fontSize: FONT_SIZES.sm,
    marginBottom: SPACING.xs,
  },
  uploadSublabel: {
    color: TEXT_SEC,
    fontSize: FONT_SIZES.xs,
  },

  // Progress Bar Styles
  progressContainer: {
    marginBottom: SPACING.xl,
  },
  progressBar: {
    height: 6,
    backgroundColor: BORDER,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: SPACING.sm,
  },
  progressFill: {
    height: "100%",
    backgroundColor: PRIMARY_L,
    borderRadius: 3,
  },
  stepText: {
    fontSize: FONT_SIZES.sm,
    fontFamily: fontFamilies.semiBold,
    color: TEXT_SEC,
    textAlign: "center",
  },

  // Section Title Styles
  sectionTitleContainer: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES["4xl"],
    fontFamily: fontFamilies.bold,
    color: TEXT,
    marginBottom: SPACING.xs,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  sectionSubtitle: {
    fontSize: FONT_SIZES.lg,
    fontFamily: fontFamilies.semiBold,
    color: TEXT,
    lineHeight: 22,
  },

  // Document Upload Box Styles
  docUploadBox: {
    backgroundColor: INPUT_BG,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: BORDER,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  docUploadBoxUploaded: {
    borderColor: SUCCESS,
    backgroundColor: "rgba(61, 158, 90, 0.05)",
  },
  docUploadContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  docIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: BORDER,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  docIconUploaded: {
    backgroundColor: SUCCESS,
  },
  docIconText: {
    fontSize: 20,
    fontFamily: fontFamilies.bold,
    color: TEXT_SEC,
  },
  docIconUploadedText: {
    color: "#FFF",
  },
  docTextContainer: {
    flex: 1,
  },
  docLabel: {
    fontSize: FONT_SIZES.base,
    fontFamily: fontFamilies.bold,
    color: TEXT,
    marginBottom: SPACING.xs,
  },
  docLabelUploaded: {
    color: SUCCESS,
  },
  docSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: TEXT_SEC,
  },

  // Checkbox Styles
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 2,
    backgroundColor: INPUT_BG,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
  },
  checkboxChecked: {},
  checkboxCheckmark: {
    color: "#FFF",
    fontSize: 13,
    fontFamily: fontFamilies.bold,
  },
  checkboxLabel: {
    fontSize: FONT_SIZES.md,
    color: TEXT_SEC,
    flex: 1,
  },

  // Dropdown Styles
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: INPUT_BG,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: PRIMARY_L,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 54,
  },
  dropdownText: {
    fontSize: FONT_SIZES.base,
    color: TEXT,
  },
  dropdownPlaceholder: {
    color: "#999999",
  },
  dropdownArrow: {
    fontSize: FONT_SIZES.sm,
    color: TEXT_SEC,
  },
  dropdownOptions: {
    backgroundColor: "#FFF",
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: SPACING.xs,
    maxHeight: 200,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownOption: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  dropdownOptionText: {
    fontSize: FONT_SIZES.base,
    color: TEXT,
  },
});
