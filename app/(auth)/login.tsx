import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { AppText } from "@/components/AppText";
import { fontFamilies, fontSizes } from "@/constants/fonts";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function SellerLogin() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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

  const shouldHideFooter = isKeyboardVisible || isEmailFocused || isPasswordFocused;

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

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const validateEmail = (email: string) => {
    // Professional email validation regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    // Professional password validation
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];

    if (password.length < minLength) {
      errors.push(`at least ${minLength} characters`);
    }
    if (!hasUpperCase) {
      errors.push("one uppercase letter");
    }
    if (!hasLowerCase) {
      errors.push("one lowercase letter");
    }
    if (!hasNumbers) {
      errors.push("one number");
    }
    if (!hasSpecialChar) {
      errors.push("one special character (!@#$%^&*)");
    }

    return { isValid: errors.length === 0, errors };
  };

  const validate = () => {
    // Reset error states
    setEmailError(false);
    setPasswordError(false);
    setPasswordErrors([]);

    let hasError = false;

    // Check if fields are empty
    if (!email.trim()) {
      setEmailError(true);
      hasError = true;
    }

    if (!password.trim()) {
      setPasswordError(true);
      setPasswordErrors(["Password is required"]);
      hasError = true;
    }

    // Enhanced email/mobile validation (only if email is not empty)
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
        // Mobile validation
        let mobileVal = val;
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
          setEmailError(true);
          setEmailErrorMessage("enter valid mobile number or email");
          hasError = true;
        }
      }
    }

    // Enhanced password validation (only if password is not empty)
    if (password.trim()) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        setPasswordError(true);
        setPasswordErrors(passwordValidation.errors);
        hasError = true;
      }
    }

    return !hasError;
  };

  const handleLogin = () => {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.replace("/(main)/dashboard");
    }, 1200);
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

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/background.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.wrapper}
        >
          <View style={[styles.card, isDark && styles.cardDark]}>
            <View style={styles.header}>
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
              <AppText style={styles.title}>Seller Account</AppText>
              <AppText style={styles.subtitle}>
                Hello, Welcome back to your account!
              </AppText>
            </View>

            <View style={styles.content}>
              <AppText style={styles.label}>
                Email or Mobile Number
              </AppText>
              <View
                style={[
                  styles.pillInputRow,
                  isDark && styles.pillInputRowDark,
                  emailError && styles.pillInputRowError,
                  isEmailFocused && styles.pillInputRowFocused,
                ]}
              >
                <MaterialIcons
                  name="mail-outline"
                  size={18}
                  color="#64748b"
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

              <AppText style={[styles.label, { marginTop: 12 }]}>
                Password
              </AppText>
              <View
                style={[
                  styles.pillInputRow,
                  isDark && styles.pillInputRowDark,
                  passwordError && styles.pillInputRowError,
                  isPasswordFocused && styles.pillInputRowFocused,
                ]}
              >
                <MaterialIcons
                  name="lock-outline"
                  size={18}
                  color="#64748b"
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
                    color={passwordError ? "#ef4444c7" : (isPasswordFocused ? "#376197" : "#6b7280")}
                  />
                </Pressable>
              </View>

              {/* Password Error Messages */}
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
                onPress={() => router.push("/(auth)/forgotpassword")}
                style={styles.forgetWrap}
              >
                <AppText style={styles.forget}>Forget Password?</AppText>
              </Pressable>

              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={({ pressed }) => [
                  styles.loginBtn,
                  pressed && styles.loginBtnPressed,
                  loading && { opacity: 0.8 },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <AppText style={styles.loginText}>Log In</AppText>
                )}
              </Pressable>

              <AppText style={styles.footerText}>
                Don&apos;t Have An Account?{" "}
                
                <AppText style={styles.signup} onPress={goToRegister}>
                  Sign Up
                </AppText>
              </AppText>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
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
  backgroundGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0, // Extend beyond status bar to ensure full coverage
    bottom: 0,
  },
  root: { flex: 1 },
  safeArea: { flex: 1 },
  wrapper: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    justifyContent: "center",
  },
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
  cardDark: { backgroundColor: "#0b1220" },
  header: { marginBottom: 12, alignItems: "center" },
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
    borderRadius: 50, // Perfect circle: half of width/height
    backgroundColor: "#ffffff",
  },
  faviconOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50, // Match circle shape
    backgroundColor: "transparent", // Transparent to show favicon underneath
    // Left half orange, right half navy blue (vertical split)
    backgroundImage: "linear-gradient(90deg, #ff8c42 50%, #ff6b35 50%)",
  },
  title: {
    fontSize: 28,
    fontFamily: fontFamilies.bold,
    color: "#0f172a",
    marginBottom: 4,
    paddingBottom: 2,
    textAlign: "center",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 14,
    textAlign: "center",
    fontFamily: fontFamilies.semiBold,
  },
  content: { marginTop: 8, flex: 1 },
  label: { color: "#94a3b8", fontSize: 16, fontFamily: fontFamilies.semiBold, marginBottom: 8 },
  pillInput: {
    backgroundColor: "#fff",
    borderRadius: 28,
    minHeight: 52,
    paddingHorizontal: 18,
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
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
  pillInputRowError: {
    borderColor: "#ef4444",
    borderWidth: 2,
  },
  pillInputRowFocused: {
    borderColor: "#376197",
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: 12,
    color: "#64748b", // Default gray color
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
  loginBtnPressed: { transform: [{ scale: 0.995 }] },
  loginText: { color: "#fff", fontFamily: fontFamilies.bold, fontSize: 16 },
  footerText: { 
    color: "#94a3b8", 
    fontSize: 13, 
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8 
  },
  signup: { color: "#f59e0b", fontWeight: "700" },
});
