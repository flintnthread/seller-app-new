import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/AppText";
import { fontFamilies } from "@/constants/fonts";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useResponsive } from "@/hooks/useResponsive";

const C = {
  navy: "#1E3A6E",
  navyDeep: "#152D5A",
  orange: "#F97316",
  orangeLight: "#FB923C",
};

const FloatingBubble: React.FC<{
  size: number;
  color: string;
  style: object;
  duration: number;
}> = ({ size, color, style, duration }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, duration]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -28],
  });
  const scale = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.08, 1],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.35, 0.65, 0.35],
  });

  return (
    <Animated.View
      style={[
        style,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    />
  );
};

const AnimatedFormBlock: React.FC<{
  index: number;
  enabled: boolean;
  children: React.ReactNode;
}> = ({ index, enabled, children }) => {
  const fade = useRef(new Animated.Value(enabled ? 0 : 1)).current;
  const slide = useRef(new Animated.Value(enabled ? 14 : 0)).current;

  useEffect(() => {
    if (!enabled) return;
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 480,
        delay: 280 + index * 55,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 480,
        delay: 280 + index * 55,
        useNativeDriver: true,
      }),
    ]).start();
  }, [enabled, fade, slide, index]);

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
      {children}
    </Animated.View>
  );
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
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

  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(isDesktop ? 20 : 0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const stepFade = useRef(new Animated.Value(1)).current;
  const stepSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isDesktop) return;
    Animated.parallel([
      Animated.timing(cardFade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(cardSlide, {
        toValue: 0,
        tension: 48,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();

    const logoPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.06,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    logoPulse.start();
    return () => logoPulse.stop();
  }, [isDesktop, cardFade, cardSlide, logoScale]);

  useEffect(() => {
    stepFade.setValue(0);
    stepSlide.setValue(isDesktop ? 12 : 8);
    Animated.parallel([
      Animated.timing(stepFade, {
        toValue: 1,
        duration: isDesktop ? 420 : 320,
        useNativeDriver: true,
      }),
      Animated.spring(stepSlide, {
        toValue: 0,
        tension: 52,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, [step, isDesktop, stepFade, stepSlide]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsTimerActive(false);
      setTimer(30);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, timer]);

  const handleSendOtp = () => {
    if (!contact) {
      setError("Please enter mobile number or email");
      return;
    }

    const contactVal = contact.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (emailRegex.test(contactVal)) {
      setError("");
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setStep(2);
      }, 1500);
      return;
    }

    let mobileVal = contactVal;
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

  const handleResendOtp = () => {
    if (!isTimerActive) {
      setError("");
      setLoading(true);

      setTimeout(() => {
        setLoading(false);
        setIsTimerActive(true);
        setTimer(30);
        setOtp1("");
        setOtp2("");
        setOtp3("");
        setOtp4("");
      }, 1000);
    }
  };

  const handleOtpChange = (value: string, field: number) => {
    const numValue = value.replace(/[^0-9]/g, "");

    switch (field) {
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

  const wrapBlock = (index: number, node: React.ReactNode) =>
    isDesktop ? (
      <AnimatedFormBlock index={index} enabled={isDesktop}>
        {node}
      </AnimatedFormBlock>
    ) : (
      node
    );

  const inputRowStyle = (
    focused: boolean,
    hasError?: boolean
  ) => [
    styles.inputContainer,
    isDark && styles.inputContainerDark,
    isDesktop && styles.inputContainerDesktop,
    focused && styles.inputContainerFocused,
    focused && isDesktop && styles.inputContainerFocusedDesktop,
    hasError && styles.inputContainerError,
  ];

  const otpInputStyle = (focused: boolean) => [
    styles.otpInput,
    isDark && styles.otpInputDark,
    isDesktop && styles.otpInputDesktop,
    focused && styles.otpInputFocused,
    focused && isDesktop && styles.otpInputFocusedDesktop,
  ];

  const renderActionButton = (label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        isDesktop ? styles.buttonPressDesktop : styles.button,
        pressed && styles.buttonPressed,
        loading && { opacity: 0.8 },
      ]}
    >
      {isDesktop ? (
        <LinearGradient
          colors={[C.orange, C.orangeLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.buttonDesktop}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <AppText style={styles.buttonText}>{label}</AppText>
          )}
        </LinearGradient>
      ) : loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <AppText style={styles.buttonText}>{label}</AppText>
      )}
    </Pressable>
  );

  const stepContent = (
    <Animated.View
      style={{
        opacity: stepFade,
        transform: [{ translateY: stepSlide }],
        width: "100%",
      }}
    >
      {step === 1 && (
        <>
          {wrapBlock(
            1,
            <>
              <AppText style={[styles.label, isDesktop && styles.labelDesktop]}>
                Mobile Number or Email
              </AppText>
              <View style={inputRowStyle(isContactFocused, !!error)}>
                <MaterialIcons
                  name="person"
                  size={isDesktop ? 20 : 24}
                  color={
                    error ? "#ef4444" : isContactFocused ? (isDesktop ? C.orange : C.navy) : "#64748b"
                  }
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
                  style={[styles.input, isDark && styles.inputDark]}
                />
              </View>
            </>
          )}
          {error ? <AppText style={styles.errorText}>{error}</AppText> : null}
          {wrapBlock(2, renderActionButton("Send OTP", handleSendOtp))}
        </>
      )}

      {step === 2 && (
        <>
          {wrapBlock(
            1,
            <>
              <AppText style={[styles.label, isDesktop && styles.labelDesktop]}>
                Enter OTP
              </AppText>
              <View style={[styles.otpContainer, isDesktop && styles.otpContainerDesktop]}>
                <TextInput
                  ref={otp1Ref}
                  style={otpInputStyle(isOtpFocused)}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={otp1}
                  onChangeText={(value) => handleOtpChange(value, 1)}
                  onFocus={() => setIsOtpFocused(true)}
                  onBlur={() => setIsOtpFocused(false)}
                />
                <TextInput
                  ref={otp2Ref}
                  style={otpInputStyle(isOtpFocused)}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={otp2}
                  onChangeText={(value) => handleOtpChange(value, 2)}
                  onFocus={() => setIsOtpFocused(true)}
                  onBlur={() => setIsOtpFocused(false)}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === "Backspace" && !otp2) {
                      setTimeout(() => otp1Ref.current?.focus(), 10);
                    }
                  }}
                />
                <TextInput
                  ref={otp3Ref}
                  style={otpInputStyle(isOtpFocused)}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={otp3}
                  onChangeText={(value) => handleOtpChange(value, 3)}
                  onFocus={() => setIsOtpFocused(true)}
                  onBlur={() => setIsOtpFocused(false)}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === "Backspace" && !otp3) {
                      setTimeout(() => otp2Ref.current?.focus(), 10);
                    }
                  }}
                />
                <TextInput
                  ref={otp4Ref}
                  style={otpInputStyle(isOtpFocused)}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={otp4}
                  onChangeText={(value) => handleOtpChange(value, 4)}
                  onFocus={() => setIsOtpFocused(true)}
                  onBlur={() => setIsOtpFocused(false)}
                  onKeyPress={({ nativeEvent }) => {
                    if (nativeEvent.key === "Backspace" && !otp4) {
                      setTimeout(() => otp3Ref.current?.focus(), 10);
                    }
                  }}
                />
              </View>
            </>
          )}
          {error ? <AppText style={styles.errorText}>{error}</AppText> : null}
          {wrapBlock(2, renderActionButton("Verify OTP", handleVerifyOtp))}
          {wrapBlock(
            3,
            <View style={styles.resendContainer}>
              <AppText style={styles.resendText}>Didn&apos;t receive OTP? </AppText>
              <Pressable
                onPress={handleResendOtp}
                disabled={isTimerActive}
                style={[styles.resendButton, isTimerActive && styles.resendButtonDisabled]}
              >
                <AppText
                  style={[
                    styles.resendButtonText,
                    isDesktop && styles.resendButtonTextDesktop,
                    isTimerActive && styles.resendButtonTextDisabled,
                  ]}
                >
                  {isTimerActive ? `Resend in ${timer}s` : "Resend OTP"}
                </AppText>
              </Pressable>
            </View>
          )}
        </>
      )}

      {step === 3 && (
        <>
          {wrapBlock(
            1,
            <>
              <AppText style={[styles.label, isDesktop && styles.labelDesktop]}>
                New Password
              </AppText>
              <View style={inputRowStyle(isNewPasswordFocused, !!error)}>
                <MaterialIcons
                  name="lock-outline"
                  size={isDesktop ? 20 : 24}
                  color={isNewPasswordFocused ? (isDesktop ? C.orange : C.navy) : "#64748b"}
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Enter new password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  onFocus={() => setIsNewPasswordFocused(true)}
                  onBlur={() => setIsNewPasswordFocused(false)}
                  style={[styles.input, isDark && styles.inputDark]}
                />
                <Pressable onPress={() => setShowPassword((s) => !s)} style={styles.eyeBtn}>
                  <MaterialIcons
                    name={showPassword ? "visibility" : "visibility-off"}
                    size={20}
                    color={isNewPasswordFocused ? (isDesktop ? C.orange : C.navy) : "#6b7280"}
                  />
                </Pressable>
              </View>
            </>
          )}
          {wrapBlock(
            2,
            <>
              <AppText style={[styles.label, isDesktop && styles.labelDesktop]}>
                Confirm Password
              </AppText>
              <View style={inputRowStyle(isConfirmPasswordFocused, !!error)}>
                <MaterialIcons
                  name="lock-outline"
                  size={isDesktop ? 20 : 24}
                  color={
                    isConfirmPasswordFocused ? (isDesktop ? C.orange : C.navy) : "#64748b"
                  }
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Confirm password"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setIsConfirmPasswordFocused(true)}
                  onBlur={() => setIsConfirmPasswordFocused(false)}
                  style={[styles.input, isDark && styles.inputDark]}
                />
              </View>
            </>
          )}
          {error ? <AppText style={styles.errorText}>{error}</AppText> : null}
          {wrapBlock(3, renderActionButton("Update Password", handleUpdatePassword))}
        </>
      )}
    </Animated.View>
  );

  const formBody = (
    <>
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        {isDesktop ? (
          <Animated.View style={{ transform: [{ scale: logoScale }] }}>
            <LinearGradient
              colors={[C.orange, C.navy]}
              style={styles.faviconContainerDesktop}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Image
                source={require("../../assets/images/fav.png")}
                style={styles.faviconDesktop}
                resizeMode="contain"
              />
            </LinearGradient>
          </Animated.View>
        ) : (
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
          </LinearGradient>
        )}

        <AppText style={[styles.title, isDesktop && styles.titleDesktop, isDark && styles.titleDark]}>
          Recover Password
        </AppText>
        <AppText style={[styles.subtitle, isDesktop && styles.subtitleDesktop]}>
          Recover your Seller Account securely
        </AppText>

        {isDesktop && (
          <View style={styles.stepDots}>
            {[1, 2, 3].map((n) => (
              <View
                key={n}
                style={[
                  styles.stepDot,
                  step >= n && styles.stepDotActive,
                  step === n && styles.stepDotCurrent,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      <View style={[styles.content, isDesktop && styles.contentDesktop]}>{stepContent}</View>

      {wrapBlock(
        4,
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons
            name="arrow-back-ios"
            size={16}
            color={isDesktop ? C.orange : "#1e293b"}
          />
          <AppText style={[styles.backText, isDesktop && styles.backTextDesktop]}>
            Back to Login
          </AppText>
        </Pressable>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      <StatusBar style={isDesktop ? "light" : "dark"} translucent backgroundColor="transparent" />

      {isDesktop ? (
        <LinearGradient
          colors={[C.navyDeep, "#1d3258", "#241566"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <Image
          source={require("../../assets/images/background.png")}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
      )}

      {isDesktop && (
        <View style={styles.bubblesLayer} pointerEvents="none">
          <FloatingBubble
            size={320}
            color="rgba(255,255,255,0.06)"
            duration={5200}
            style={styles.bubble1}
          />
          <FloatingBubble
            size={220}
            color="rgba(249,115,22,0.18)"
            duration={4400}
            style={styles.bubble2}
          />
          <FloatingBubble
            size={180}
            color="rgba(255,255,255,0.08)"
            duration={3800}
            style={styles.bubble3}
          />
          <FloatingBubble
            size={140}
            color="rgba(249,115,22,0.14)"
            duration={4600}
            style={styles.bubble4}
          />
          <FloatingBubble
            size={100}
            color="rgba(255,255,255,0.1)"
            duration={3400}
            style={styles.bubble5}
          />
        </View>
      )}

      <View
        style={[
          styles.safeArea,
          isDesktop && styles.safeAreaDesktop,
          !isDesktop && { paddingTop: insets.top },
        ]}
      >
        {isDesktop ? (
          <ScrollView
            style={styles.desktopScroll}
            contentContainerStyle={[
              styles.desktopScrollContent,
              {
                paddingTop: Math.max(insets.top, 24),
                paddingBottom: Math.max(insets.bottom, 32),
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <Animated.View
              style={[
                styles.cardDesktop,
                isDark && styles.cardDesktopDark,
                {
                  opacity: cardFade,
                  transform: [{ translateY: cardSlide }],
                },
              ]}
            >
              {formBody}
            </Animated.View>
          </ScrollView>
        ) : (
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.scrollContainer,
                { paddingBottom: Math.max(insets.bottom, 40) },
              ]}
            >
              {formBody}
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  safeArea: { flex: 1 },
  safeAreaDesktop: {
    flex: 1,
    overflow: "hidden",
  },
  desktopScroll: {
    flex: 1,
    width: "100%",
  },
  desktopScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    width: "100%",
    ...(Platform.OS === "web" ? ({ minHeight: "100%" } as object) : {}),
  },
  bubblesLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  bubble1: { position: "absolute", top: -80, right: -60 },
  bubble2: { position: "absolute", top: "18%", left: -50 },
  bubble3: { position: "absolute", bottom: "12%", right: "8%" },
  bubble4: { position: "absolute", bottom: "28%", left: "12%" },
  bubble5: { position: "absolute", top: "42%", right: "22%" },
  cardDesktop: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    borderRadius: 28,
    paddingHorizontal: 40,
    paddingTop: 36,
    paddingBottom: 32,
    backgroundColor: "#ffffff",
    flexShrink: 0,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.65)",
  },
  cardDesktopDark: { backgroundColor: "#0b1220" },
  scrollContainer: {
    paddingHorizontal: 26,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 8,
  },
  headerDesktop: {
    marginBottom: 20,
  },
  content: {
    width: "100%",
  },
  contentDesktop: {
    width: "100%",
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
  faviconContainerDesktop: {
    alignSelf: "center",
    marginTop: 0,
    marginBottom: 18,
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    padding: 3,
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  favicon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ffffff",
  },
  faviconDesktop: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 30,
    fontFamily: fontFamilies.bold,
    textAlign: "center",
    color: "#071330",
    marginBottom: 10,
  },
  titleDesktop: {
    fontSize: 30,
    color: C.navyDeep,
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    color: "#8a94a6",
    fontSize: 16,
    fontFamily: fontFamilies.semiBold,
    marginBottom: 32,
  },
  subtitleDesktop: {
    color: "#64748b",
    fontSize: 15,
    marginBottom: 20,
    maxWidth: 340,
  },
  stepDots: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e2e8f0",
  },
  stepDotActive: {
    backgroundColor: "rgba(249,115,22,0.35)",
  },
  stepDotCurrent: {
    width: 24,
    backgroundColor: C.orange,
  },
  label: {
    fontSize: 16,
    color: "#8a94a6",
    fontFamily: fontFamilies.bold,
    marginBottom: 12,
    marginLeft: 4,
  },
  labelDesktop: {
    fontSize: 14,
    color: "#64748b",
    fontFamily: fontFamilies.semiBold,
    marginBottom: 8,
    marginLeft: 0,
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
  inputContainerDesktop: {
    borderRadius: 14,
    minHeight: 52,
    marginBottom: 14,
  },
  inputContainerFocused: {
    borderColor: "#376197",
    borderWidth: 2,
  },
  inputContainerFocusedDesktop: {
    borderColor: C.orange,
    borderWidth: 2,
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  inputContainerError: {
    borderColor: "#ef4444",
    borderWidth: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
  },
  inputIcon: {
    marginRight: 12,
  },
  eyeBtn: {
    padding: 4,
  },
  inputContainerDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
  },
  inputDark: { color: "#f8fafc" },
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
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  buttonPressDesktop: {
    width: "100%",
    marginTop: 16,
  },
  buttonDesktop: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 17,
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
    marginTop: 32,
    gap: 4,
  },
  backText: {
    color: "#071330",
    fontSize: 15,
    fontFamily: fontFamilies.bold,
  },
  backTextDesktop: {
    color: C.orange,
  },
  otpContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  otpContainerDesktop: {
    gap: 12,
    justifyContent: "center",
    marginBottom: 14,
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
  otpInputDesktop: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  otpInputDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    color: "#f8fafc",
  },
  otpInputFocused: {
    borderColor: "#376197",
    borderWidth: 2,
  },
  otpInputFocusedDesktop: {
    borderColor: C.orange,
    borderWidth: 2,
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    flexWrap: "wrap",
  },
  resendText: {
    color: "#94a3b8",
    fontSize: 14,
  },
  resendButton: {
    marginLeft: 2,
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    color: "#376197",
    fontSize: 14,
    fontFamily: fontFamilies.semiBold,
  },
  resendButtonTextDesktop: {
    color: C.orange,
  },
  resendButtonTextDisabled: {
    color: "#94a3b8",
  },
});
