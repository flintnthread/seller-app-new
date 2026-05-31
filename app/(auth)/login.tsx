import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Keyboard,
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
import { useSweetAlert } from "@/components/common/SweetAlert";
import { useProfileStatus } from "@/hooks/useProfileStatus";
import { ApiError } from "@/lib/api/client";
import { setSellerSession } from "@/lib/api/sellerSession";
import { getPostLoginRoute } from "@/lib/auth/postLoginRoute";
import { loginSeller } from "@/services/authApi";

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
        Animated.timing(anim, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
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

export default function SellerLogin() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    fromSignup?: string;
    registered?: string;
    verified?: string;
    email?: string;
    message?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
  const { showSuccess, showError, showWarning, SweetAlertHost } = useSweetAlert();
  const { setIsProfileCompleted } = useProfileStatus();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [emailErrorMessage, setEmailErrorMessage] = useState("");
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isEmailFocused, setEmailFocused] = useState(false);
  const [isPasswordFocused, setPasswordFocused] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [bannerType, setBannerType] = useState<"info" | "success">("info");

  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(isDesktop ? 16 : 24)).current;

  useEffect(() => {
    if (typeof params.email === "string" && params.email.trim()) {
      setEmail(params.email.trim());
    }
  }, [params.email]);

  useEffect(() => {
    if (params.fromSignup === "1") {
      showSuccess("Please log in to continue with your seller profile.", "Account created");
    }
  }, [params.fromSignup, showSuccess]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );

    return () => {
      showSubscription?.remove();
      hideSubscription?.remove();
    };
  }, []);

  useEffect(() => {
    const emailParam =
      typeof params.email === "string" ? params.email.trim() : "";
    const infoMessage =
      typeof params.message === "string" ? params.message.trim() : "";

    if (params.verified === "1") {
      setBannerType("success");
      setBannerMessage(
        "Email verified successfully. You can log in to your seller account now."
      );
      if (emailParam) {
        setEmail(emailParam);
      }
      showSuccess("Email verified", "You can log in now.");
    } else if (params.registered === "1") {
      setBannerType("info");
      setBannerMessage(
        infoMessage ||
          (emailParam
            ? `Verification link sent to ${emailParam}. Verify your email, then log in.`
            : "Verification link sent to your email. Verify your email, then log in.")
      );
      if (emailParam) {
        setEmail(emailParam);
      }
      showSuccess(
        "Check your email",
        emailParam
          ? `We sent a verification link to ${emailParam}.`
          : "We sent a verification link to your email."
      );
    } else if (infoMessage) {
      setBannerType("info");
      setBannerMessage(infoMessage);
      if (emailParam) {
        setEmail(emailParam);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when opened from signup/verify-email
  }, []);

  useEffect(() => {
    if (isDesktop) {
      Animated.parallel([
        Animated.timing(cardFade, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.spring(cardSlide, {
          toValue: 0,
          tension: 50,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isDesktop, cardFade, cardSlide]);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const validateEmail = (emailVal: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(emailVal);
  };

  const validate = () => {
    setEmailError(false);
    setPasswordError(false);
    setPasswordErrors([]);

    let hasError = false;

    if (!email.trim()) {
      setEmailError(true);
      setEmailErrorMessage("email or mobile number is required");
      hasError = true;
    }

    if (!password.trim()) {
      setPasswordError(true);
      setPasswordErrors(["Password is required"]);
      hasError = true;
    }

    if (email.trim()) {
      const val = email.trim();
      const isEmailFormat = val.includes("@");

      if (isEmailFormat) {
        if (!validateEmail(val)) {
          setEmailError(true);
          setEmailErrorMessage("enter valid email address");
          hasError = true;
        }
      } else {
        let mobileVal = val;
        if (mobileVal.startsWith("+91 ")) {
          mobileVal = mobileVal.substring(4);
        } else if (mobileVal.startsWith("+91")) {
          mobileVal = mobileVal.substring(3);
        }

        const firstDigit = parseInt(mobileVal.charAt(0));
        const isValidStart = !isNaN(firstDigit) && firstDigit > 5;
        const isValidLength = mobileVal.length === 10;

        if (!isValidStart || !isValidLength) {
          setEmailError(true);
          setEmailErrorMessage("enter valid mobile number or email");
          hasError = true;
        }
      }
    }

    return !hasError;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await loginSeller(email.trim(), password);
      await setSellerSession(result.sellerId, result.accessToken, result.expiresIn);
      setIsProfileCompleted(result.profileCompleted);

      showSuccess(
        `Welcome back${result.firstName ? `, ${result.firstName}` : ""}!`,
        "Login successful"
      );

      router.replace(getPostLoginRoute(result));
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Login failed. Please try again.";
      if (e instanceof ApiError && e.status === 403) {
        showWarning(message, "Cannot log in");
      } else {
        showError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (emailError) {
      setEmailError(false);
      setEmailErrorMessage("");
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (passwordError) {
      setPasswordError(false);
      setPasswordErrors([]);
    }
  };

  const goToRegister = () => router.push("/(auth)/signup");

  const loginForm = (
    <>
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <LinearGradient
          colors={isDesktop ? [C.orange, C.navy] : ["#e96f43", "#376197"]}
          style={[styles.faviconContainer, isDesktop && styles.faviconContainerDesktop]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Image
            source={require("../../assets/images/fav.png")}
            style={styles.favicon}
            resizeMode="contain"
          />
        </LinearGradient>
        <AppText style={[styles.title, isDesktop && styles.titleDesktop]}>
          Seller Account
        </AppText>
        <AppText style={[styles.subtitle, isDesktop && styles.subtitleDesktop]}>
          Hello, Welcome back to your account!
        </AppText>
      </View>

      <View style={[styles.content, isDesktop && styles.contentDesktop]}>
        {bannerMessage ? (
          <View
            style={[
              styles.banner,
              bannerType === "success" ? styles.bannerSuccess : styles.bannerInfo,
            ]}
          >
            <AppText
              style={[
                styles.bannerText,
                bannerType === "success" ? styles.bannerTextSuccess : styles.bannerTextInfo,
              ]}
            >
              {bannerMessage}
            </AppText>
          </View>
        ) : null}

        <AppText style={styles.label}>Email or Mobile Number</AppText>
        <View
          style={[
            styles.pillInputRow,
            isDark && styles.pillInputRowDark,
            emailError && styles.pillInputRowError,
            isEmailFocused && styles.pillInputRowFocused,
            isDesktop && styles.pillInputRowDesktop,
            isEmailFocused && isDesktop && styles.pillInputRowFocusedDesktop,
          ]}
        >
          <MaterialIcons
            name="mail-outline"
            size={18}
            color={emailError ? "#ef4444" : isEmailFocused ? C.navy : "#64748b"}
            style={styles.inputIcon}
          />
          <TextInput
            value={email}
            onChangeText={handleEmailChange}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            placeholder="Enter email or mobile number"
            placeholderTextColor="#9ca3af"
            keyboardType="default"
            autoCapitalize="none"
            style={[
              styles.input,
              isDark && styles.inputDark,
              emailError && styles.inputError,
              isEmailFocused && styles.inputFocused,
            ]}
          />
        </View>

        {emailError && emailErrorMessage ? (
          <AppText style={styles.errorText}>• {emailErrorMessage}</AppText>
        ) : null}

        <AppText style={[styles.label, { marginTop: 12 }]}>Password</AppText>
        <View
          style={[
            styles.pillInputRow,
            isDark && styles.pillInputRowDark,
            passwordError && styles.pillInputRowError,
            isPasswordFocused && styles.pillInputRowFocused,
            isDesktop && styles.pillInputRowDesktop,
            isPasswordFocused && isDesktop && styles.pillInputRowFocusedDesktop,
          ]}
        >
          <MaterialIcons
            name="lock-outline"
            size={18}
            color={
              passwordError ? "#ef4444" : isPasswordFocused ? C.navy : "#64748b"
            }
            style={styles.inputIcon}
          />
          <TextInput
            value={password}
            onChangeText={handlePasswordChange}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            placeholder="Enter your password"
            placeholderTextColor="#9ca3af"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            style={[
              styles.input,
              isDark && styles.inputDark,
              passwordError && styles.inputError,
              isPasswordFocused && styles.inputFocused,
            ]}
          />
          <Pressable
            onPress={() => setShowPassword((s) => !s)}
            style={styles.eyeBtn}
          >
            <MaterialIcons
              name={showPassword ? "visibility" : "visibility-off"}
              size={20}
              color={
                passwordError
                  ? "#ef4444c7"
                  : isPasswordFocused
                    ? C.navy
                    : "#6b7280"
              }
            />
          </Pressable>
        </View>

        {passwordError && passwordErrors.length > 0 && (
          <View style={styles.errorContainer}>
            {passwordErrors.map((error, index) => (
              <AppText key={index} style={styles.errorText}>
                • {error}
              </AppText>
            ))}
          </View>
        )}

        <Pressable
          onPress={() => {
            const trimmed = email.trim();
            if (trimmed.includes("@")) {
              router.push({
                pathname: "/(auth)/forgotpassword",
                params: { email: trimmed },
              });
            } else {
              showWarning(
                "Password reset is available only for your registered email address. Enter your email on the login screen, or use the email you used during seller registration.",
                "Use registered email"
              );
            }
          }}
          style={styles.forgetWrap}
        >
          <AppText style={[styles.forget, isDesktop && styles.forgetDesktop]}>
            Forgot Password?
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => void handleLogin()}
          disabled={loading}
          style={({ pressed }) => [
            isDesktop ? styles.loginBtnPressDesktop : styles.loginBtn,
            pressed && styles.loginBtnPressed,
            loading && { opacity: 0.8 },
          ]}
        >
          {isDesktop ? (
            <LinearGradient
              colors={[C.orange, C.orangeLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginBtnDesktop}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <AppText style={styles.loginText}>Log In</AppText>
              )}
            </LinearGradient>
          ) : loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <AppText style={styles.loginText}>Log In</AppText>
          )}
        </Pressable>

        <AppText style={styles.footerText}>
          Don&apos;t Have An Account?{" "}
          <AppText style={[styles.signup, isDesktop && styles.signupDesktop]} onPress={goToRegister}>
            Sign Up
          </AppText>
        </AppText>
      </View>
    </>
  );

  return (
    <>
    <View style={styles.container}>
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

      <View style={[styles.safeArea, isDesktop && styles.safeAreaDesktop]}>
        {isDesktop ? (
          <ScrollView
            style={styles.desktopScroll}
            contentContainerStyle={[
              styles.desktopScrollContent,
              { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 32) },
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
              {loginForm}
            </Animated.View>
          </ScrollView>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.wrapper}
          >
            <Animated.View style={[styles.card, isDark && styles.cardDark]}>
              {loginForm}
            </Animated.View>
          </KeyboardAvoidingView>
        )}
      </View>
    </View>
    <SweetAlertHost />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  wrapper: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    justifyContent: "center",
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
  card: {
    borderRadius: 0,
    padding: 20,
    paddingBottom: 20,
    marginHorizontal: 0,
    height: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    justifyContent: "space-between",
  },
  cardDesktop: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    borderRadius: 28,
    paddingHorizontal: 40,
    paddingTop: 36,
    paddingBottom: 32,
    backgroundColor: "#ffffff",
    justifyContent: "flex-start",
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
  cardDark: { backgroundColor: "#0b1220" },
  header: { marginBottom: 12, alignItems: "center" },
  headerDesktop: { marginBottom: 28 },
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
    marginTop: 0,
    marginBottom: 18,
    width: 96,
    height: 96,
    borderRadius: 48,
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
  },
  loginBtnPressDesktop: {
    width: "100%",
    marginTop: 22,
  },
  title: {
    fontSize: 28,
    fontFamily: fontFamilies.bold,
    color: "#0f172a",
    marginBottom: 4,
    paddingBottom: 2,
    textAlign: "center",
  },
  titleDesktop: {
    fontSize: 30,
    color: C.navyDeep,
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 14,
    textAlign: "center",
    fontFamily: fontFamilies.semiBold,
  },
  subtitleDesktop: {
    color: "#64748b",
    fontSize: 15,
    maxWidth: 320,
  },
  content: { marginTop: 8, flex: 1 },
  contentDesktop: {
    marginTop: 0,
    flex: 0,
    width: "100%",
  },
  banner: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  bannerInfo: {
    backgroundColor: "rgba(55, 97, 151, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(55, 97, 151, 0.25)",
  },
  bannerSuccess: {
    backgroundColor: "rgba(61, 158, 90, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(61, 158, 90, 0.35)",
  },
  bannerText: {
    fontSize: 13,
    lineHeight: 20,
    fontFamily: fontFamilies.semiBold,
    textAlign: "center",
  },
  bannerTextInfo: {
    color: C.navy,
  },
  bannerTextSuccess: {
    color: "#3D9E5A",
  },
  label: {
    color: "#94a3b8",
    fontSize: 16,
    fontFamily: fontFamilies.semiBold,
    marginBottom: 8,
  },
  pillInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    minHeight: 52,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  pillInputRowDesktop: {
    borderRadius: 14,
    minHeight: 54,
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
  },
  pillInputRowError: {
    borderColor: "#ef4444",
    borderWidth: 2,
  },
  pillInputRowFocused: {
    borderColor: "#376197",
    borderWidth: 2,
  },
  pillInputRowFocusedDesktop: {
    borderColor: C.orange,
    backgroundColor: "#fff",
    shadowColor: C.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  pillInputRowDark: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
  },
  input: { flex: 1, fontSize: 13, color: "#000000", paddingVertical: 10 },
  inputDark: { color: "#000000" },
  inputError: { color: "#000000" },
  inputFocused: { color: "#000000" },
  eyeBtn: { padding: 8 },
  errorContainer: {
    marginTop: 4,
    paddingHorizontal: 5,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    fontWeight: "500",
  },
  forgetWrap: { alignItems: "flex-end", marginTop: 8 },
  forget: { color: "#376197d7", fontWeight: "600" },
  forgetDesktop: { color: C.navy, fontFamily: fontFamilies.semiBold },
  loginBtn: {
    marginTop: 18,
    backgroundColor: "#376197da",
    borderRadius: 36,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#376197",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  loginBtnDesktop: {
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    shadowColor: C.orange,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  loginBtnPressed: { transform: [{ scale: 0.995 }] },
  loginText: { color: "#fff", fontFamily: fontFamilies.bold, fontSize: 16 },
  footerText: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  signup: { color: "#f59e0b", fontWeight: "700" },
  signupDesktop: { color: C.orange },
});
