





















/**
 * SellerSignUpScreen.tsx
 * Flat full-screen layout — no card/box container.
 * Form fields sit directly on the warm cream background.
 *
 * Prerequisites:
 *   npx expo install react-native-svg
 */

import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ImageBackground,
  Image,
  type LayoutChangeEvent,
} from "react-native";
import { AppText } from "@/components/AppText";
import { fontFamilies, fontSizes } from "@/constants/fonts";
import { useRouter } from "expo-router";
import Svg, { Path, Circle } from "react-native-svg";
import { showMessage } from "react-native-flash-message";
// ─── Design Tokens ────────────────────────────────────────────────────────────

const CREAM = "#F5EFE6";
const PRIMARY = "#1D324E";  // Updated blue
const PRIMARY_D = "#1E40AF";  // Darker navy blue
const PRIMARY_L = "#376197";  // Lighter shade of primary
const TEXT = "#000000";  // Black
const TEXT_SEC = "#666666";  // Light shade of black
const BORDER = "#E2E8F0";  // Light slate
const INPUT_BG = "#F8FAFC";  // Very light slate
const SUCCESS = "#3D9E5A";
const ERROR = "#E05A3A";

const toastConfig = {
  floating: true,
  position: "top" as const,
  duration: 1800,

  style: {
    position: "absolute" as const,

    top: 20,
    right: 6,

    minWidth: 220,
    maxWidth: "88%" as const,

    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,

    alignItems: "flex-start" as const,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,

    zIndex: 9999,
  },

  textStyle: {
    fontSize: 13,
    fontFamily: fontFamilies.bold,
    color: "#FFF",
  },
};

// ─── Validation Types ───────────────────────────────────────────────────────

interface ValidationError {
  field: string;
  message: string;
}

interface FieldRefs {
  fullName: React.RefObject<TextInput | null>;
  mobile: React.RefObject<TextInput | null>;
  otp: React.RefObject<TextInput | null>;
  email: React.RefObject<TextInput | null>;
  password: React.RefObject<TextInput | null>;
  confirmPassword: React.RefObject<TextInput | null>;
}


// ─── Validation Helpers ───────────────────────────────────────────────────

const validateEmail = (email: string): boolean => {
  const trimmed = email.trim().toLowerCase();

  // Basic email structure
  const emailRegex =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}$/;

  if (!emailRegex.test(trimmed)) {
    return false;
  }

  const domain = trimmed.split("@")[1];

  if (!domain) return false;

  // STRICT allowed providers
  const allowedDomains = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "outlook.in",
    "hotmail.com",
    "icloud.com",
    "protonmail.com",
  ];

  // ONLY exact domains allowed
  return allowedDomains.includes(domain);
};

const getEmailError = (email: string): string => {
  const trimmed = email.trim().toLowerCase();

  if (!trimmed) return "";

  // Missing @
  if (!trimmed.includes("@")) {
    return "Email must contain @";
  }

  // Basic structure validation
  const emailRegex =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}$/;

  if (!emailRegex.test(trimmed)) {
    return "Enter valid email address";
  }

  const domain = trimmed.split("@")[1];

  if (!domain) {
    return "Enter valid email address";
  }

  // STRICT allowed providers
  const allowedDomains = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "outlook.in",
    "hotmail.com",
    "icloud.com",
    "protonmail.com",
  ];

  // INVALID PROVIDER
  if (!allowedDomains.includes(domain)) {
    return "Use: gmail.com, yahoo.com, outlook.com, etc.";
  }

  return "";
};

const validateMobile = (mobile: string): boolean => {
  return /^[6-9]\d{9}$/.test(mobile);
};

const getMobileError = (mobile: string | undefined): string => {
  if (!mobile || mobile.length === 0) return "";

  if (!/^\d+$/.test(mobile)) {
    return "Only numbers are allowed";
  }

  if (mobile.length !== 10) {
    return "Enter valid Indian mobile (10 digits, start with 6-9)";
  }

  if (!/^[6-9]/.test(mobile)) {
    return "Mobile number must start with 6-9";
  }

  return "";
};

// Password validation helpers
const validatePassword = (password: string): boolean => {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&  // At least one uppercase
    /[a-z]/.test(password) &&  // At least one lowercase
    /\d/.test(password) &&     // At least one number
    /[!@#$%^&*(),.?":{}|<>]/.test(password)  // At least one special character
  );
};

const getPasswordError = (password: string): string => {
  if (!password) return "";

  if (password.length < 8) {
    return "At least 8 characters required";
  }

  if (!/[A-Z]/.test(password)) {
    return "One uppercase letter required";
  }

  if (!/[a-z]/.test(password)) {
    return "One lowercase letter required";
  }

  if (!/\d/.test(password)) {
    return "One number required";
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return "One special character required";
  }

  return "";
};

// Password requirements for display
const getPasswordRequirements = (password: string) => [
  { text: "At least 8 characters", met: password.length >= 8 },
  { text: "One uppercase", met: /[A-Z]/.test(password) },
  { text: "One lowercase", met: /[a-z]/.test(password) },
  { text: "One number", met: /\d/.test(password) },
  { text: "One special character (!@#$%^&*())", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
];





// ─── Bootstrap-style SVG Icons ───────────────────────────────────────────────

const IconPerson = () => (
  <Svg width={18} height={18} viewBox="0 0 16 16">
    <Path fill={TEXT_SEC} d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.029 10 8 10c-2.029 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
  </Svg>
);

const IconPhone = () => (
  <Svg width={18} height={18} viewBox="0 0 16 16">
    <Path fill={TEXT_SEC} d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.568 17.568 0 0 0 4.168 6.608 17.569 17.569 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.678.678 0 0 0-.58-.122l-2.19.547a1.745 1.745 0 0 1-1.657-.459L5.823 9.51a1.745 1.745 0 0 1-.46-1.657l.548-2.19a.678.678 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.3 1.498l-.547 2.19a.678.678 0 0 0 .178.643l2.457 2.457a.678.678 0 0 0 .644.178l2.189-.547a1.745 1.745 0 0 1 1.498.3l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.634 18.634 0 0 1-7.01-4.42 18.634 18.634 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z" />
  </Svg>
);

const IconEnvelope = () => (
  <Svg width={18} height={18} viewBox="0 0 16 16">
    <Path fill={TEXT_SEC} d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2zm13 2.383-4.758 2.855L15 11.114V5.383zm-.034 6.211-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.406zM1 11.114l4.758-2.876L1 5.383v5.731z" />
  </Svg>
);

const IconLock = () => (
  <Svg width={18} height={18} viewBox="0 0 16 16">
    <Path fill={TEXT_SEC} d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM5 8h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
  </Svg>
);


const IconKey = () => (
  <Svg width={18} height={18} viewBox="0 0 16 16">
    <Path fill={TEXT_SEC} d="M0 8a4 4 0 0 1 7.465-2H14L15 7l1 1-1 1-1 1-1-1-1 1-1-1-1 1-1-1-1-1h-.535A4 4 0 0 1 0 8zm4-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
  </Svg>
);

const IconEyeOpen = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path
      fill={TEXT_SEC}
      d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
    />
  </Svg>
);

const IconEyeSlash = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24">
    <Path
      fill={TEXT_SEC}
      d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"
      opacity="0.6"
    />
    <Path
      d="M3 3L21 21"
      strokeWidth="2.5"
      strokeLinecap="round"
      stroke={TEXT_SEC}
    />
  </Svg>
);

const IconShieldCheck = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16">
    <Path fill={SUCCESS} d="M5.338 1.59a61.44 61.44 0 0 0-2.837.856.481.481 0 0 0-.328.39c-.554 4.157.726 7.19 2.253 9.188a10.725 10.725 0 0 0 2.287 2.233c.346.244.652.42.893.533.12.057.218.095.293.118a.55.55 0 0 0 .101.025.615.615 0 0 0 .1-.025c.076-.023.174-.061.294-.118.24-.113.547-.29.893-.533a10.726 10.726 0 0 0 2.287-2.233c1.527-1.997 2.807-5.031 2.253-9.188a.48.48 0 0 0-.328-.39c-.651-.213-1.75-.56-2.837-.855C9.552 1.29 8.531 1.067 8 1.067c-.53 0-1.552.223-2.662.524zM10.854 6.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 8.793l2.646-2.647a.5.5 0 0 1 .708 0z" />
  </Svg>
);

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
}

// ─── InputField ───────────────────────────────────────────────────────────────

const InputField: React.FC<InputFieldProps> = ({
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
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = useCallback(() => {
    if (error) return ERROR;
    if (isFocused) return "#1D324E";
    return BORDER;
  }, [error, isFocused]);

  return (
    <View style={styles.fieldWrapper} onLayout={onLayout}>
      <AppText style={styles.label}>{label}</AppText>
      <View style={[
        styles.inputRow,
        !editable && styles.inputRowDisabled,
        { borderColor: getBorderColor(), borderWidth: error ? 2 : 1 }
      ]}>
        {leftIcon && <View style={styles.inputLeft}>{leftIcon}</View>}
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#999999"
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          editable={editable}
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {rightElement && (
          <View style={styles.inputRight}>{rightElement}</View>
        )}
      </View>
      {error && (
        <AppText style={styles.errorText}>{error}</AppText>
      )}
    </View>
  );
};

// ─── PrimaryButton ────────────────────────────────────────────────────────────

const PrimaryButton: React.FC<{
  title: string;
  onPress: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}> = ({ title, onPress, disabled = false, isLoading = false }) => {
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
          disabled && styles.primaryBtnDisabled,
          isLoading && styles.primaryBtnLoading
        ]}
      >
        <AppText style={[styles.primaryBtnText, disabled && styles.primaryBtnTextDisabled]}>
          {title}
        </AppText>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── EyeToggle ────────────────────────────────────────────────────────────────

const EyeToggle: React.FC<{ visible: boolean; onToggle: () => void }> = ({
  visible,
  onToggle,
}) => (
  <TouchableOpacity
    onPress={onToggle}
    style={styles.eyeBtn}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    {visible ? <IconEyeOpen /> : <IconEyeSlash />}
  </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const SellerSignUpScreen: React.FC = () => {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);

  // State
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [otpTimer, setOtpTimer] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);

  // Clear validation error for a field when it changes
  const clearFieldError = useCallback((field: string) => {
    setValidationErrors(prev => prev.filter(e => e.field !== field));
  }, []);

  // OTP Timer countdown effect
  useEffect(() => {
    let interval: any;

    if (isTimerActive && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prevTimer) => {
          if (prevTimer <= 1) {
            setIsTimerActive(false);
            return 0;
          }
          return prevTimer - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, otpTimer]);

  // Function to mask mobile number (show only last 3 digits)
  const maskMobileNumber = (number: string) => {
    if (number.length < 3) return number;
    const visible = number.slice(-3);
    const masked = 'X'.repeat(number.length - 3);
    return masked + visible;
  };
  const [isLoading, setIsLoading] = useState(false);
  const [fieldPositions, setFieldPositions] = useState<Record<string, number>>({});

  // Refs for auto-scroll
  const fieldRefs: FieldRefs = {
    fullName: useRef<TextInput>(null),
    mobile: useRef<TextInput>(null),
    otp: useRef<TextInput>(null),
    email: useRef<TextInput>(null),
    password: useRef<TextInput>(null),
    confirmPassword: useRef<TextInput>(null),
  };

  // Track field positions
  const handleFieldLayout = useCallback((fieldName: string, event: LayoutChangeEvent) => {
    const { y } = event.nativeEvent.layout;
    setFieldPositions(prev => ({ ...prev, [fieldName]: y }));
  }, []);

  // Memoized validations
  const validations = useMemo(() => ({
    fullName: fullName.trim().length > 0,
    mobile: validateMobile(mobile),
    otp: otp === "1234",
    email: validateEmail(email),
    password: validatePassword(password),
    confirmPassword: confirmPassword.length > 0,
    agreed: agreed,
    otpVerified: otpVerified,
  }), [fullName, mobile, otp, email, password, confirmPassword, agreed, otpVerified]);


  // Auto-scroll to first error field
  const scrollToFirstError = useCallback(() => {
    const firstError = [
      { field: 'fullName', ref: fieldRefs.fullName, valid: validations.fullName },
      { field: 'mobile', ref: fieldRefs.mobile, valid: validations.mobile },
      { field: 'otp', ref: fieldRefs.otp, valid: validations.otp },
      { field: 'email', ref: fieldRefs.email, valid: validations.email },
      { field: 'password', ref: fieldRefs.password, valid: validations.password },
      { field: 'confirmPassword', ref: fieldRefs.confirmPassword, valid: validations.confirmPassword },
    ].find(field => !field.valid);

    if (firstError?.ref?.current) {
      firstError.ref.current?.focus();

      // Scroll to the specific field position with some offset
      const fieldY = fieldPositions[firstError.field];
      if (fieldY !== undefined) {
        const scrollOffset = Math.max(0, fieldY - 100); // 100px offset for better visibility
        scrollViewRef.current?.scrollTo({ y: scrollOffset, animated: true });
      } else {
        // Fallback to top if position not available yet
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }
    }
  }, [validations, fieldRefs, fieldPositions]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSendOtp = useCallback(() => {
    if (!mobile || mobile.replace(/\D/g, "").length < 10) {
      showMessage({
        message: "Invalid Number",
        type: "danger",
        icon: "danger",
        ...toastConfig,
      });

      fieldRefs.mobile.current?.focus();
      return;
    }

    setOtpSent(true);
    // Start 1-minute timer
    setOtpTimer(60);
    setIsTimerActive(true);

    showMessage({
      message: "OTP Sent",
      type: "success",
      icon: "success",
      ...toastConfig,
    });
  }, [mobile]);

  const handleVerifyOtp = useCallback(() => {
    if (otp === "1234") {
      setOtpVerified(true);

      showMessage({
        message: "Verified",
        type: "success",
        icon: "success",
        ...toastConfig,
      });
    } else {
      showMessage({
        message: "Wrong OTP",
        type: "danger",
        icon: "danger",
        ...toastConfig,
      });

      fieldRefs.otp.current?.focus();
    }
  }, [otp]);

  const handleSignUp = useCallback(() => {
    const errors: ValidationError[] = [];

    if (!validations.fullName) {
      errors.push({ field: 'fullName', message: 'Full name is required' });
    }
    if (!validations.otpVerified) {
      errors.push({ field: 'mobile', message: 'Mobile number verification required' });
    }
    if (!validations.email) {
      errors.push({ field: 'email', message: 'Enter valid email' });
    }
    if (!validations.password) {
      errors.push({ field: 'password', message: 'Password is required' });
    }
    if (password.length > 0 && confirmPassword.length > 0 && password !== confirmPassword) {
      errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
    }
    if (!validations.agreed) {
      errors.push({ field: 'terms', message: 'Please accept Terms & Conditions' });
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      scrollToFirstError();
      return;
    }

    // Navigate to sellerpersonalinfo with user data
    router.push({
      pathname: "/(main)/sellerpersonalinfo",
      params: {
        fullName: fullName,
        mobile: mobile,
        email: email
      }
    });

  }, [validations, password, confirmPassword, agreed, scrollToFirstError, router, fullName, mobile, email]);

  const pwdMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const pwdMismatch = password.length > 0 && confirmPassword.length > 0 && password !== confirmPassword;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <ImageBackground
      source={require('../../assets/images/background.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
          <ScrollView
            ref={scrollViewRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Header Section — sits directly on background ─────────────── */}
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Image
                  source={require('../../assets/images/fav.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                <AppText style={styles.title}>Create Account</AppText>
                <AppText style={styles.subtitle}>
                  Your journey to smarter ecommerce {"\n"} starts here!
                </AppText>
              </View>
            </View>

            {/* ── Form Section — flat, no card ──────────────────────────────── */}
            <View style={styles.form}>

              {/* Full Name */}
              <InputField
                label="Full Name"
                value={fullName}
                onChangeText={(text) => {
                  clearFieldError('fullName');
                  setFullName(text);
                }}
                placeholder="Shariar Hossain"
                leftIcon={<IconPerson />}
                inputRef={fieldRefs.fullName}
                error={validationErrors.find(e => e.field === 'fullName')?.message}
                onLayout={(e) => handleFieldLayout('fullName', e)}
              />

              {/* Mobile Number */}
              <InputField
                label="Mobile Number"
                value={mobile}
                onChangeText={(text) => {
                  clearFieldError('mobile');
                  setMobile(text.replace(/\D/g, ''));
                }}
                placeholder="Enter mobile number"
                keyboardType="phone-pad"
                editable={!otpVerified}
                leftIcon={<IconPhone />}
                inputRef={fieldRefs.mobile}
                error={validationErrors.find(e => e.field === 'mobile')?.message || getMobileError(mobile)}
                onLayout={(e) => handleFieldLayout('mobile', e)}
                rightElement={
                  !otpVerified ? (
                    <TouchableOpacity
                      style={[styles.inlineBtn, isTimerActive && styles.inlineBtnDisabled]}
                      onPress={handleSendOtp}
                      disabled={isTimerActive}
                    >
                      <AppText style={[styles.inlineBtnText, isTimerActive && styles.inlineBtnTextDisabled]}>
                        {otpSent ? "Resend" : "Send OTP"}
                      </AppText>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.verifiedBadge}>
                      <IconShieldCheck />
                      <AppText style={styles.verifiedText}>Verified</AppText>
                    </View>
                  )
                }
              />

              {/* OTP Confirmation Text */}
              {otpSent && !otpVerified && (
                <View style={styles.otpConfirmationContainer}>
                  <AppText style={styles.otpConfirmationText}>
                    We have sent an OTP to your mobile number {maskMobileNumber(mobile)}
                    {isTimerActive && (
                      <AppText style={styles.timerText}> ({Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, '0')})</AppText>
                    )}
                  </AppText>
                </View>
              )}

              {/* OTP Field */}
              {otpSent && !otpVerified && (
                <InputField
                  label="OTP Verification"
                  value={otp}
                  onChangeText={(text) => {
                    clearFieldError('otp');
                    setOtp(text);
                  }}
                  placeholder="Enter OTP"
                  keyboardType="numeric"
                  leftIcon={<IconKey />}
                  inputRef={fieldRefs.otp}
                  error={validationErrors.find(e => e.field === 'otp')?.message}
                  onLayout={(e) => handleFieldLayout('otp', e)}
                  rightElement={
                    <TouchableOpacity
                      style={[styles.inlineBtn, styles.inlineBtnVerify]}
                      onPress={handleVerifyOtp}
                    >
                      <AppText style={styles.inlineBtnText}>Verify</AppText>
                    </TouchableOpacity>
                  }
                />
              )}

              {/* Email */}
              <InputField
                label="Email Address"
                value={email}
                onChangeText={(text) => {
                  clearFieldError('email');
                  setEmail(text);
                }}
                placeholder="you@example.com"
                keyboardType="email-address"
                leftIcon={<IconEnvelope />}
                inputRef={fieldRefs.email}
                error={validationErrors.find(e => e.field === 'email')?.message ||
                  getEmailError(email)}
                onLayout={(e) => handleFieldLayout('email', e)}
              />

              {/* Password */}
              <InputField
                label="Password"
                value={password}
                onChangeText={(text) => {
                  clearFieldError('password');
                  setPassword(text);
                }}
                placeholder="Create a strong password"
                secureTextEntry={!showPassword}
                leftIcon={<IconKey />}
                inputRef={fieldRefs.password}
                error={validationErrors.find(e => e.field === 'password')?.message || getPasswordError(password)}
                onLayout={(e) => handleFieldLayout('password', e)}
                rightElement={
                  <EyeToggle visible={showPassword} onToggle={() => setShowPassword(!showPassword)} />
                }
              />

              {/* Password Requirements */}
              {password.length > 0 && (
                <View style={styles.passwordRequirementsContainer}>
                  {getPasswordRequirements(password).map((requirement, index) => (
                    <AppText key={index} style={[
                      styles.passwordRequirement,
                      requirement.met ? styles.passwordRequirementMet : styles.passwordRequirementUnmet
                    ]}>
                      {requirement.met ? "✓" : "•"} {requirement.text}
                    </AppText>
                  ))}
                </View>
              )}

              {/* Confirm Password */}
              <InputField
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={(text) => {
                  clearFieldError('confirmPassword');
                  setConfirmPassword(text);
                }}
                placeholder="Confirm your password"
                secureTextEntry={!showConfirmPwd}
                leftIcon={<IconLock />}
                inputRef={fieldRefs.confirmPassword}
                error={validationErrors.find(e => e.field === 'confirmPassword')?.message}
                onLayout={(e) => handleFieldLayout('confirmPassword', e)}
                rightElement={
                  <EyeToggle visible={showConfirmPwd} onToggle={() => setShowConfirmPwd(!showConfirmPwd)} />
                }
              />

              {/* Password match hint */}
              {(pwdMatch || pwdMismatch) && (
                <AppText
                  style={[
                    styles.matchHint,
                    pwdMatch ? styles.matchOk : styles.matchErr,
                  ]}
                >
                  {pwdMatch ? "✓ Passwords match" : "✗ Passwords do not match"}
                </AppText>
              )}

              {/* Terms & Conditions */}
              <TouchableOpacity
                style={styles.checkRow}
                onPress={() => setAgreed((v) => !v)}
                activeOpacity={0.85}
              >
                <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                  {agreed && <AppText style={styles.checkmark}>✓</AppText>}
                </View>
                <AppText style={styles.checkLabel}>
                  I agree to{" "}
                  <AppText
                    style={styles.link}
                    onPress={() =>
                      showMessage({
                        message: "Terms & Conditions",
                        type: "info",
                        icon: "info",
                        ...toastConfig,
                      })}
                  >
                    Terms and Conditions
                  </AppText>
                  {" & "}
                  <AppText
                    style={styles.link}
                    onPress={() =>
                      showMessage({
                        message: "Privacy Policy",
                        type: "info",
                        icon: "info",
                        ...toastConfig,
                      })}
                  >
                    Privacy Policy
                  </AppText>
                </AppText>
              </TouchableOpacity>

              {/* Sign Up Button */}
              <View style={styles.signUpBtnWrapper}>
                <PrimaryButton
                  title="Sign Up"
                  onPress={handleSignUp}
                  isLoading={isLoading}
                />
              </View>

              {/* Login link */}
              <View style={styles.loginRow}>
                <AppText style={styles.loginText}>Already have an account? </AppText>
                <TouchableOpacity
                  onPress={() => router.push("/(auth)/login")}
                >
                  <AppText style={styles.loginLink}>Log in</AppText>
                </TouchableOpacity>
              </View>

            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  keyboardAvoid: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    // Full-bleed: no centering wrapper, just screen-level horizontal padding
    paddingHorizontal: 24,
    paddingTop: 60,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    marginBottom: 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  logoImage: {
    width: 60,
    height: 60,
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontFamily: fontFamilies.bold,
    color: '#1C1711',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#000000',
    lineHeight: 22,
    textAlign: "center",
    alignSelf: "center"
  },

  // ── Form — flat, no card, no shadow ─────────────────────────────────────
  form: {
    width: "100%",
    // No backgroundColor, no borderRadius, no shadow/elevation
  },

  // ── Input Fields ────────────────────────────────────────────────────────
  fieldWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontFamily: fontFamilies.bold,
    color: TEXT_SEC,
    marginBottom: 8,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: INPUT_BG,
    borderRadius: 14,          // standard rounded rect, not pill
    borderWidth: 1.5,
    borderColor: PRIMARY_L,
    paddingHorizontal: 16,
    minHeight: 54,
    fontFamily: fontFamilies.bold,
  },
  inputRowDisabled: {
    opacity: 0.55,
  },
  inputRowFocused: {
    borderColor: "#1D324E",
    borderWidth: 2,
  },
  inputLeft: {
    marginRight: 10,
    opacity: 0.75,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: TEXT,
    paddingVertical: 12,
  },
  inputRight: {
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Send OTP / Verify pill ───────────────────────────────────────────────
  inlineBtn: {
    backgroundColor: PRIMARY_L,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  inlineBtnDisabled: {
    backgroundColor: "rgba(55, 97, 151, 0.3)",
    opacity: 0.7,
  },
  inlineBtnVerify: {
    backgroundColor: PRIMARY_L,
  },
  inlineBtnText: {
    color: "#FFF",
    fontSize: 12,
    fontFamily: fontFamilies.bold,
    letterSpacing: 0.3,
  },
  inlineBtnTextDisabled: {
    color: "rgba(255, 255, 255, 0.6)",
  },

  // ── OTP Confirmation Text ───────────────────────────────────────────────
  otpConfirmationContainer: {
    marginBottom: 8,
  },
  otpConfirmationText: {
    fontSize: 13,
    color: TEXT_SEC,
    lineHeight: 18,
  },
  timerText: {
    color: PRIMARY_L,
    fontFamily: fontFamilies.semiBold,
  },

  // ── Verified badge ───────────────────────────────────────────────────────
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(61,158,90,0.1)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  verifiedText: {
    fontSize: 12,
    fontFamily: fontFamilies.bold,
    color: SUCCESS,
  },

  // ── Eye toggle ───────────────────────────────────────────────────────────
  eyeBtn: {
    padding: 4,
  },

  // ── Password match hint ──────────────────────────────────────────────────
  matchHint: {
    fontSize: 12,
    fontFamily: fontFamilies.semiBold,
    marginTop: -6,
    marginBottom: 10,
    marginLeft: 4,
  },
  matchOk: { color: SUCCESS },
  matchErr: { color: ERROR },

  // ── Password Requirements ─────────────────────────────────────────────────
  passwordRequirementsContainer: {
    marginBottom: 8,
    paddingLeft: 4,
  },
  passwordRequirement: {
    fontSize: 12,
    marginBottom: 2,
    fontFamily: fontFamilies.bold,
  },
  passwordRequirementMet: {
    color: SUCCESS,
  },
  passwordRequirementUnmet: {
    color: ERROR,
  },

  // ── Terms ────────────────────────────────────────────────────────────────
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
    marginBottom: 24,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: PRIMARY_L,
    backgroundColor: INPUT_BG,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: PRIMARY_L,
    borderColor: PRIMARY_L,
  },
  checkmark: {
    color: "#FFF",
    fontSize: 13,
    fontFamily: fontFamilies.bold,
  },
  checkLabel: {
    flex: 1,
    fontSize: 13,
    color: TEXT_SEC,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 12,
    color: ERROR,
    marginTop: 4,
  },
  link: {
    color: "#376197",
    fontFamily: fontFamilies.bold,
    textDecorationLine: "underline",
  },

  // ── Sign Up button ───────────────────────────────────────────────────────
  signUpBtnWrapper: {
    marginBottom: 24,
  },
  primaryBtn: {
    backgroundColor: PRIMARY_L,
    borderRadius: 14,          // matches input field radius
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: PRIMARY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryBtnDisabled: {
    backgroundColor: PRIMARY_L,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnLoading: {
    backgroundColor: PRIMARY_L,
  },
  primaryBtnText: {
    color: "#FFF",
    fontSize: 17,
    fontFamily: fontFamilies.bold,
    letterSpacing: 0.5,
  },
  primaryBtnTextDisabled: {
    color: "#FFF",
  },

  // ── Login row ────────────────────────────────────────────────────────────
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    fontSize: 14,
    color: TEXT_SEC,
  },
  loginLink: {
    fontSize: 14,
    fontFamily: fontFamilies.bold,
    color: PRIMARY_L,
  },


  bottomSpacer: { height: 48 },
});

export default SellerSignUpScreen;
