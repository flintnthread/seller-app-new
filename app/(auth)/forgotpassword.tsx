// app/forgot-password.tsx

import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { AppText } from "@/components/AppText";
import { fontFamilies, fontSizes } from "@/constants/fonts";
import { ThemedView } from "@/components/themed-view";

import { useColorScheme } from "@/hooks/use-color-scheme";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [step, setStep] = useState(1);

  const [contact, setContact] = useState("");
  const [otp1, setOtp1] = useState("");
  const [otp2, setOtp2] = useState("");
  const [otp3, setOtp3] = useState("");
  const [otp4, setOtp4] = useState("");
  const [timer, setTimer] = useState(30);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const otp1Ref = useRef<TextInput>(null);
  const otp2Ref = useRef<TextInput>(null);
  const otp3Ref = useRef<TextInput>(null);
  const otp4Ref = useRef<TextInput>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isContactFocused, setIsContactFocused] = useState(false);
  const [isOtpFocused, setIsOtpFocused] = useState(false);
  const [isNewPasswordFocused, setIsNewPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  // Timer effect
  useEffect(() => {
    let interval: any;
    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsTimerActive(false);
      setTimer(30);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timer]);

  // SEND OTP
  const handleSendOtp = () => {
    if (!contact) {
      setError("Please enter mobile number or email");
      return;
    }

    const contactVal = contact.trim();
    
    // Check if it's an email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (emailRegex.test(contactVal)) {
      // It's an email - valid format
      setError("");
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setStep(2);
      }, 1500);
      return;
    }

    // It's a mobile number - validate
    let mobileVal = contactVal;
    // Check for +91 or +91 prefix
    if (mobileVal.startsWith("+91 ")) {
      mobileVal = mobileVal.substring(4);
    } else if (mobileVal.startsWith("+91")) {
      mobileVal = mobileVal.substring(3);
    }

    const firstDigit = parseInt(mobileVal.charAt(0));
    const isValidStart = !isNaN(firstDigit) && firstDigit > 5;
    const isValidLength = mobileVal.length === 10;

    if (!isValidStart || !isValidLength) {
      setError("Enter valid mobile number or email ");
      return;
    }

    setError("");
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setStep(2);
      setIsTimerActive(true);
      setTimer(30);
    }, 1500);
  };

  // VERIFY OTP
  const handleVerifyOtp = () => {
    const combinedOtp = otp1 + otp2 + otp3 + otp4;
    
    if (!otp1 || !otp2 || !otp3 || !otp4) {
      setError("Please enter complete OTP");
      return;
    }

    if (combinedOtp.length < 4) {
      setError("Invalid OTP");
      return;
    }

    setError("");
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setStep(3);
    }, 1500);
  };

  // RESEND OTP
  const handleResendOtp = () => {
    if (!isTimerActive) {
      setError("");
      setLoading(true);
      
      setTimeout(() => {
        setLoading(false);
        setIsTimerActive(true);
        setTimer(30);
        // Clear OTP fields
        setOtp1("");
        setOtp2("");
        setOtp3("");
        setOtp4("");
      }, 1000);
    }
  };

  // Handle OTP input change and auto-focus
  const handleOtpChange = (value: string, field: number) => {
    const numValue = value.replace(/[^0-9]/g, '');
    
    switch(field) {
      case 1:
        setOtp1(numValue);
        if (numValue) setTimeout(() => otp2Ref.current?.focus(), 10);
        break;
      case 2:
        setOtp2(numValue);
        if (numValue) setTimeout(() => otp3Ref.current?.focus(), 10);
        else if (!value) setTimeout(() => otp1Ref.current?.focus(), 10);
        break;
      case 3:
        setOtp3(numValue);
        if (numValue) setTimeout(() => otp4Ref.current?.focus(), 10);
        else if (!value) setTimeout(() => otp2Ref.current?.focus(), 10);
        break;
      case 4:
        setOtp4(numValue);
        if (!value) setTimeout(() => otp3Ref.current?.focus(), 10);
        break;
    }
  };

  // UPDATE PASSWORD
  const handleUpdatePassword = () => {
    if (!newPassword || !confirmPassword) {
      setError("Please fill all fields");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      router.replace("/(auth)/login");
    }, 1500);
  };

  return (
    <ThemedView
      style={styles.root}
      lightColor="transparent"
      darkColor="transparent"
    >
      <StatusBar
        style="dark"
        backgroundColor="transparent"
        translucent={true}
      />
      <Image
        source={require("../../assets/images/background.png")}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={[isDark && styles.cardDark]}
            contentContainerStyle={styles.scrollContainer}
          >
            {/* LOGO */}
            <LinearGradient
              colors={["#e96f43", "#376197"]}
              style={styles.faviconContainer}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              <Image
                source={require("../../assets/images/fav.png")}
                style={styles.favicon}
                resizeMode="contain"
              />
              <View style={styles.faviconOverlay} />
            </LinearGradient>

            {/* TITLE */}
            <AppText style={[styles.title, isDark && styles.titleDark]}>Recover Password</AppText>

            <AppText style={styles.subtitle}>
              Recover your Seller Account securely
            </AppText>

            {/* STEP 1 */}
            {step === 1 && (
              <>
                <AppText style={styles.label}>Mobile Number or Email</AppText>

                <View style={[
                  styles.inputContainer, 
                  isDark && styles.inputContainerDark,
                  isContactFocused && styles.inputContainerFocused
                ]}>
                  <MaterialIcons
                    name="person"
                    size={24}
                    color="#6b7280"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Enter mobile number or email"
                    placeholderTextColor="#9ca3af"
                    keyboardType="default"
                    autoCapitalize="none"
                    value={contact}
                    onChangeText={setContact}
                    onFocus={() => setIsContactFocused(true)}
                    onBlur={() => setIsContactFocused(false)}
                    style={[
                      styles.input, 
                      isDark && styles.inputDark,
                      isContactFocused && styles.inputFocused
                    ]}
                  />
                </View>

                {error ? (
                  <AppText style={styles.errorText}>{error}</AppText>
                ) : null}

                <Pressable style={styles.button} onPress={handleSendOtp}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <AppText style={styles.buttonText}>Send OTP</AppText>
                  )}
                </Pressable>
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <AppText style={styles.label}>Enter OTP</AppText>

                <View style={styles.otpContainer}>
                  <TextInput
                    ref={otp1Ref}
                    style={[
                      styles.otpInput,
                      isDark && styles.inputDark,
                      isOtpFocused && styles.inputFocused
                    ]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={otp1}
                    onChangeText={(value) => handleOtpChange(value, 1)}
                    onFocus={() => setIsOtpFocused(true)}
                    onBlur={() => setIsOtpFocused(false)}
                  />
                  <TextInput
                    ref={otp2Ref}
                    style={[
                      styles.otpInput,
                      isDark && styles.inputDark,
                      isOtpFocused && styles.inputFocused
                    ]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={otp2}
                    onChangeText={(value) => handleOtpChange(value, 2)}
                    onFocus={() => setIsOtpFocused(true)}
                    onBlur={() => setIsOtpFocused(false)}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Backspace' && !otp2) {
                        setTimeout(() => otp1Ref.current?.focus(), 10);
                      }
                    }}
                  />
                  <TextInput
                    ref={otp3Ref}
                    style={[
                      styles.otpInput,
                      isDark && styles.inputDark,
                      isOtpFocused && styles.inputFocused
                    ]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={otp3}
                    onChangeText={(value) => handleOtpChange(value, 3)}
                    onFocus={() => setIsOtpFocused(true)}
                    onBlur={() => setIsOtpFocused(false)}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Backspace' && !otp3) {
                        setTimeout(() => otp2Ref.current?.focus(), 10);
                      }
                    }}
                  />
                  <TextInput
                    ref={otp4Ref}
                    style={[
                      styles.otpInput,
                      isDark && styles.inputDark,
                      isOtpFocused && styles.inputFocused
                    ]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={otp4}
                    onChangeText={(value) => handleOtpChange(value, 4)}
                    onFocus={() => setIsOtpFocused(true)}
                    onBlur={() => setIsOtpFocused(false)}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Backspace' && !otp4) {
                        setTimeout(() => otp3Ref.current?.focus(), 10);
                      }
                    }}
                  />
                </View>

                {error ? (
                  <AppText style={styles.errorText}>{error}</AppText>
                ) : null}

                <Pressable style={styles.button} onPress={handleVerifyOtp}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <AppText style={styles.buttonText}>
                      Verify OTP
                    </AppText>
                  )}
                </Pressable>

                <View style={styles.resendContainer}>
                  <AppText style={styles.resendText}>
                    Didn&apos;t receive OTP?{" "}
                  </AppText>
                  <Pressable 
                    onPress={handleResendOtp} 
                    disabled={isTimerActive}
                    style={[styles.resendButton, isTimerActive && styles.resendButtonDisabled]}
                  >
                    <AppText style={[
                      styles.resendButtonText,
                      isTimerActive && styles.resendButtonTextDisabled
                    ]}>
                      {isTimerActive ? `Resend in ${timer}s` : "Resend OTP"}
                    </AppText>
                  </Pressable>
                </View>
              </>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <>
                {/* NEW PASSWORD */}
                <AppText style={styles.label}>New Password</AppText>

                <View style={[
                  styles.inputContainer, 
                  isDark && styles.inputContainerDark,
                  isNewPasswordFocused && styles.inputContainerFocused
                ]}>
                  <TextInput
                    placeholder="Enter new password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    onFocus={() => setIsNewPasswordFocused(true)}
                    onBlur={() => setIsNewPasswordFocused(false)}
                    style={[
                      styles.input, 
                      isDark && styles.inputDark,
                      isNewPasswordFocused && styles.inputFocused
                    ]}
                  />
                </View>
                <AppText style={styles.label}>Confirm Password</AppText>
                <View style={[
                  styles.inputContainer, 
                  isDark && styles.inputContainerDark,
                  isConfirmPasswordFocused && styles.inputContainerFocused
                ]}>
                  <TextInput
                    placeholder="Confirm password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onFocus={() => setIsConfirmPasswordFocused(true)}
                    onBlur={() => setIsConfirmPasswordFocused(false)}
                    style={[
                      styles.input, 
                      isDark && styles.inputDark,
                      isConfirmPasswordFocused && styles.inputFocused
                    ]}
                  />
                </View>

                {error ? (
                  <AppText style={styles.errorText}>{error}</AppText>
                ) : null}

                <Pressable style={styles.button} onPress={handleUpdatePassword}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <AppText style={styles.buttonText}>
                      Update Password
                    </AppText>
                  )}
                </Pressable>
              </>
            )}

            {/* BACK */}
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <MaterialIcons name="arrow-back-ios" size={16} color="#1e293b" />

              <AppText style={styles.backText}>Back to Login</AppText>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#d9efff",
  },

  safeArea: {
    flex: 1,
  },

  scrollContainer: {
    paddingHorizontal: 26,
    paddingTop: 60,
    paddingBottom: 40,
  },

  faviconContainer: {
    alignSelf: "center",
    marginTop: 32,
    marginBottom: 12,
    width: 108,
    height: 108,
    borderRadius: 54,
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },

  favicon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ffffff",
  },

  faviconOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    backgroundColor: "transparent",
  },

  title: {
    fontSize: 30,
    fontFamily: fontFamilies.bold,
    textAlign: "center",
    color: "#071330",
    marginBottom: 10,
  },

  subtitle: {
    textAlign: "center",
    color: "#8a94a6",
    fontSize: 16,
    fontFamily: fontFamilies.semiBold,
    marginBottom: 40,
  },

  label: {
    fontSize: 16,
    color: "#8a94a6",
    fontFamily: fontFamilies.bold,
    marginBottom: 12,
    marginLeft: 4,
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 18,
    height: 50,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
  },
  inputIcon: {
    marginRight: 12,
  },
  inputFocused: {
    color: "#000000",
  },
  inputContainerFocused: {
    borderColor: "#376197",
    borderWidth: 2,
  },
  
  cardDark: { backgroundColor: "#0b1220" },
  inputContainerDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
  },
  inputDark: { color: "#000000" },
  titleDark: { color: "#f8fafc" },

  button: {
    backgroundColor: "#376197ed",
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,

    shadowColor: "#376197ed",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 4,
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 20,
    fontFamily: fontFamilies.bold,
  },

  errorText: {
    color: "#dc2626",
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 6,
  },

  backButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
  },

  backText: {
    color: "#071330",
    fontSize: 15,
    fontFamily: fontFamilies.bold,
  },

  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  otpInput: {
    width: 60,
    height: 60,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    fontSize: 24,
    fontFamily: fontFamilies.semiBold,
    textAlign: "center",
    color: "#000000",
    backgroundColor: "#ffffff",
  },

  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },

  resendText: {
    color: "#94a3b8",
    fontSize: 14,
  },

  resendButton: {
    marginLeft: 5,
  },

  resendButtonDisabled: {
    opacity: 0.5,
  },

  resendButtonText: {
    color: "#376197",
    fontSize: 14,
    fontFamily: fontFamilies.semiBold,
  },

  resendButtonTextDisabled: {
    color: "#94a3b8",
  },
});
